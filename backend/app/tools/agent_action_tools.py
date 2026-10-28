"""
FitMatrix Executable Agent Action Engine (MCP-Style Tools)
---------------------------------------------------------
Enables the Coach Agent to execute concrete, state-mutating actions across both
the Nutrition and Workout universes. Transforms the agent from a passive chatbot
into an active copilot.
"""

import re
import json
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ActionDispatch(BaseModel):
    action_type: str = Field(..., description="LOG_MEAL | SCHEDULE_WORKOUT | START_WORKOUT | UPDATE_TARGETS")
    payload: Dict[str, Any] = Field(default_factory=dict)
    confirmation_message: str = Field(default="")


async def detect_and_build_actions(
    user_message: str,
    coach_reply: str,
    athlete_context: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Analyzes the user instruction and coach context to generate structured
    executable action dispatches that the mobile client can immediately execute.
    """
    msg_lower = user_message.lower().strip()
    actions: List[Dict[str, Any]] = []

    # ─────────────────────────────────────────────────────────────────────────────
    # Tool 1: LOG_MEAL
    # Trigger: "add/log [food] to my meal/breakfast/lunch/dinner/snack"
    # ─────────────────────────────────────────────────────────────────────────────
    meal_triggers = ["add", "log", "ate", "had", "record"]
    is_meal_intent = any(t in msg_lower for t in meal_triggers) and any(
        kw in msg_lower for kw in ["meal", "breakfast", "lunch", "dinner", "snack", "eat", "protein", "shake", "egg", "chicken", "paneer", "rice", "oats"]
    )
    # Avoid triggering meal log if the user explicitly says "workout" or "exercise"
    if is_meal_intent and not any(w in msg_lower for w in ["workout", "routine", "exercise", "sets"]):
        try:
            from app.core.llm import get_agent_model
            from langchain_core.messages import SystemMessage, HumanMessage

            meal_type = "snack"
            if "breakfast" in msg_lower:
                meal_type = "breakfast"
            elif "lunch" in msg_lower:
                meal_type = "lunch"
            elif "dinner" in msg_lower:
                meal_type = "dinner"

            parse_prompt = (
                "You are an MCP Action Tool. Parse the user's food log request into precise macros.\n"
                "Return ONLY a JSON object matching this schema:\n"
                "{\n"
                '  "name": "concise name of the food item",\n'
                '  "calories": 250,\n'
                '  "protein_g": 20,\n'
                '  "carbs_g": 30,\n'
                '  "fats_g": 8,\n'
                f'  "meal_type": "{meal_type}"\n'
                "}\n"
                "Do not include markdown fences or trailing commas."
            )
            llm = get_agent_model(temperature=0.0)
            res = llm.invoke([
                SystemMessage(content=parse_prompt),
                HumanMessage(content=user_message),
            ])
            cleaned = res.content if hasattr(res, "content") else str(res)
            if isinstance(cleaned, list):
                cleaned = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in cleaned)
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(cleaned)

            actions.append({
                "action_type": "LOG_MEAL",
                "payload": parsed,
                "confirmation_message": f"Logged {parsed.get('name', 'food')} ({parsed.get('calories', 0)} kcal, {parsed.get('protein_g', 0)}g protein) to {parsed.get('meal_type', 'meals')}."
            })
        except Exception as e:
            logger.debug(f"Action parse LOG_MEAL note: {e}")

    # ─────────────────────────────────────────────────────────────────────────────
    # Tool 2: SCHEDULE_WORKOUT
    # Trigger: "schedule [workout/routine]", "add workout for [day]", "create routine"
    # ─────────────────────────────────────────────────────────────────────────────
    schedule_triggers = ["schedule", "add workout", "create workout", "plan workout", "add routine", "give me a workout", "workout for today"]
    is_schedule_intent = any(t in msg_lower for t in schedule_triggers)

    if is_schedule_intent and not any(a["action_type"] == "LOG_MEAL" for a in actions):
        try:
            from app.core.llm import get_agent_model
            from langchain_core.messages import SystemMessage, HumanMessage

            schedule_prompt = (
                "You are an MCP Action Tool. Extract the workout routine from the conversation into an executable routine.\n"
                "Return ONLY a JSON object matching this schema:\n"
                "{\n"
                '  "routine_name": "e.g. Upper Body Hypertrophy",\n'
                '  "day_of_week": "Today",\n'
                '  "exercises": [\n'
                '    {"name": "Barbell Bench Press", "sets": 3, "reps": "8-10", "target_rir": 2, "target_muscle": "chest"},\n'
                '    {"name": "Barbell Bent Over Row", "sets": 3, "reps": "8-10", "target_rir": 2, "target_muscle": "back"},\n'
                '    {"name": "Overhead Press", "sets": 3, "reps": "10-12", "target_rir": 2, "target_muscle": "shoulders"}\n'
                '  ]\n'
                "}\n"
                "Generate at least 3-5 standard compound and isolation exercises. No markdown fences or comments."
            )
            llm = get_agent_model(temperature=0.1)
            res = llm.invoke([
                SystemMessage(content=schedule_prompt),
                HumanMessage(content=f"User Request: {user_message}\nCoach Output: {coach_reply}"),
            ])
            cleaned = res.content if hasattr(res, "content") else str(res)
            if isinstance(cleaned, list):
                cleaned = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in cleaned)
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(cleaned)

            actions.append({
                "action_type": "SCHEDULE_WORKOUT",
                "payload": parsed,
                "confirmation_message": f"Added {parsed.get('routine_name', 'Workout')} with {len(parsed.get('exercises', []))} exercises to your schedule."
            })
        except Exception as e:
            logger.debug(f"Action parse SCHEDULE_WORKOUT note: {e}")

    # ─────────────────────────────────────────────────────────────────────────────
    # Tool 3: START_WORKOUT
    # Trigger: "start workout", "start my session", "begin leg workout"
    # ─────────────────────────────────────────────────────────────────────────────
    if ("start" in msg_lower or "begin" in msg_lower) and any(w in msg_lower for w in ["workout", "session", "training"]):
        try:
            routine_name = "Quick Workout"
            if "chest" in msg_lower or "push" in msg_lower:
                routine_name = "Push Hypertrophy"
            elif "pull" in msg_lower or "back" in msg_lower:
                routine_name = "Pull Hypertrophy"
            elif "leg" in msg_lower:
                routine_name = "Leg Day"

            actions.append({
                "action_type": "START_WORKOUT",
                "payload": {
                    "workout_name": routine_name,
                },
                "confirmation_message": f"Starting {routine_name} session in active workout tracker."
            })
        except Exception as e:
            logger.debug(f"Action parse START_WORKOUT note: {e}")

    # ─────────────────────────────────────────────────────────────────────────────
    # Tool 4: UPDATE_METABOLIC_TARGETS
    # Trigger: "set my protein to 180g", "change my calories to 2400", "update goal to bulk"
    # ─────────────────────────────────────────────────────────────────────────────
    target_matches = {}
    prot_m = re.search(r"(?:protein|prot)\s*(?:to|target|is)?\s*(\d+)\s*g?", msg_lower)
    if prot_m:
        target_matches["target_protein_g"] = int(prot_m.group(1))

    cal_m = re.search(r"(?:calories|cals)\s*(?:to|target|is)?\s*(\d+)", msg_lower)
    if cal_m:
        target_matches["target_calories"] = int(cal_m.group(1))

    if target_matches:
        actions.append({
            "action_type": "UPDATE_TARGETS",
            "payload": target_matches,
            "confirmation_message": f"Updated targets: {', '.join(f'{k}: {v}' for k, v in target_matches.items())}."
        })

    return actions

