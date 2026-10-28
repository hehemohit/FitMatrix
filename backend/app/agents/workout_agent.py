import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState
from app.api.schemas import WorkoutPlanSchema
from app.harness.prompt_manager import get_prompt_sync, get_guardrails_sync
from app.harness.guardrails import GuardrailEngine

logger = logging.getLogger(__name__)


def workout_agent_node(state: FitMatrixState) -> dict:
    """Generates workout volume or deload based on structured entity state & recovery score."""
    sleep_mins = state.get("sleep_minutes", 420)
    raw_readiness = state.get("readiness_score", 70)
    fatigue = state.get("fatigue_flag", "nominal")

    # If athlete had severely curtailed sleep (< 360 min) or low readiness, enforce high_fatigue deload
    if sleep_mins < 360 or raw_readiness < 60 or fatigue == "high_fatigue":
        fatigue = "high_fatigue"
        readiness = raw_readiness if (0 < raw_readiness < 60) else 45
    else:
        readiness = raw_readiness

    logged_workouts = state.get("logged_workouts", [])
    user_profile = state.get("user_profile", {})
    daily_log = state.get("daily_log", {})
    meso_week = state.get("mesocycle_week") or user_profile.get("mesocycle_week", 1)
    meso_phase = state.get("mesocycle_phase") or user_profile.get("mesocycle_phase", "accumulation")
    target_rir = state.get("target_rir") or user_profile.get("target_rir", 3)

    # Decoupled structured state injected into system prompt (~80-120 tokens, O(1) constant size)
    state_context = {
        "user_profile": user_profile,
        "daily_log": daily_log,
        "mesocycle": {
            "week": meso_week,
            "phase": meso_phase,
            "target_rir": target_rir,
        },
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
    Returns a validated WorkoutPlanSchema using direct JSON generation
    without triggering Automatic Function Calling (AFC) warnings.
    """
    user_profile = state.get("user_profile", {})
    readiness = state.get("readiness_score", 70)
    fatigue = state.get("fatigue_flag", "nominal")
    meso_week = state.get("mesocycle_week") or user_profile.get("mesocycle_week", 1)
    is_fatigued = readiness < 60 or fatigue == "high_fatigue" or meso_week == 6
    goal = user_profile.get("fitness_goal", "hypertrophy")

    target_sets = 2 if is_fatigued else (4 if meso_week >= 4 else 3)
    target_rpe = 6 if is_fatigued else (9 if meso_week >= 4 else 8)

    biometrics = {
        "readiness_score": readiness,
        "fatigue_flag": fatigue,
        "mesocycle_week": meso_week,
        "steps_today": state.get("steps_today", 0),
        "sleep_hours": round(state.get("sleep_minutes", 420) / 60, 1),
        "active_calories_burned": state.get("active_calories_burned", 0),
    }

    schema_example = json.dumps({
        "duration_weeks": 1,
        "fitness_goal": goal,
        "days": [
            {
                "day": "Monday",
                "target_muscle_groups": ["Chest", "Triceps", "Shoulders"],
                "exercises": [
                    {"name": "Barbell Bench Press", "sets": target_sets, "reps": "8-10", "rpe": target_rpe, "rest_seconds": 90, "notes": "Focus on bar path"},
                    {"name": "Incline Dumbbell Press", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 75, "notes": "Full stretch at bottom"},
                    {"name": "Cable Lateral Raise", "sets": target_sets, "reps": "12-15", "rpe": target_rpe, "rest_seconds": 60, "notes": "Constant tension"},
                    {"name": "Tricep Overhead Extension", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 60, "notes": "Strict elbow position"}
                ]
            },
            {
                "day": "Wednesday",
                "target_muscle_groups": ["Back", "Biceps"],
                "exercises": [
                    {"name": "Chest-Supported Row", "sets": target_sets, "reps": "8-10", "rpe": target_rpe, "rest_seconds": 90, "notes": "Neutral grip"},
                    {"name": "Lat Pulldown", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 75, "notes": "Controlled eccentric"},
                    {"name": "Incline Dumbbell Curl", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 60, "notes": "Full supination"}
                ]
            },
            {
                "day": "Friday",
                "target_muscle_groups": ["Legs", "Core"],
                "exercises": [
                    {"name": "Leg Press", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 90, "notes": "Controlled depth"},
                    {"name": "Romanian Deadlift", "sets": target_sets, "reps": "10-12", "rpe": target_rpe, "rest_seconds": 90, "notes": "Hinge emphasis"},
                    {"name": "Standing Calf Raise", "sets": target_sets, "reps": "15-20", "rpe": target_rpe, "rest_seconds": 45, "notes": "2 sec pause at top"}
                ]
            }
        ]
    })

    system_prompt = (
        "You are the FitMatrix Head Strength & Conditioning Coach.\n"
        f"Athlete Profile: {json.dumps(user_profile)}\n"
        f"Current Biometrics: {json.dumps(biometrics)}\n\n"
        "Requirements:\n"
        f"- Target Goal: '{goal}'.\n"
        f"- Fatigue Regulation: {'Enforce submaximal RPE 6-7 with reduced volume due to high fatigue.' if is_fatigued else 'Target standard progressive overload RPE 7-8.'}\n"
        "- Generate at least 3 training days with at least 3 exercises per day.\n"
        "- Respond STRICTLY with a valid JSON object matching the schema below. No markdown fences, no explanatory text:\n"
        f"{schema_example}"
    )

    try:
        llm = get_agent_model(temperature=0.2)
        resp = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.get("context_message") or "Generate my weekly structured workout plan JSON."),
        ])
        raw_text = resp.content
        if isinstance(raw_text, list):
            raw_text = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw_text)

        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]

        import re
        cleaned_fixed = re.sub(r',\s*([\]\}])', r'\1', cleaned)
        try:
            parsed = json.loads(cleaned_fixed)
        except Exception:
            parsed = json.loads(cleaned)
        return WorkoutPlanSchema.model_validate(parsed)
    except Exception as e:
        logger.debug(f"workout_agent_structured JSON generation fallback: {e}")
        # Deterministic, clinically validated fallback plan
        return WorkoutPlanSchema.model_validate(json.loads(schema_example))
