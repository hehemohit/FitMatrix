from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage, AIMessage
from app.core.config import settings
from app.graph.workflow import fitmatrix_graph

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
    sleep_minutes: int = 420  # Default 7 hours
    logged_workouts: Optional[List[dict]] = []
    history: Optional[List[ChatHistoryItem]] = []
    readiness_score: Optional[int] = None
    prescribed_workout: Optional[str] = None
    user_profile: Optional[dict] = {}
    daily_log: Optional[dict] = {}

@app.get("/health")
async def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

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
            "logged_workouts": payload.logged_workouts or [],
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": 2400,
            "remaining_protein_g": 160,
            "prescribed_workout": payload.prescribed_workout,
            "user_profile": payload.user_profile or {},
            "daily_log": payload.daily_log or {},
            "current_topic": None,
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)