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

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
@app.head("/")
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

        # Compute dynamic metabolic targets if profile is provided
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        remaining_cals = 2400
        remaining_protein = 160

        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            remaining_cals = max(0, targets.target_calories - (daily_log.get("calories_logged") or 0))
            remaining_protein = max(0, targets.target_protein_g - (daily_log.get("protein_logged_g") or 0))
        except Exception:
            pass

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
            "remaining_calories": remaining_cals,
            "remaining_protein_g": remaining_protein,
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
        # Full 3-agent path: supervisor→sleep→supervisor→workout→supervisor→diet→supervisor = 7 nodes.
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

# ─── Structured Plan Endpoints ─────────────────────────────────────────────────

@app.post("/api/v1/plan/workout", response_model=WorkoutPlanSchema)
async def generate_workout_plan(payload: PlanRequest):
    """
    Generates a full structured WorkoutPlan artifact via the workout agent's
    structured output mode. Separate from /api/v1/chat — fire-once, returns
    a validated JSON plan that hydrates Plan Studio cards on the mobile client.
    """
    try:
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        rem_cals = 2400
        rem_pro = 160
        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            rem_cals = targets.target_calories
            rem_pro = targets.target_protein_g
        except Exception:
            pass

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


@app.post("/api/v1/plan/diet", response_model=DietPlanSchema)
async def generate_diet_plan(payload: PlanRequest):
    """
    Generates a full structured DietPlan artifact via the diet agent's
    structured output mode. Returns validated JSON for Plan Studio.
    """
    try:
        user_prof = payload.user_profile or {}
        daily_log = payload.daily_log or {}
        rem_cals = 2400
        rem_pro = 160
        try:
            from app.core.metabolism import compute_targets
            from app.models.documents import UserProfileData
            prof_data = UserProfileData(**user_prof)
            targets = compute_targets(prof_data)
            rem_cals = targets.target_calories
            rem_pro = targets.target_protein_g
        except Exception:
            pass

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


# ─── User Profile Endpoint ────────────────────────────────────────────────────

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

        # Apply partial update — only overwrite fields explicitly provided
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


# ─── Nutrition Logging Endpoints ───────────────────────────────────────────────

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


@app.post("/api/v1/nutrition/estimate")
async def estimate_meal_macros(payload: EstimateMealRequest):
    """
    Uses the active LLM (Groq/Gemini Flash) to estimate calorie and macro
    breakdown from a freeform food description. Returns a MealEntry draft
    for the user to confirm before logging.
    """
    try:
        from app.core.llm import get_agent_model
        from langchain_core.messages import SystemMessage, HumanMessage as LCHumanMessage
        from pydantic import BaseModel as PydanticBaseModel

        class MacroEstimate(PydanticBaseModel):
            name: str
            calories: int
            protein_g: int
            carbs_g: int
            fats_g: int

        system = (
            "You are a clinical sports nutritionist. Given a food description, "
            "return a precise macro estimate as structured JSON. "
            "Use standard food databases (USDA, Cronometer) for reference. "
            "Be accurate — this data directly affects the user's caloric tracking."
        )

        llm = get_agent_model(temperature=0.0)
        structured_llm = llm.with_structured_output(MacroEstimate)
        estimate = structured_llm.invoke([
            SystemMessage(content=system),
            LCHumanMessage(content=payload.food_description),
        ])

        return estimate.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Daily Metrics / Weigh-In Endpoint ────────────────────────────────────────

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)