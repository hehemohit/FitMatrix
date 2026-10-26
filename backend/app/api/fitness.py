"""
FitMatrix Fitness API Endpoints
-------------------------------
Provides unified per-day tracking with lazy initialization & upsert pattern.
Supports client timezone offset for local midnight transitions.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.security import security_bearer, decode_access_token
from app.models.documents import (
    DailyLogDocument,
    MealEntry,
    WorkoutItem,
    UserDocument,
    DailyMetricDocument,
    NutritionLogDocument,
    WorkoutSessionDocument,
    CompletedExerciseData,
    CompletedSetData,
    GymCheckInDocument,
    WeeklyScheduleDocument,
    DayScheduleData,
    RoutineScheduleItemData,
)

router = APIRouter(prefix="/api/v1/fitness", tags=["fitness"])


def resolve_target_user_id(
    payload_user_id: Optional[str] = None,
    auth: Optional[HTTPAuthorizationCredentials] = None,
) -> str:
    """
    Resolves the authenticated user ID from JWT bearer token if present,
    or falls back to the payload/query user_id. Rejects ambiguous defaults.
    """
    if auth and auth.credentials:
        payload = decode_access_token(auth.credentials)
        if payload and "sub" in payload:
            return payload["sub"]
    if payload_user_id and payload_user_id != "usr_dev_1":
        return payload_user_id
    if payload_user_id:
        return payload_user_id
    raise HTTPException(status_code=401, detail="Authentication required: unable to identify user.")


def get_local_date_id(tz_offset_minutes: int = 0) -> str:
    """
    Computes YYYY-MM-DD using client timezone offset in minutes.
    In JavaScript, new Date().getTimezoneOffset() returns minutes behind UTC
    (e.g., IST UTC+5:30 returns -330, EST UTC-5 returns 300).
    So local_time = utc_now - timedelta(minutes=tz_offset_minutes).
    """
    utc_now = datetime.utcnow()
    local_time = utc_now - timedelta(minutes=tz_offset_minutes)
    return local_time.strftime("%Y-%m-%d")


class AddFoodLogRequest(BaseModel):
    user_id: Optional[str] = None
    name: str
    category: str = "Lunch"
    time: str = "12:00"
    calories: int
    protein_g: int = 0
    carbs_g: int = 0
    fats_g: int = 0
    tz_offset: int = 0


class AddWeighInRequest(BaseModel):
    user_id: Optional[str] = None
    scale_weight_kg: float
    tz_offset: int = 0


# ─── 1. Get or Lazily Initialize Today's Log ──────────────────────────────────

@router.get("/today")
async def get_or_init_today_log(
    user_id: Optional[str] = Query(None),
    tz_offset: int = Query(0),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    try:
        target_user_id = resolve_target_user_id(user_id, auth)
        today_date_id = get_local_date_id(tz_offset)

        today_log = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == target_user_id,
            DailyLogDocument.date_id == today_date_id,
        )

        if not today_log:
            # Query user targets to inherit custom calorie & protein goals
            user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            # Also check if there were legacy nutrition_logs or daily_metrics logged today
            legacy_nutrition = await NutritionLogDocument.find_one(
                NutritionLogDocument.user_id == target_user_id,
                NutritionLogDocument.date == today_date_id,
            )
            legacy_metric = await DailyMetricDocument.find_one(
                DailyMetricDocument.user_id == target_user_id,
                DailyMetricDocument.date == today_date_id,
            )

            cals = legacy_nutrition.total_calories if legacy_nutrition else 0
            pro = legacy_nutrition.total_protein_g if legacy_nutrition else 0
            carbs = legacy_nutrition.total_carbs_g if legacy_nutrition else 0
            fats = legacy_nutrition.total_fats_g if legacy_nutrition else 0
            meals = legacy_nutrition.meals if legacy_nutrition else []
            weight = legacy_metric.scale_weight_kg if legacy_metric else None

            today_log = DailyLogDocument(
                user_id=target_user_id,
                date_id=today_date_id,
                calorie_goal=cal_goal,
                protein_goal_g=pro_goal,
                total_calories_consumed=cals,
                total_protein_g=pro,
                total_carbs_g=carbs,
                total_fats_g=fats,
                scale_weight_kg=weight,
                meals=meals,
            )
            await today_log.insert()

        return {
            "success": True,
            "data": {
                "date_id": today_log.date_id,
                "calorie_goal": today_log.calorie_goal,
                "protein_goal_g": today_log.protein_goal_g,
                "total_calories_consumed": today_log.total_calories_consumed,
                "total_protein_g": today_log.total_protein_g,
                "total_carbs_g": today_log.total_carbs_g,
                "total_fats_g": today_log.total_fats_g,
                "total_calories_burned": today_log.total_calories_burned,
                "scale_weight_kg": today_log.scale_weight_kg,
                "meals": [m.model_dump() for m in today_log.meals],
                "is_completed": today_log.is_completed,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 2. Add Food Log (Atomic Upsert) ──────────────────────────────────────────

@router.post("/food-log")
async def add_food_log(
    payload: AddFoodLogRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        today_date_id = get_local_date_id(payload.tz_offset)

        meal = MealEntry(
            name=payload.name,
            category=payload.category,
            time=payload.time,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fats_g=payload.fats_g,
        )

        log_doc = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == target_user_id,
            DailyLogDocument.date_id == today_date_id,
        )

        if log_doc:
            log_doc.meals.append(meal)
            log_doc.total_calories_consumed += meal.calories
            log_doc.total_protein_g += meal.protein_g
            log_doc.total_carbs_g += meal.carbs_g
            log_doc.total_fats_g += meal.fats_g
            log_doc.updated_at = datetime.utcnow()
            await log_doc.save()
        else:
            user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            log_doc = DailyLogDocument(
                user_id=target_user_id,
                date_id=today_date_id,
                calorie_goal=cal_goal,
                protein_goal_g=pro_goal,
                total_calories_consumed=meal.calories,
                total_protein_g=meal.protein_g,
                total_carbs_g=meal.carbs_g,
                total_fats_g=meal.fats_g,
                meals=[meal],
            )
            await log_doc.insert()

        return {
            "success": True,
            "data": {
                "date_id": log_doc.date_id,
                "total_calories_consumed": log_doc.total_calories_consumed,
                "total_protein_g": log_doc.total_protein_g,
                "total_carbs_g": log_doc.total_carbs_g,
                "total_fats_g": log_doc.total_fats_g,
                "meals": [m.model_dump() for m in log_doc.meals],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 3. Add Weigh-In ──────────────────────────────────────────────────────────

@router.post("/weigh-in")
async def add_weigh_in(
    payload: AddWeighInRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        today_date_id = get_local_date_id(payload.tz_offset)

        log_doc = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == target_user_id,
            DailyLogDocument.date_id == today_date_id,
        )

        if log_doc:
            log_doc.scale_weight_kg = payload.scale_weight_kg
            log_doc.updated_at = datetime.utcnow()
            await log_doc.save()
        else:
            user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            log_doc = DailyLogDocument(
                user_id=target_user_id,
                date_id=today_date_id,
                calorie_goal=cal_goal,
                protein_goal_g=pro_goal,
                scale_weight_kg=payload.scale_weight_kg,
            )
            await log_doc.insert()

        # Update profile weight
        user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
        if user_doc:
            user_doc.profile.weight_kg = payload.scale_weight_kg
            await user_doc.save()

        return {
            "success": True,
            "data": {
                "date_id": log_doc.date_id,
                "scale_weight_kg": log_doc.scale_weight_kg,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 4. Get 30-Day Habits History ─────────────────────────────────────────────

@router.get("/history")
async def get_habits_history(
    user_id: Optional[str] = Query(None),
    days: int = Query(28),
    tz_offset: int = Query(0),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Returns 28-day boolean arrays for Weigh-In and Food Logging
    to populate the MacroFactor habits grid and 'X/7 this week' stats.
    """
    try:
        target_user_id = resolve_target_user_id(user_id, auth)
        utc_now = datetime.utcnow()
        client_now = utc_now - timedelta(minutes=tz_offset)

        # Generate the past 28 dates in chronological order
        date_list = [
            (client_now - timedelta(days=i)).strftime("%Y-%m-%d")
            for i in reversed(range(days))
        ]

        # Query all documents in range
        logs = await DailyLogDocument.find(
            DailyLogDocument.user_id == target_user_id,
            DailyLogDocument.date_id >= date_list[0],
            DailyLogDocument.date_id <= date_list[-1],
        ).to_list()

        log_map = {doc.date_id: doc for doc in logs}

        weigh_in_history: List[bool] = []
        food_log_history: List[bool] = []

        for d in date_list:
            entry = log_map.get(d)
            has_weight = bool(entry and entry.scale_weight_kg is not None and entry.scale_weight_kg > 0)
            has_food = bool(entry and (entry.total_calories_consumed > 0 or len(entry.meals) > 0))
            weigh_in_history.append(has_weight)
            food_log_history.append(has_food)

        # Calculate 'this week' stats (last 7 days)
        last_7_weigh = sum(1 for w in weigh_in_history[-7:] if w)
        last_7_food = sum(1 for f in food_log_history[-7:] if f)

        return {
            "success": True,
            "data": {
                "days": days,
                "weigh_in_history": weigh_in_history,
                "weigh_in_stat": f"{last_7_weigh}/7",
                "food_log_history": food_log_history,
                "food_log_stat": f"{last_7_food}/7",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 5. Workout Session Endpoints ─────────────────────────────────────────────

class CompletedWorkoutRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    routine_name: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    total_volume_lb: float
    total_sets: int
    total_reps: int
    trained_muscles: List[str] = Field(default_factory=list)
    exercises: List[CompletedExerciseData] = Field(default_factory=list)
    notes: Optional[str] = None


@router.post("/sessions")
async def record_workout_session(
    payload: CompletedWorkoutRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Saves a completed workout session into MongoDB Atlas and links
    calories burned to the user's daily_log document.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)

        # 1. Upsert WorkoutSessionDocument
        existing = await WorkoutSessionDocument.find_one(
            WorkoutSessionDocument.session_id == payload.session_id
        )
        if existing:
            existing.routine_name = payload.routine_name
            existing.completed_at = payload.completed_at
            existing.duration_seconds = payload.duration_seconds
            existing.total_volume_lb = payload.total_volume_lb
            existing.total_sets = payload.total_sets
            existing.total_reps = payload.total_reps
            existing.trained_muscles = payload.trained_muscles
            existing.exercises = payload.exercises
            existing.notes = payload.notes
            await existing.save()
            doc = existing
        else:
            doc = WorkoutSessionDocument(
                session_id=payload.session_id,
                user_id=target_user_id,
                routine_name=payload.routine_name,
                started_at=payload.started_at,
                completed_at=payload.completed_at,
                duration_seconds=payload.duration_seconds,
                total_volume_lb=payload.total_volume_lb,
                total_sets=payload.total_sets,
                total_reps=payload.total_reps,
                trained_muscles=payload.trained_muscles,
                exercises=payload.exercises,
                notes=payload.notes,
            )
            await doc.insert()

        # 2. Add to DailyLog workout_logs
        date_str = payload.completed_at.strftime("%Y-%m-%d")
        daily_log = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == target_user_id,
            DailyLogDocument.date_id == date_str,
        )
        if daily_log:
            cals_est = int(payload.duration_seconds / 60.0 * 6.5)  # ~6.5 kcal/min
            daily_log.workout_logs.append(
                WorkoutItem(
                    workout_id=payload.session_id,
                    activity_type=payload.routine_name,
                    calories_burned=cals_est,
                    duration_minutes=int(payload.duration_seconds / 60),
                    timestamp=payload.completed_at,
                )
            )
            daily_log.total_calories_burned += cals_est
            daily_log.updated_at = datetime.utcnow()
            await daily_log.save()

        return {"success": True, "data": {"session_id": doc.session_id}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions")
async def get_workout_sessions(
    user_id: Optional[str] = Query(None),
    limit: int = Query(50),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Retrieves recent completed workout sessions for progress & stats.
    """
    try:
        target_user_id = resolve_target_user_id(user_id, auth)
        sessions = (
            await WorkoutSessionDocument.find(
                WorkoutSessionDocument.user_id == target_user_id
            )
            .sort(-WorkoutSessionDocument.completed_at)
            .limit(limit)
            .to_list()
        )
        return {"success": True, "data": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 6. Gym Check-In Endpoints ────────────────────────────────────────────────

class CheckInRequest(BaseModel):
    user_id: Optional[str] = None
    check_in_id: str
    gym_name: str = "FitMatrix Partner Gym"
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    date: str


@router.post("/check-in")
async def log_gym_check_in(
    payload: CheckInRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Records or updates a gym attendance check-in.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        existing = await GymCheckInDocument.find_one(
            GymCheckInDocument.check_in_id == payload.check_in_id
        )
        if existing:
            existing.check_out_time = payload.check_out_time
            existing.duration_minutes = payload.duration_minutes
            await existing.save()
            doc = existing
        else:
            doc = GymCheckInDocument(
                check_in_id=payload.check_in_id,
                user_id=target_user_id,
                gym_name=payload.gym_name,
                check_in_time=payload.check_in_time,
                check_out_time=payload.check_out_time,
                duration_minutes=payload.duration_minutes,
                date=payload.date,
            )
            await doc.insert()

        return {"success": True, "data": {"check_in_id": doc.check_in_id}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── 7. Weekly Schedule Endpoints ─────────────────────────────────────────────

class SaveScheduleRequest(BaseModel):
    user_id: Optional[str] = None
    schedule: List[DayScheduleData]


@router.get("/schedule")
async def get_weekly_schedule(
    user_id: Optional[str] = Query(None),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Retrieves the user's active Monday to Sunday routine schedule.
    """
    try:
        target_user_id = resolve_target_user_id(user_id, auth)
        doc = await WeeklyScheduleDocument.find_one(
            WeeklyScheduleDocument.user_id == target_user_id
        )
        if not doc:
            return {"success": True, "data": None}
        return {"success": True, "data": doc.schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/schedule")
async def update_weekly_schedule(
    payload: SaveScheduleRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Persists the user's updated 7-day routine schedule.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        doc = await WeeklyScheduleDocument.find_one(
            WeeklyScheduleDocument.user_id == target_user_id
        )
        if doc:
            doc.schedule = payload.schedule
            doc.updated_at = datetime.utcnow()
            await doc.save()
        else:
            doc = WeeklyScheduleDocument(
                user_id=target_user_id,
                schedule=payload.schedule,
            )
            await doc.insert()

        return {"success": True, "data": doc.schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

