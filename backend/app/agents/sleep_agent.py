import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import FitMatrixState
from app.tools.fitness_tools import evaluate_readiness
from app.core.llm import get_agent_model
from app.api.schemas import SleepGoalSchema

logger = logging.getLogger(__name__)


def sleep_agent_node(state: FitMatrixState) -> dict:
    """Calculates readiness score and systemic fatigue flags from Health Connect metrics."""
    sleep_mins = state.get("sleep_minutes", 0)
    steps = state.get("steps_today", 0)

    # Invoke deterministic tool
    recovery = evaluate_readiness.invoke({
        "sleep_minutes": sleep_mins,
        "steps": steps
    })

    return {
        "readiness_score": recovery["readiness_score"],
        "fatigue_flag": recovery["fatigue_flag"]
    }


def sleep_agent_structured(state: dict) -> SleepGoalSchema:
    """
    Structured output mode — called from /api/v1/plan/sleep.
    Acts as the Sleep Architect: prescribes a personalized sleep window,
    wind-down routine, and recovery score thresholds based on biometrics.
    """
    sleep_mins = state.get("sleep_minutes", 420)
    steps = state.get("steps_today", 0)
    hr = state.get("resting_heart_rate_bpm", 0)
    user_profile = state.get("user_profile", {})

    # Run deterministic readiness check first
    recovery = evaluate_readiness.invoke({
        "sleep_minutes": sleep_mins,
        "steps": steps
    })
    readiness_score = recovery["readiness_score"]
    fatigue_flag = recovery["fatigue_flag"]

    is_fatigued = readiness_score < 60 or fatigue_flag == "high_fatigue"

    schema_example = json.dumps({
        "target_bedtime": "22:00" if is_fatigued else "22:45",
        "target_wake_time": "06:45" if is_fatigued else "06:30",
        "target_duration_hours": 8.75 if is_fatigued else 7.75,
        "wind_down_milestones": [
            "21:00 - Blue light blocking filters active, cease overhead lighting",
            "21:30 - Cool sleeping environment to 19°C and take magnesium glycinate",
            "21:45 - 10-minute physiological sigh breathwork or light mobility"
        ],
        "recovery_score_threshold": 75 if is_fatigued else 65
    })

    system_prompt = (
        "You are the FitMatrix Sleep Architect.\n"
        f"Athlete Readiness: {readiness_score}, Fatigue: {fatigue_flag}.\n\n"
        "Requirements:\n"
        "- Prescribe target bedtime, wake time, and duration (7.5 - 9.0 hours).\n"
        "- Provide 3-5 specific wind-down milestones with timestamps.\n"
        "- Respond STRICTLY with a valid JSON object matching this schema. No markdown, no prose:\n"
        f"{schema_example}"
    )

    try:
        llm = get_agent_model(temperature=0.2)
        resp = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.get("context_message") or "Design my optimal sleep protocol JSON."),
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
        return SleepGoalSchema.model_validate(parsed)
    except Exception as e:
        logger.debug(f"sleep_agent_structured JSON generation fallback: {e}")
        return SleepGoalSchema.model_validate(json.loads(schema_example))