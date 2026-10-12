"""
FitMatrix Fitness API Endpoints
-------------------------------
Provides unified per-day tracking with lazy initialization & upsert pattern.
Supports client timezone offset for local midnight transitions.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta

from app.models.documents import (
    DailyLogDocument,
    MealEntry,
    WorkoutItem,
    UserDocument,
    DailyMetricDocument,
    NutritionLogDocument,
)

router = APIRouter(prefix="/api/v1/fitness", tags=["fitness"])


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
    user_id: str = "usr_dev_1"
    name: str
    category: str = "Lunch"
    time: str = "12:00"
    calories: int
    protein_g: int = 0
    carbs_g: int = 0
    fats_g: int = 0
    tz_offset: int = 0


class AddWeighInRequest(BaseModel):
    user_id: str = "usr_dev_1"
    scale_weight_kg: float
    tz_offset: int = 0


# ─── 1. Get or Lazily Initialize Today's Log ──────────────────────────────────

@router.get("/today")
async def get_or_init_today_log(
    user_id: str = Query("usr_dev_1"),
    tz_offset: int = Query(0),
):
    try:
        today_date_id = get_local_date_id(tz_offset)

        today_log = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == user_id,
            DailyLogDocument.date_id == today_date_id,
        )

        if not today_log:
            # Query user targets to inherit custom calorie & protein goals
            user_doc = await UserDocument.find_one(UserDocument.user_id == user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            # Also check if there were legacy nutrition_logs or daily_metrics logged today
            legacy_nutrition = await NutritionLogDocument.find_one(
                NutritionLogDocument.user_id == user_id,
                NutritionLogDocument.date == today_date_id,
            )
            legacy_metric = await DailyMetricDocument.find_one(
                DailyMetricDocument.user_id == user_id,
                DailyMetricDocument.date == today_date_id,
            )

            cals = legacy_nutrition.total_calories if legacy_nutrition else 0
            pro = legacy_nutrition.total_protein_g if legacy_nutrition else 0
            carbs = legacy_nutrition.total_carbs_g if legacy_nutrition else 0
            fats = legacy_nutrition.total_fats_g if legacy_nutrition else 0
            meals = legacy_nutrition.meals if legacy_nutrition else []
            weight = legacy_metric.scale_weight_kg if legacy_metric else None

            today_log = DailyLogDocument(
                user_id=user_id,
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
async def add_food_log(payload: AddFoodLogRequest):
    try:
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
            DailyLogDocument.user_id == payload.user_id,
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
            user_doc = await UserDocument.find_one(UserDocument.user_id == payload.user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            log_doc = DailyLogDocument(
                user_id=payload.user_id,
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
async def add_weigh_in(payload: AddWeighInRequest):
    try:
        today_date_id = get_local_date_id(payload.tz_offset)

        log_doc = await DailyLogDocument.find_one(
            DailyLogDocument.user_id == payload.user_id,
            DailyLogDocument.date_id == today_date_id,
        )

        if log_doc:
            log_doc.scale_weight_kg = payload.scale_weight_kg
            log_doc.updated_at = datetime.utcnow()
            await log_doc.save()
        else:
            user_doc = await UserDocument.find_one(UserDocument.user_id == payload.user_id)
            cal_goal = user_doc.targets.target_calories if user_doc and user_doc.targets else 2400
            pro_goal = user_doc.targets.target_protein_g if user_doc and user_doc.targets else 160

            log_doc = DailyLogDocument(
                user_id=payload.user_id,
                date_id=today_date_id,
                calorie_goal=cal_goal,
                protein_goal_g=pro_goal,
                scale_weight_kg=payload.scale_weight_kg,
            )
            await log_doc.insert()

        # Update profile weight
        user_doc = await UserDocument.find_one(UserDocument.user_id == payload.user_id)
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
    user_id: str = Query("usr_dev_1"),
    days: int = Query(28),
    tz_offset: int = Query(0),
):
    """
    Returns 28-day boolean arrays for Weigh-In and Food Logging
    to populate the MacroFactor habits grid and 'X/7 this week' stats.
    """
    try:
        utc_now = datetime.utcnow()
        client_now = utc_now - timedelta(minutes=tz_offset)

        # Generate the past 28 dates in chronological order
        date_list = [
            (client_now - timedelta(days=i)).strftime("%Y-%m-%d")
            for i in reversed(range(days))
        ]

        # Query all documents in range
        logs = await DailyLogDocument.find(
            DailyLogDocument.user_id == user_id,
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
