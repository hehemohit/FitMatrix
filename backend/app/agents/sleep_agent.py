from app.graph.state import FitMatrixState
from app.tools.fitness_tools import evaluate_readiness

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