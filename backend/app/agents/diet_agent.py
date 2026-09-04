import json
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState


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
        },
    }

    system_prompt = (
        "You are the FitMatrix Lead Sports Nutritionist.\n"
        f"Active Athlete State:\n{json.dumps(state_context, indent=2)}\n\n"
        "Nutrition Rules:\n"
        "- Strictly enforce user_profile.dietary_preference (e.g. if 'pure_vegetarian', exclusively prescribe paneer, lentils/dal, Greek yogurt, tofu, soy, or vegetarian whey; NEVER prescribe meat, fish, poultry, or eggs unless permitted).\n"
        "- Strictly avoid any items in user_profile.allergies.\n"
        "- Provide direct meal and macro timing recommendations (timing of complex carbs and protein around training/recovery).\n"
        "- Keep response strictly under 3-4 crisp sentences."
    )

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
        response.content = content

    return {
        "messages": [response]
    }