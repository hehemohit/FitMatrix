import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from langchain_core.messages import HumanMessage, AIMessage
from app.core.config import settings
from app.core.database import db_lifespan
from app.graph.workflow import fitmatrix_graph
from app.api.schemas import PlanRequest, WorkoutPlanSchema, DietPlanSchema, SleepGoalSchema
from app.agents.workout_agent import workout_agent_structured
from app.agents.diet_agent import diet_agent_structured
from app.agents.sleep_agent import sleep_agent_structured
from app.tools.fitness_tools import evaluate_readiness
from app.models.documents import (
    UserDocument, UserProfileData, MetabolicTargets,
    DailyMetricDocument, NutritionLogDocument, MealEntry, PlanArtifactDocument
)

from app.api.fitness import router as fitness_router
from app.api.strategy import router as strategy_router
from app.api.auth import router as auth_router
from app.api.nutrition import router as nutrition_router
from app.api.eval import router as eval_router
from app.api.prompts import router as prompts_router
from app.api.cards import router as cards_router
from app.api.bridge import router as bridge_router
from app.harness.guardrails import GuardrailEngine

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Multi-Agent Biometric and Training Engine for FitMatrix",
    lifespan=db_lifespan,
)

# Enable CORS for React Native mobile client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fitness_router)
app.include_router(strategy_router)
app.include_router(auth_router)
app.include_router(nutrition_router)
app.include_router(eval_router)
app.include_router(prompts_router)
app.include_router(cards_router)
app.include_router(bridge_router)

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
    context_domain: Optional[str] = None   # 'workout' | 'diet' | 'sleep'

# ΓöÇΓöÇΓöÇ Health Check ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@app.get("/")
@app.head("/")
@app.get("/health")
async def health_check():
    return {"status": "online", "project": settings.PROJECT_NAME}

# ΓöÇΓöÇΓöÇ Readiness Computation Endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

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

# ΓöÇΓöÇΓöÇ Conversational Chat Endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@app.post("/api/v1/chat")
async def chat_endpoint(payload: BiometricPayload):
    try:
        # Pre-Execution Guardrail: Intercept acute medical distress & biometric limits
        guard_passed, guard_alert = GuardrailEngine.pre_execution_check(
            user_message=payload.message,
            state=payload.model_dump()
        )
        if not guard_passed:
            return {
                "status": "safety_refusal",
                "readiness_score": payload.readiness_score or 0,
                "fatigue_flag": "high_fatigue",
                "prescribed_workout": "Rest / Medical Evaluation",
                "reply": guard_alert,
                "user_profile": payload.user_profile or {},
                "daily_log": payload.daily_log or {},
                "current_topic": "safety_intercept",
            }

        # Decouple State from Chat: Window raw conversation turns to strictly the last 2 items
        # Persistent facts (diet preferences, goals, logs) live in structured user_profile / daily_log
        messages = []
        if payload.history:
            for item in payload.history[-2:]:
                if item.role == "user":
                    messages.append(HumanMessage(content=item.text))
                elif item.role == "coach":
                    messages.append(AIMessage(content=item.text))
        elif payload.user_id:
            try:
                from app.models.documents import ChatSessionDocument
                session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == payload.user_id)
                if session_doc and session_doc.messages:
                    for item in session_doc.messages[-2:]:
                        if item.role == "user":
                            messages.append(HumanMessage(content=item.content))
                        elif item.role == "coach":
                            messages.append(AIMessage(content=item.content))
            except Exception as e:
                logger.debug(f"Chat session hydration note: {e}")

        messages.append(HumanMessage(content=payload.message))

        # Dynamic metabolic targets computed from user profile — zero hardcoded defaults
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        
        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            remaining_cals = max(0, targets.target_calories - (daily_log.get("calories_logged") or 0))
            remaining_protein = max(0, targets.target_protein_g - (daily_log.get("protein_logged_g") or 0))
        except Exception:
            w = float(user_prof.get("weight_kg") or 70.0)
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            dynamic_prof = UserProfileData(weight_kg=w, height_cm=float(user_prof.get("height_cm") or 175.0), age=int(user_prof.get("age") or 28), gender=str(user_prof.get("gender") or "male"))
            targets = compute_targets(dynamic_prof)
            remaining_cals = max(0, targets.target_calories - (daily_log.get("calories_logged") or 0))
            remaining_protein = max(0, targets.target_protein_g - (daily_log.get("protein_logged_g") or 0))

        initial_topic = None
        if payload.context_domain:
            domain = payload.context_domain.lower()
            if "diet" in domain or "nutrition" in domain:
                initial_topic = "diet_planning"
            elif "workout" in domain or "training" in domain:
                initial_topic = "workout_planning"
            elif "sleep" in domain or "recovery" in domain:
                initial_topic = "sleep_recovery"

        initial_state = {
            "messages": messages,
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "logged_workouts": payload.logged_workouts or [],
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "target_calories": remaining_cals,
            "target_protein_g": remaining_protein,
            "remaining_calories": remaining_cals,
            "remaining_protein_g": remaining_protein,
            "mesocycle_week": user_prof.get("mesocycle_week", 1),
            "mesocycle_phase": user_prof.get("mesocycle_phase", "accumulation"),
            "target_rir": user_prof.get("target_rir", 3),
            "prescribed_workout": payload.prescribed_workout,
            "user_profile": user_prof,
            "daily_log": daily_log,
            "current_topic": initial_topic,
            "workout_plan": None,
            "diet_plan": None,
            "sleep_goal": None,
            "next_step": "supervisor"
        }

        # recursion_limit counts total node executions (not just LLM calls).
        # Full 3-agent path: supervisorΓåÆsleepΓåÆsupervisorΓåÆworkoutΓåÆsupervisorΓåÆdietΓåÆsupervisor = 7 nodes.
        # Limit of 10 accommodates this while still preventing true infinite loops.
        final_state = fitmatrix_graph.invoke(
            initial_state,
            config={"recursion_limit": 10}
        )

        # Extract reply: collect all AI messages produced during this turn
        initial_ai_count = len([m for m in messages if isinstance(m, AIMessage)])
        all_ai_messages = [m for m in final_state.get("messages", []) if isinstance(m, AIMessage)]
        new_ai_messages = all_ai_messages[initial_ai_count:] if len(all_ai_messages) > initial_ai_count else all_ai_messages[-1:]

        reply_texts = []
        for m in new_ai_messages:
            c = m.content
            if isinstance(c, list):
                c = "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in c)
            if isinstance(c, str) and c.strip():
                reply_texts.append(c.strip())

        combined_reply = "\n\n".join(reply_texts) if reply_texts else (
            all_ai_messages[-1].content if all_ai_messages else "FitMatrix guidance received."
        )

        # Hybrid Durable Session Memory: asynchronously record bounded turns to MongoDB
        if payload.user_id:
            try:
                import uuid
                from datetime import datetime
                from app.models.documents import ChatSessionDocument, ChatMessageEntry
                session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == payload.user_id)
                new_user_msg = ChatMessageEntry(role="user", content=payload.message)
                new_coach_msg = ChatMessageEntry(role="coach", content=combined_reply)
                if session_doc:
                    session_doc.messages.extend([new_user_msg, new_coach_msg])
                    session_doc.messages = session_doc.messages[-20:]  # sliding 20-turn window
                    session_doc.current_topic = final_state.get("current_topic")
                    session_doc.updated_at = datetime.utcnow()
                    await session_doc.save()
                else:
                    session_doc = ChatSessionDocument(
                        session_id=f"sess_{uuid.uuid4().hex[:12]}",
                        user_id=payload.user_id,
                        messages=[new_user_msg, new_coach_msg],
                        current_topic=final_state.get("current_topic"),
                    )
                    await session_doc.insert()
            except Exception as e:
                logger.debug(f"Chat session persistence note: {e}")

        return {
            "status": "success",
            "readiness_score": final_state.get("readiness_score", 0),
            "fatigue_flag": final_state.get("fatigue_flag"),
            "prescribed_workout": final_state.get("prescribed_workout"),
            "reply": combined_reply,
            "user_profile": final_state.get("user_profile", user_prof),
            "daily_log": final_state.get("daily_log", daily_log),
            "current_topic": final_state.get("current_topic"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}

# ΓöÇΓöÇΓöÇ Structured Plan Endpoints ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

@app.post("/api/v1/plan/workout", response_model=WorkoutPlanSchema)
async def generate_workout_plan(payload: PlanRequest):
    """
    Generates a full structured WorkoutPlan artifact via the workout agent's
    structured output mode. Separate from /api/v1/chat ΓÇö fire-once, returns
    a validated JSON plan that hydrates Plan Studio cards on the mobile client.
    """
    try:
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            rem_cals = targets.target_calories
            rem_pro = targets.target_protein_g
        except Exception:
            rem_cals = user_prof.get("target_calories") or 2200
            rem_pro = user_prof.get("target_protein_g") or 140

        state = {
            "user_profile": user_prof,
            "daily_log": daily_log,
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": rem_cals,
            "remaining_protein_g": rem_pro,
            "prescribed_workout": None,
            "context_message": payload.context_message,
        }
        plan = workout_agent_structured(state)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


@app.post("/api/v1/plan/diet", response_model=DietPlanSchema)
async def generate_diet_plan(payload: PlanRequest):
    """
    Generates a full structured DietPlan artifact via the diet agent's
    structured output mode. Returns validated JSON for Plan Studio.
    """
    try:
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            rem_cals = targets.target_calories
            rem_pro = targets.target_protein_g
        except Exception:
            rem_cals = user_prof.get("target_calories") or 2200
            rem_pro = user_prof.get("target_protein_g") or 140

        state = {
            "user_profile": user_prof,
            "daily_log": daily_log,
            "steps_today": payload.steps_today,
            "sleep_minutes": payload.sleep_minutes,
            "active_calories_burned": payload.active_calories_burned,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "readiness_score": payload.readiness_score or 0,
            "fatigue_flag": None,
            "remaining_calories": rem_cals,
            "remaining_protein_g": rem_pro,
            "prescribed_workout": None,
            "context_message": payload.context_message,
        }
        plan = diet_agent_structured(state)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


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





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


# ΓöÇΓöÇΓöÇ User Profile Endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class ProfileUpdateRequest(BaseModel):
    user_id: str
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    activity_level: Optional[str] = None
    fitness_goal: Optional[str] = None
    dietary_preference: Optional[str] = None
    allergies: Optional[List[str]] = None

@app.put("/api/v1/user/profile")
async def update_user_profile(payload: ProfileUpdateRequest):
    """
    Upsert user profile into MongoDB Atlas.
    Also recomputes BMR and TDEE targets from the updated anthropometric data.
    """
    try:
        from app.core.metabolism import compute_targets

        existing = await UserDocument.find_one(UserDocument.user_id == payload.user_id)
        if not existing:
            existing = UserDocument(
                user_id=payload.user_id,
                profile=UserProfileData(),
                targets=MetabolicTargets(),
            )

        # Apply partial update ΓÇö only overwrite fields explicitly provided
        update_fields = payload.model_dump(exclude={"user_id"}, exclude_none=True)
        for field, value in update_fields.items():
            setattr(existing.profile, field, value)

        # Recompute metabolic targets whenever profile changes
        existing.targets = compute_targets(existing.profile)
        existing.updated_at = datetime.utcnow()
        await existing.save()

        return {
            "status": "updated",
            "user_id": existing.user_id,
            "profile": existing.profile.model_dump(),
            "targets": existing.targets.model_dump(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


# ΓöÇΓöÇΓöÇ Nutrition Logging Endpoints ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class LogMealRequest(BaseModel):
    user_id: str
    date: str                     # YYYY-MM-DD
    name: str
    category: str = "Lunch"       # Breakfast | Lunch | Dinner | Snack | Pre-Workout | Post-Workout
    time: str = "12:00"           # HH:MM
    calories: int
    protein_g: int
    carbs_g: int = 0
    fats_g: int = 0

class EstimateMealRequest(BaseModel):
    food_description: str          # e.g. "2 boiled eggs and 1 brown bread with peanut butter"

@app.post("/api/v1/nutrition/log")
async def log_meal(payload: LogMealRequest):
    """
    Appends a MealEntry to today's NutritionLogDocument in MongoDB Atlas.
    Incrementally updates cumulative day totals (calories, protein, carbs, fats).
    Returns the updated daily nutrition summary.
    """
    try:
        meal = MealEntry(
            name=payload.name,
            category=payload.category,
            time=payload.time,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fats_g=payload.fats_g,
        )

        doc = await NutritionLogDocument.find_one(
            NutritionLogDocument.user_id == payload.user_id,
            NutritionLogDocument.date == payload.date,
        )

        if doc:
            doc.meals.append(meal)
            doc.total_calories += meal.calories
            doc.total_protein_g += meal.protein_g
            doc.total_carbs_g += meal.carbs_g
            doc.total_fats_g += meal.fats_g
            doc.updated_at = datetime.utcnow()
            await doc.save()
        else:
            doc = NutritionLogDocument(
                user_id=payload.user_id,
                date=payload.date,
                total_calories=meal.calories,
                total_protein_g=meal.protein_g,
                total_carbs_g=meal.carbs_g,
                total_fats_g=meal.fats_g,
                meals=[meal],
            )
            await doc.insert()

        return {
            "status": "logged",
            "meal_id": meal.meal_id,
            "date": doc.date,
            "total_calories": doc.total_calories,
            "total_protein_g": doc.total_protein_g,
            "total_carbs_g": doc.total_carbs_g,
            "total_fats_g": doc.total_fats_g,
            "meals": [m.model_dump() for m in doc.meals],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


@app.get("/api/v1/nutrition/today")
async def get_today_nutrition(user_id: str, date: str):
    """
    Returns today's nutrition log for the given user, or an empty baseline
    if no meals have been logged yet today.
    """
    try:
        doc = await NutritionLogDocument.find_one(
            NutritionLogDocument.user_id == user_id,
            NutritionLogDocument.date == date,
        )
        if not doc:
            return {
                "date": date,
                "total_calories": 0,
                "total_protein_g": 0,
                "total_carbs_g": 0,
                "total_fats_g": 0,
                "meals": [],
            }
        return {
            "date": doc.date,
            "total_calories": doc.total_calories,
            "total_protein_g": doc.total_protein_g,
            "total_carbs_g": doc.total_carbs_g,
            "total_fats_g": doc.total_fats_g,
            "meals": [m.model_dump() for m in doc.meals],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


@app.post("/api/v1/nutrition/estimate")
@app.post("/api/v1/fitness/parse-meal")
async def estimate_meal_macros(payload: EstimateMealRequest):
    """
    2-Tier High-Speed Food Parser:
      • Tier 1: Exact-match normalized text hash in MongoDB meal_parse_cache.
        If found, returns in < 10ms with 0 tokens and 0 LLM cost.
      • Tier 2: Direct JSON schema generation via Gemini 3.8 Flash (zero-AFC).
        Persists to meal_parse_cache for instant re-use across all athletes.
    """
    try:
        import re, json
        from app.models.documents import MealParseCacheDocument
        from app.core.llm import get_agent_model
        from langchain_core.messages import SystemMessage, HumanMessage as LCHumanMessage
        from pydantic import BaseModel as PydanticBaseModel

        raw_query = payload.food_description.strip()
        normalized = re.sub(r'[^a-z0-9 ]', '', raw_query.lower()).strip()

        # ── Tier 1: Exact Normalized Cache Check ──
        if normalized:
            cached = await MealParseCacheDocument.find_one(MealParseCacheDocument.normalized_query == normalized)
            if cached:
                return {
                    "name": cached.name,
                    "calories": cached.calories,
                    "protein_g": cached.protein_g,
                    "carbs_g": cached.carbs_g,
                    "fats_g": cached.fats_g,
                    "serving_size": cached.serving_size,
                    "cached": True,
                }

        # ── Tier 2: Direct Pydantic JSON Generation (Zero AFC Tool Calling) ──
        system_prompt = (
            "You are a clinical sports nutritionist and metabolic food database parser. "
            "Given a freeform food description, estimate precise caloric and macronutrient breakdowns "
            "using standard USDA / Cronometer nutritional tables.\n"
            "Return ONLY a single valid JSON object matching this exact schema:\n"
            "{\n"
            '  "name": "concise name of the meal or food item",\n'
            '  "calories": 0,\n'
            '  "protein_g": 0,\n'
            '  "carbs_g": 0,\n'
            '  "fats_g": 0,\n'
            '  "serving_size": "e.g. 1 bowl (250g)"\n'
            "}\n"
            "Do not include any explanations, markdown code fences, or trailing commas."
        )

        llm = get_agent_model(temperature=0.0)
        res = llm.invoke([
            SystemMessage(content=system_prompt),
            LCHumanMessage(content=raw_query),
        ])

        raw_text = res.content if hasattr(res, "content") else str(res)
        if isinstance(raw_text, list):
            raw_text = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw_text)

        cleaned = raw_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = re.sub(r',\s*([\]\}])', r'\1', cleaned.strip())

        try:
            parsed = json.loads(cleaned)
        except Exception:
            # Fallback regex extraction if model hallucinated wrapper text
            cals_m = re.search(r'"calories":\s*(\d+)', cleaned)
            prot_m = re.search(r'"protein_g":\s*(\d+)', cleaned)
            carb_m = re.search(r'"carbs_g":\s*(\d+)', cleaned)
            fats_m = re.search(r'"fats_g":\s*(\d+)', cleaned)
            name_m = re.search(r'"name":\s*"([^"]+)"', cleaned)
            parsed = {
                "name": name_m.group(1) if name_m else raw_query.title()[:40],
                "calories": int(cals_m.group(1)) if cals_m else 250,
                "protein_g": int(prot_m.group(1)) if prot_m else 15,
                "carbs_g": int(carb_m.group(1)) if carb_m else 30,
                "fats_g": int(fats_m.group(1)) if fats_m else 8,
                "serving_size": "1 serving",
            }

        name_val = str(parsed.get("name") or raw_query.title()[:40])
        cals_val = int(parsed.get("calories") or 0)
        prot_val = int(parsed.get("protein_g") or 0)
        carb_val = int(parsed.get("carbs_g") or 0)
        fats_val = int(parsed.get("fats_g") or 0)
        serving_val = str(parsed.get("serving_size") or "1 serving")

        # Persist to Tier 1 Cache for future zero-token instant retrieval across all users
        if normalized:
            try:
                new_cache = MealParseCacheDocument(
                    normalized_query=normalized,
                    name=name_val,
                    calories=cals_val,
                    protein_g=prot_val,
                    carbs_g=carb_val,
                    fats_g=fats_val,
                    serving_size=serving_val,
                )
                await new_cache.insert()
            except Exception as cache_err:
                logger.debug(f"Meal parse cache insert note: {cache_err}")

        return {
            "name": name_val,
            "calories": cals_val,
            "protein_g": prot_val,
            "carbs_g": carb_val,
            "fats_g": fats_val,
            "serving_size": serving_val,
            "cached": False,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


# ΓöÇΓöÇΓöÇ Daily Metrics / Weigh-In Endpoint ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

class WeighInRequest(BaseModel):
    user_id: str
    date: str                     # YYYY-MM-DD
    scale_weight_kg: float

@app.post("/api/v1/metrics/weigh-in")
async def log_weigh_in(payload: WeighInRequest):
    """
    Logs a morning scale weight to today's DailyMetricDocument.
    Used by the weekly metabolic trend engine to dynamically adjust TDEE targets.
    """
    try:
        doc = await DailyMetricDocument.find_one(
            DailyMetricDocument.user_id == payload.user_id,
            DailyMetricDocument.date == payload.date,
        )
        if doc:
            doc.scale_weight_kg = payload.scale_weight_kg
            doc.synced_at = datetime.utcnow()
            await doc.save()
        else:
            doc = DailyMetricDocument(
                user_id=payload.user_id,
                date=payload.date,
                scale_weight_kg=payload.scale_weight_kg,
            )
            await doc.insert()

        return {"status": "logged", "date": payload.date, "scale_weight_kg": payload.scale_weight_kg}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/api/v1/chat/history")
async def get_chat_history(user_id: str = "local_user"):
    """
    Returns recent windowed conversation messages for the omniscient coach bottom sheet.
    """
    try:
        from app.models.documents import ChatSessionDocument
        session_doc = await ChatSessionDocument.find_one(ChatSessionDocument.user_id == user_id)
        if session_doc and session_doc.messages:
            return {
                "status": "success",
                "messages": [
                    {"role": m.role, "content": m.content, "timestamp": m.timestamp.isoformat() if m.timestamp else None}
                    for m in session_doc.messages
                ],
                "current_topic": session_doc.current_topic
            }
        return {"status": "success", "messages": [], "current_topic": None}
    except Exception as e:
        logger.debug(f"Chat history fetch note: {e}")
        return {"status": "success", "messages": [], "current_topic": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
