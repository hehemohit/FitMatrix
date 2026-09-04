from typing import Literal
from pydantic import BaseModel
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.graph.state import FitMatrixState
from app.core.llm import get_agent_model

# Diet/nutrition keyword triggers
_DIET_KEYWORDS = (
    "diet", "meal", "nutrition", "eat", "eating", "food", "protein", "calorie",
    "calories", "macro", "macros", "carb", "carbs", "fat", "fats", "supplement",
    "snack", "lunch", "dinner", "breakfast", "pre-workout", "post-workout",
    "fueling", "veg", "vegetarian", "vegan", "plant-based", "plant", "paneer",
    "tofu", "dairy", "meat", "chicken", "fish", "eggs", "keto", "fasting",
    "water", "hydration", "recipe", "cook",
)

_WORKOUT_KEYWORDS = (
    "workout", "exercise", "training", "lift", "lifting", "gym", "cardio",
    "run", "running", "sets", "reps", "routine", "split", "squat", "bench",
    "deadlift", "push", "pull", "legs", "drills", "conditioning", "strength",
    "deload", "stretch", "stretching", "mobility", "sore", "soreness",
)


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
    """Inspects shared state and decides which specialist to call or finishes."""
    readiness = state.get("readiness_score", 0)
    workout = state.get("prescribed_workout")
    messages = state.get("messages", [])

    # Always ensure biometric readiness score is available first
    if not readiness:
        return {"next_step": "sleep_agent"}

    latest_user_text = _get_latest_user_text(messages)
    has_diet = any(kw in latest_user_text for kw in _DIET_KEYWORDS)
    has_workout = any(kw in latest_user_text for kw in _WORKOUT_KEYWORDS)

    # Check if an agent already responded in the current execution turn
    # When a specialist agent (workout or diet) runs, it appends an AIMessage to messages.
    last_is_ai = bool(messages and isinstance(messages[-1], AIMessage))

    # Case A: Pure diet intent (e.g. "iam pure veg", "what should I eat?", "high protein meals")
    if has_diet and not has_workout:
        if not last_is_ai:
            return {"next_step": "diet_agent"}
        return {"next_step": "FINISH"}

    # Case B: Pure workout intent (e.g. "leg day routine", "what workout should I do?")
    if has_workout and not has_diet:
        if not last_is_ai:
            return {"next_step": "workout_agent"}
        return {"next_step": "FINISH"}

    # Case C: Combined intent (both workout + diet requested)
    if has_workout and has_diet:
        ai_messages = [m for m in messages if isinstance(m, AIMessage)]
        if not workout or len(ai_messages) == 0:
            return {"next_step": "workout_agent"}
        if len(ai_messages) < 2:
            return {"next_step": "diet_agent"}
        return {"next_step": "FINISH"}

    # Case D: General / conversational message (e.g. "hello", "plan my day", or follow-up)
    if not workout:
        return {"next_step": "workout_agent"}

    if not last_is_ai:
        return {"next_step": "workout_agent"}

    return {"next_step": "FINISH"}
