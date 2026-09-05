from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage
from app.core.config import settings
from app.graph.workflow import fitmatrix_graph
from app.api.schemas import PlanRequest, WorkoutPlanSchema, DietPlanSchema, SleepGoalSchema
from app.agents.workout_agent import workout_agent_structured
from app.agents.diet_agent import diet_agent_structured
from app.agents.sleep_agent import sleep_agent_structured
from app.tools.fitness_tools import evaluate_readiness

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Multi-Agent Biometric and Training Engine for FitMatrix"
)

# Enable CORS for React Native mobile client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatHistoryItem(BaseModel):
    role: str  # 'user' | 'coach'
    text: str

class BiometricPayload(BaseModel):
    user_id: str
    message: str
    steps_today: int = 0
    sleep_minutes: int = 420       # Default 7 hours
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0
    logged_workouts: Optional[List[dict]] = []
    history: Optional[List[ChatHistoryItem]] = []
    readiness_score: Optional[int] = None
    prescribed_workout: Optional[str] = None
    user_profile: Optional[dict] = {}
    daily_log: Optional[dict] = {}

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

# ─── Readiness Computation Endpoint ──────────────────────────────────────────

class ReadinessRequest(BaseModel):
    steps_today: int = 0
    sleep_minutes: int = 420
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0

class ReadinessResponse(BaseModel):
    readiness_score: int
    fatigue_flag: str
    sleep_hours: float
    steps_today: int
    active_calories_burned: int
    resting_heart_rate_bpm: int

@app.post("/api/v1/readiness", response_model=ReadinessResponse)
async def compute_readiness_endpoint(payload: ReadinessRequest):
    recovery = evaluate_readiness.invoke({
        "sleep_minutes": payload.sleep_minutes,
        "steps": payload.steps_today,
        "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
        "active_calories_burned": payload.active_calories_burned,
    })
    return ReadinessResponse(
        readiness_score=recovery["readiness_score"],
        fatigue_flag=recovery["fatigue_flag"],
        sleep_hours=round(payload.sleep_minutes / 60.0, 1),
        steps_today=payload.steps_today,
        active_calories_burned=payload.active_calories_burned,
        resting_heart_rate_bpm=payload.resting_heart_rate_bpm,
    )

# ─── Conversational Chat Endpoint ─────────────────────────────────────────────

@app.post("/api/v1/chat")
async def chat_endpoint(payload: BiometricPayload):
    try:
        # Decouple State from Chat: Window raw conversation turns to strictly the last 2 items
        # Persistent facts (diet preferences, goals, logs) live in structured user_profile / daily_log
        messages = []
        if payload.history:
            for item in payload.history[-2:]:
                if item.role == "user":
                    messages.append(HumanMessage(content=item.text))
                elif item.role == "coach":
                    messages.append(AIMessage(content=item.text))

        messages.append(HumanMessage(content=payload.message))

        initial_state = {
            "messages": messages,
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "logged_workouts": payload.logged_workouts or [],
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": 2400,
            "remaining_protein_g": 160,
            "prescribed_workout": payload.prescribed_workout,
            "user_profile": payload.user_profile or {},
            "daily_log": payload.daily_log or {},
            "current_topic": None,
            "workout_plan": None,
            "diet_plan": None,
            "sleep_goal": None,
            "next_step": "supervisor"
        }

        # recursion_limit counts total node executions (not just LLM calls).
        # Full 3-agent path: supervisor→sleep→supervisor→workout→supervisor→diet→supervisor = 7 nodes.
        # Limit of 10 accommodates this while still preventing true infinite loops.
        final_state = fitmatrix_graph.invoke(
            initial_state,
            config={"recursion_limit": 10}
        )

        # Extract last conversational response
        last_message = final_state["messages"][-1].content if final_state.get("messages") else "Done"
        if isinstance(last_message, list):
            text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in last_message]
            last_message = "".join(text_parts)

        workout = final_state.get("prescribed_workout")
        if isinstance(workout, list):
            text_parts = [part.get("text", "") if isinstance(part, dict) else str(part) for part in workout]
            workout = "".join(text_parts)

        return {
            "status": "success",
            "readiness_score": final_state.get("readiness_score"),
            "fatigue_flag": final_state.get("fatigue_flag"),
            "prescribed_workout": workout,
            "reply": last_message,
            "user_profile": final_state.get("user_profile", {}),
            "daily_log": final_state.get("daily_log", {}),
            "current_topic": final_state.get("current_topic"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Structured Plan Endpoints ─────────────────────────────────────────────────

@app.post("/api/v1/plan/workout", response_model=WorkoutPlanSchema)
async def generate_workout_plan(payload: PlanRequest):
    """
    Generates a full structured WorkoutPlan artifact via the workout agent's
    structured output mode. Separate from /api/v1/chat — fire-once, returns
    a validated JSON plan that hydrates Plan Studio cards on the mobile client.
    """
    try:
        state = {
            "user_profile": payload.user_profile or {},
            "daily_log": payload.daily_log or {},
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": 2400,
            "remaining_protein_g": 160,
            "prescribed_workout": None,
            "context_message": payload.context_message,
        }
        plan = workout_agent_structured(state)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/plan/diet", response_model=DietPlanSchema)
async def generate_diet_plan(payload: PlanRequest):
    """
    Generates a full structured DietPlan artifact via the diet agent's
    structured output mode. Returns validated JSON for Plan Studio.
    """
    try:
        state = {
            "user_profile": payload.user_profile or {},
            "daily_log": payload.daily_log or {},
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": 2400,
            "remaining_protein_g": 160,
            "prescribed_workout": None,
            "context_message": payload.context_message,
        }
        plan = diet_agent_structured(state)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/plan/sleep", response_model=SleepGoalSchema)
async def generate_sleep_goal(payload: PlanRequest):
    """
    Generates a personalized SleepGoal artifact via the sleep architect's
    structured output mode. Combines deterministic readiness scoring
    with LLM-driven sleep window and wind-down prescription.
    """
    try:
        state = {
            "user_profile": payload.user_profile or {},
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "readiness_score": payload.readiness_score or 0,
            "context_message": payload.context_message,
        }
        goal = sleep_agent_structured(state)
        return goal
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)