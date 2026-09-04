import json
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState


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
        },
    }

    system_prompt = (
        "You are the FitMatrix Head Strength & Conditioning Coach.\n"
        f"Active Athlete State:\n{json.dumps(state_context, indent=2)}\n\n"
        "Prescription Rules:\n"
        "- Tailor the workout to the user's fitness goal if specified in user_profile (e.g. hypertrophy, strength, endurance).\n"
        "- If fatigue is 'high_fatigue' or readiness < 60: strictly prescribe light technique drills, mobility, or active recovery.\n"
        "- If fatigue is 'nominal' and readiness >= 60: prescribe high-intensity compound lifts, conditioning, or goal-specific volume.\n"
        "- Limit response to 2 crisp, actionable sentences."
    )

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

    return {
        "prescribed_workout": content,
        "messages": [response]
    }
