from typing import Literal
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage
from app.core.config import settings
from app.graph.state import FitMatrixState

class RouteDecision(BaseModel):
    next_agent: Literal["sleep_agent", "workout_agent", "diet_agent", "FINISH"]

llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0,
    api_key=settings.OPENAI_API_KEY
)

def supervisor_node(state: FitMatrixState) -> dict:
    """Inspects shared state and decides which specialist agent to invoke next."""
    system_prompt = (
        "You are the FitMatrix Master Orchestrator coordinating sub-agents.\n"
        "Routing Protocol:\n"
        "1. If 'readiness_score' is 0 or uncalculated: route to 'sleep_agent'.\n"
        "2. If workout is requested or not yet set: route to 'workout_agent'.\n"
        "3. If diet or meal advice is requested: route to 'diet_agent'.\n"
        "4. If all requested advice is satisfied: output 'FINISH'."
    )

    structured_llm = llm.with_structured_output(RouteDecision)
    decision = structured_llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])

    return {"next_step": decision.next_agent}