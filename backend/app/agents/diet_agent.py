import json
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState
from app.api.schemas import DietPlanSchema
from app.harness.prompt_manager import get_prompt_sync, get_guardrails_sync
from app.harness.guardrails import GuardrailEngine


def diet_agent_node(state: FitMatrixState) -> dict:
    """Calculates macro timing and adjustments based on structured entity state & workout."""
    workout = state.get("prescribed_workout", "Rest/Active Recovery")
    cals = state.get("remaining_calories", 2400)
    protein = state.get("remaining_protein_g", 160)
    user_profile = state.get("user_profile", {})
    daily_log = state.get("daily_log", {})

    # Decoupled structured state injected into system prompt (~80-120 tokens, O(1) constant size)
    state_context = {
        "user_profile": user_profile,
        "daily_log": daily_log,
        "active_plan": {
            "today_workout": workout,
            "remaining_calories": cals,
            "remaining_protein_g": protein,
            "active_calories_burned": state.get("active_calories_burned", 0),
        },
    }

    prompt_template = get_prompt_sync("diet_agent")
    if "{state_context}" in prompt_template:
        system_prompt = prompt_template.format(state_context=json.dumps(state_context, indent=2))
    else:
        system_prompt = f"{prompt_template}\n\nActive Athlete State:\n{json.dumps(state_context, indent=2)}"

    # Decouple state from chat: use strictly the last 2 messages (recency window) to prevent O(N^2) token bloat
    raw_messages = list(state.get("messages", []))
    windowed_messages = raw_messages[-2:] if raw_messages else []

    # Guard against Gemini prefilling error: conversation must end on a user turn
    if windowed_messages and isinstance(windowed_messages[-1], AIMessage):
        windowed_messages.append(HumanMessage(content="What should I eat today?"))
    elif not windowed_messages:
        windowed_messages = [HumanMessage(content="What should I eat today?")]

    llm = get_agent_model(temperature=0.2)
    response = llm.invoke([SystemMessage(content=system_prompt)] + windowed_messages)

    # Normalize content: Gemini may return a list of content blocks instead of a plain string
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )

    # Runtime guardrail check: Dietary compliance and tone
    guardrails = get_guardrails_sync("diet_agent")
    guard_result = GuardrailEngine.post_execution_check(
        output_text=content,
        state=state,
        guardrail_config=guardrails,
        is_production=True
    )
    final_diet_text = guard_result.get("sanitized_output", content)
    response.content = final_diet_text

    return {
        "messages": [response]
    }


def diet_agent_structured(state: dict) -> DietPlanSchema:
    """
    Structured output mode — called from /api/v1/plan/diet.
    Returns a validated DietPlanSchema instead of conversational prose.
    """
    user_profile = state.get("user_profile", {})
    active_plan = {
        "prescribed_workout": state.get("prescribed_workout", "General Training"),
        "remaining_calories": state.get("remaining_calories", 2400),
        "remaining_protein_g": state.get("remaining_protein_g", 160),
        "active_calories_burned": state.get("active_calories_burned", 0),
    }
    dietary_pref = user_profile.get("dietary_preference", "omnivore")

    system_prompt = (
        "You are the FitMatrix Lead Sports Nutritionist. "
        "Generate a detailed daily meal plan as structured JSON.\n"
        f"Athlete Profile: {json.dumps(user_profile)}\n"
        f"Training Context: {json.dumps(active_plan)}\n\n"
        "Rules:\n"
        f"- Dietary preference is '{dietary_pref}' — strictly honour this in EVERY meal.\n"
        "- Strictly avoid items in user_profile.allergies.\n"
        "- Provide 4-6 meal windows covering pre-workout, post-workout, and main meals.\n"
        "- Calculate macros per meal to sum to the daily target.\n"
        "- Set hydration_liters based on activity level (min 2.5L, up to 4L for high activity)."
    )

    llm = get_agent_model(temperature=0.3)
    structured_llm = llm.with_structured_output(DietPlanSchema)
    return structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=state.get("context_message") or "Generate my daily meal plan."),
    ])