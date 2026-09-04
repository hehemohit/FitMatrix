from typing import Literal
from langchain_core.messages import HumanMessage, AIMessage
from app.graph.state import FitMatrixState
from app.graph.extractor import extract_and_update_state


def _get_latest_user_text(messages: list) -> str:
    """Extract the text of the most recent user turn."""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            content = m.content
            if isinstance(content, str):
                return content.lower()
            elif isinstance(content, list):
                return " ".join(p.get("text", "") for p in content if isinstance(p, dict)).lower()
    return ""


def supervisor_node(state: FitMatrixState) -> dict:
    """Inspects shared state, updates extracted entity profile, and decides next step."""
    readiness = state.get("readiness_score", 0)
    workout = state.get("prescribed_workout")
    messages = state.get("messages", [])

    # Always ensure biometric readiness score is available first
    if not readiness:
        return {"next_step": "sleep_agent"}

    # Extract durable entities (diet preferences, goals, logs) & determine topic
    latest_user_text = _get_latest_user_text(messages)
    profile, log, current_topic = extract_and_update_state(
        latest_user_text,
        state.get("user_profile", {}),
        state.get("daily_log", {}),
    )

    # Check if an agent already responded in the current execution turn
    last_is_ai = bool(messages and isinstance(messages[-1], AIMessage))

    next_step = "FINISH"

    # Case A: Pure diet intent (e.g. "iam pure veg", "what should I eat?", "high protein meals")
    if current_topic == "diet_planning":
        if not last_is_ai:
            next_step = "diet_agent"

    # Case B: Pure workout intent (e.g. "leg day routine", "what workout should I do?")
    elif current_topic == "workout_planning":
        if not last_is_ai:
            next_step = "workout_agent"

    # Case C: Combined intent (both workout + diet requested)
    elif current_topic == "combined":
        ai_messages = [m for m in messages if isinstance(m, AIMessage)]
        if not workout or len(ai_messages) == 0:
            next_step = "workout_agent"
        elif len(ai_messages) < 2:
            next_step = "diet_agent"

    # Case D: General / conversational message (e.g. "hello", "plan my day", or follow-up)
    else:
        if not workout or not last_is_ai:
            next_step = "workout_agent"

    return {
        "user_profile": profile,
        "daily_log": log,
        "current_topic": current_topic,
        "next_step": next_step,
    }

