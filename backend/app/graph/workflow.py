from langgraph.graph import StateGraph, START, END
from app.graph.state import FitMatrixState
from app.graph.supervisor import supervisor_node
from app.agents.sleep_agent import sleep_agent_node
from app.agents.workout_agent import workout_agent_node
from app.agents.diet_agent import diet_agent_node

# 1. Initialize StateGraph with our FitMatrixState schema
builder = StateGraph(FitMatrixState)

# 2. Register all nodes
builder.add_node("supervisor", supervisor_node)
builder.add_node("sleep_agent", sleep_agent_node)
builder.add_node("workout_agent", workout_agent_node)
builder.add_agent = builder.add_node("diet_agent", diet_agent_node)

# 3. Define Entrypoint -> Always starts at Supervisor
builder.add_edge(START, "supervisor")

# 4. Conditional edge from Supervisor based on 'next_step'
builder.add_conditional_edges(
    "supervisor",
    lambda state: state["next_step"],
    {
        "sleep_agent": "sleep_agent",
        "workout_agent": "workout_agent",
        "diet_agent": "diet_agent",
        "FINISH": END
    }
)

# 5. Cycles back to Supervisor after any sub-agent finishes its task
builder.add_edge("sleep_agent", "supervisor")
builder.add_edge("workout_agent", "supervisor")
builder.add_edge("diet_agent", "supervisor")

# 6. Compile executable graph
fitmatrix_graph = builder.compile()