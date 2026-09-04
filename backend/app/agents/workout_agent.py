from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from app.core.config import settings
from app.graph.state import FitMatrixState

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.2,
    api_key=settings.OPENAI_API_KEY
)

def workout_agent_node(state: FitMatrixState) -> dict:
    """Generates workout volume or deload based on recovery score and past exercises."""
    readiness = state.get("readiness_score", 70)
    fatigue = state.get("fatigue_flag", "nominal")
    logged_workouts = state.get("logged_workouts", [])

    system_prompt = (
        "You are the FitMatrix Head Strength & Conditioning Coach. "
        f"User Readiness Score: {readiness}/100 | Fatigue Status: {fatigue}. "
        f"Past Sessions Today: {logged_workouts}. "
        "Rules:\n"
        "- If fatigue is 'high_fatigue' or readiness < 60: strictly prescribe light technique drills, mobility, or active recovery.\n"
        "- If fatigue is 'nominal' and readiness >= 60: prescribe high-intensity compound lifts, heavy bag work, or conditioning.\n"
        "- Limit response to 2 crisp, actionable sentences."
    )

    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {
        "prescribed_workout": response.content,
        "messages": [response]
    }