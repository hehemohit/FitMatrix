import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import FitMatrixState
from app.tools.fitness_tools import evaluate_readiness
from app.core.llm import get_agent_model
from app.api.schemas import SleepGoalSchema


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

    biometrics_summary = {
        "current_sleep_hours": round(sleep_mins / 60, 1),
        "steps_today": steps,
        "resting_heart_rate_bpm": hr,
        "computed_readiness_score": readiness_score,
        "fatigue_flag": fatigue_flag,
        "fitness_goal": user_profile.get("fitness_goal", "general_fitness"),
    }

    system_prompt = (
        "You are the FitMatrix Sleep Architect — an expert in sleep science and athletic recovery. "
        "Generate a personalized nightly sleep protocol as structured JSON.\n"
        f"Athlete Data: {json.dumps(biometrics_summary, indent=2)}\n\n"
        "Rules:\n"
        "- Prescribe a target bedtime and wake time that provide 7-9 hours of sleep.\n"
        "- Adjust recovery_score_threshold based on fatigue: 'high_fatigue' → threshold 75+, 'nominal' → 65+.\n"
        "- Provide 3-5 actionable wind_down_milestones (specific times + actions).\n"
        "- If resting HR > 70 bpm, flag elevated HR and prescribe earlier bedtime.\n"
        "- Format times as HH:MM (24-hour)."
    )

    llm = get_agent_model(temperature=0.3)
    structured_llm = llm.with_structured_output(SleepGoalSchema)
    return structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=state.get("context_message") or "Design my optimal sleep protocol."),
    ])