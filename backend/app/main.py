from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage
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

class BiometricPayload(BaseModel):
    user_id: str
    message: str
    steps_today: int = 0
    sleep_minutes: int = 420  # Default 7 hours
    logged_workouts: Optional[List[dict]] = []

@app.get("/health")
async def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

@app.post("/api/v1/chat")
async def chat_endpoint(payload: BiometricPayload):
    try:
        initial_state = {
            "messages": [HumanMessage(content=payload.message)],
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "logged_workouts": payload.logged_workouts or [],
            "readiness_score": 0,
            "fatigue_flag": None,
            "remaining_calories": 2400,
            "remaining_protein_g": 160,
            "prescribed_workout": None,
            "next_step": "supervisor"
        }

        # Run through the multi-agent graph
        final_state = fitmatrix_graph.invoke(initial_state)

        # Extract last conversational response
        last_message = final_state["messages"][-1].content if final_state.get("messages") else "Done"

        return {
            "status": "success",
            "readiness_score": final_state.get("readiness_score"),
            "fatigue_flag": final_state.get("fatigue_flag"),
            "prescribed_workout": final_state.get("prescribed_workout"),
            "reply": last_message
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)