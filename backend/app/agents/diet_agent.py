from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState


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
        "Strictly adhere to and adapt for all dietary preferences, food choices, or restrictions mentioned by the user (e.g. pure vegetarian, vegan, Jain, keto, allergies). "
        "Keep it strictly under 3-4 sentences."
    )

    # Guard against Gemini prefilling error: conversation must end on a user turn
    messages = list(state["messages"])
    if messages and isinstance(messages[-1], AIMessage):
        messages.append(HumanMessage(content="What should I eat today?"))

    llm = get_agent_model(temperature=0.2)
    response = llm.invoke([SystemMessage(content=system_prompt)] + messages)

    # Normalize content: Gemini may return a list of content blocks instead of a plain string
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
        response.content = content

    return {
        "messages": [response]
    }