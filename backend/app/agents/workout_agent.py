from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState


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

    # Guard against Gemini prefilling error: conversation must end on a user turn
    messages = list(state["messages"])
    if messages and isinstance(messages[-1], AIMessage):
        messages.append(HumanMessage(content="What workout should I do today?"))

    llm = get_agent_model(temperature=0.2)
    response = llm.invoke([SystemMessage(content=system_prompt)] + messages)

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