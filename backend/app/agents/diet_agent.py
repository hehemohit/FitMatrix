from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from app.core.config import settings
from app.graph.state import FitMatrixState

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.2,
    api_key=settings.OPENAI_API_KEY
)

def diet_agent_node(state: FitMatrixState) -> dict:
    """Calculates macro timing and adjustments based on prescribed workout volume."""
    workout = state.get("prescribed_workout", "Rest/Active Recovery")
    cals = state.get("remaining_calories", 2400)
    protein = state.get("remaining_protein_g", 160)

    system_prompt = (
        "You are the FitMatrix Lead Sports Nutritionist. "
        f"Today's Planned Workout: '{workout}'. "
        f"Remaining Targets: {cals} kcal, {protein}g protein. "
        "Provide direct meal/fueling recommendations (timing of carbs and protein). "
        "Keep it strictly under 3 sentences."
    )

    response = llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
    return {
        "messages": [response]
    }