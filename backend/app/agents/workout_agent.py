import json
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState
from app.api.schemas import WorkoutPlanSchema
from app.harness.prompt_manager import get_prompt_sync, get_guardrails_sync
from app.harness.guardrails import GuardrailEngine


def workout_agent_node(state: FitMatrixState) -> dict:
    """Generates workout volume or deload based on structured entity state & recovery score."""
    readiness = state.get("readiness_score", 70)
    fatigue = state.get("fatigue_flag", "nominal")
    logged_workouts = state.get("logged_workouts", [])
    user_profile = state.get("user_profile", {})
    daily_log = state.get("daily_log", {})

    # Decoupled structured state injected into system prompt (~80-120 tokens, O(1) constant size)
    state_context = {
        "user_profile": user_profile,
        "daily_log": daily_log,
        "biometrics": {
            "readiness_score": readiness,
            "fatigue_flag": fatigue,
            "logged_workouts_today": logged_workouts,
            "steps_today": state.get("steps_today", 0),
            "sleep_hours": round(state.get("sleep_minutes", 420) / 60, 1),
            "active_calories_burned": state.get("active_calories_burned", 0),
            "resting_heart_rate_bpm": state.get("resting_heart_rate_bpm", 0),
        },
    }

    # Dynamic prompt from prompt registry
    prompt_template = get_prompt_sync("workout_agent")
    if "{state_context}" in prompt_template:
        system_prompt = prompt_template.format(state_context=json.dumps(state_context, indent=2))
    else:
        system_prompt = f"{prompt_template}\n\nActive Athlete State:\n{json.dumps(state_context, indent=2)}"

    # Decouple state from chat: use strictly the last 2 messages (recency window) to prevent O(N^2) token bloat
    raw_messages = list(state.get("messages", []))
    windowed_messages = raw_messages[-2:] if raw_messages else []

    # Guard against Gemini prefilling error: conversation must end on a user turn
    if windowed_messages and isinstance(windowed_messages[-1], AIMessage):
        windowed_messages.append(HumanMessage(content="What workout should I do today?"))
    elif not windowed_messages:
        windowed_messages = [HumanMessage(content="What workout should I do today?")]

    llm = get_agent_model(temperature=0.2)
    response = llm.invoke([SystemMessage(content=system_prompt)] + windowed_messages)

    # Normalize content: Gemini may return a list of content blocks instead of a plain string
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )

    # Runtime guardrail check: Auto-regulation enforcement in production
    guardrails = get_guardrails_sync("workout_agent")
    guard_result = GuardrailEngine.post_execution_check(
        output_text=content,
        state=state,
        guardrail_config=guardrails,
        is_production=True
    )
    final_workout_text = guard_result.get("sanitized_output", content)
    response.content = final_workout_text

    return {
        "prescribed_workout": final_workout_text,
        "messages": [response]
    }


def workout_agent_structured(state: dict) -> WorkoutPlanSchema:
    """
    Structured output mode — called from /api/v1/plan/workout.
    Returns a validated WorkoutPlanSchema instead of conversational prose.
    """
    user_profile = state.get("user_profile", {})
    biometrics = {
        "readiness_score": state.get("readiness_score", 70),
        "fatigue_flag": state.get("fatigue_flag", "nominal"),
        "steps_today": state.get("steps_today", 0),
        "sleep_hours": round(state.get("sleep_minutes", 420) / 60, 1),
        "active_calories_burned": state.get("active_calories_burned", 0),
    }

    system_prompt = (
        "You are the FitMatrix Head Strength & Conditioning Coach. "
        "Generate a detailed weekly workout plan as structured JSON.\n"
        f"Athlete Profile: {json.dumps(user_profile)}\n"
        f"Current Biometrics: {json.dumps(biometrics)}\n\n"
        "Rules:\n"
        "- Base fitness_goal on user_profile.fitness_goal (default: 'hypertrophy').\n"
        "- If readiness < 60 or fatigue is 'high_fatigue', prescribe auto-regulated submaximal sessions (RPE 6-7, reduced volume sets) or a strategic deload.\n"
        "- Include 4-6 days of training appropriate to the goal.\n"
        "- Provide realistic sets, reps, RPE, and rest intervals per exercise.\n"
        "- Respect dietary preference when noting pre/post-workout nutrition in notes."
    )

    llm = get_agent_model(temperature=0.3)
    structured_llm = llm.with_structured_output(WorkoutPlanSchema)
    return structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=state.get("context_message") or "Generate my weekly workout plan."),
    ])