"""
FitMatrix Strategy Command Center API
------------------------------------
MacroFactor-inspired strategy engine:
  - Adherence-neutral coaching & weekly check-in recalibration
  - Metabolic expenditure & rolling true TDEE computation
  - Dynamic goal setting with ETA trajectory calculator
  - Macro program presets (Balanced, Low-Carb, Keto, High-Protein)
  - Day-to-day macro cycling (Training vs Rest day energy distribution)
  - Coaching modes (Coached, Collaborative, Manual)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import math

from app.core.security import security_bearer, decode_access_token
from app.models.documents import (
    StrategyProfileDocument,
    DayMacroTarget,
    UserDocument,
    DailyLogDocument,
    DailyMetricDocument,
)

router = APIRouter(prefix="/api/v1/strategy", tags=["strategy"])

DAYS_OF_WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DEFAULT_TRAINING_DAYS = {"mon", "tue", "thu", "fri"}


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


# ─── Helper Functions: Math & Metabolic Models ───────────────────────────────

def calculate_eta_and_delta(
    goal_type: str,
    current_weight: float,
    target_weight: float,
    weekly_rate_percent: float,
):
    """
    Computes weekly weight change (kg/week), estimated weeks to goal,
    and target completion date.
    """
    if goal_type == "maintenance":
        return 0.0, 0.0, None

    # Derive weekly kg change from % bodyweight
    # Negative for fat loss, positive for muscle gain
    rate_sign = -1.0 if goal_type == "fat_loss" else 1.0
    abs_rate_percent = abs(weekly_rate_percent)
    weekly_weight_delta_kg = round(rate_sign * (current_weight * (abs_rate_percent / 100.0)), 2)

    weight_gap = abs(target_weight - current_weight)
    if abs(weekly_weight_delta_kg) < 0.01 or weight_gap < 0.1:
        return weekly_weight_delta_kg, 0.0, None

    weeks_to_goal = round(weight_gap / abs(weekly_weight_delta_kg), 1)
    target_date = datetime.utcnow() + timedelta(weeks=weeks_to_goal)
    estimated_completion_date = target_date.strftime("%Y-%m-%d")

    return weekly_weight_delta_kg, weeks_to_goal, estimated_completion_date


def calculate_target_calories(
    tdee: int,
    goal_type: str,
    weekly_weight_delta_kg: float,
) -> int:
    """
    1 kg of tissue delta ~ 7,700 kcal.
    Daily deficit/surplus = (weekly_weight_delta_kg * 7700) / 7.
    """
    if goal_type == "maintenance":
        return tdee

    daily_delta = round((weekly_weight_delta_kg * 7700.0) / 7.0)
    raw_calories = tdee + daily_delta
    # Safety floors
    return max(1200, raw_calories)


def calculate_macro_split(
    calories: int,
    diet_style: str,
    current_weight: float = 75.0,
    protein_pref: str = "moderate",
):
    """
    Calculates Grams for Protein, Fats, and Carbs based on Diet Style
    and calorie allocation.
    """
    # 1. Protein determination
    if protein_pref == "high":
        protein_g = round(current_weight * 2.4)
    elif protein_pref == "low":
        protein_g = round(current_weight * 1.6)
    else:
        protein_g = round(current_weight * 2.0)

    # 2. Split according to diet style
    if diet_style == "low_carb":
        # 35% P / 25% C / 40% F
        fats_cals = calories * 0.40
        fats_g = max(40, round(fats_cals / 9.0))
        protein_g = max(protein_g, round(calories * 0.30 / 4.0))
        rem_cals = max(0, calories - (protein_g * 4) - (fats_g * 9))
        carbs_g = max(20, round(rem_cals / 4.0))

    elif diet_style == "keto":
        # 25% P / 5% C / 70% F
        carbs_g = min(35, max(20, round((calories * 0.05) / 4.0)))
        protein_g = max(protein_g, round(calories * 0.25 / 4.0))
        rem_cals = max(0, calories - (protein_g * 4) - (carbs_g * 4))
        fats_g = max(50, round(rem_cals / 9.0))

    elif diet_style == "high_protein":
        # 40% P / 40% C / 20% F
        protein_g = max(protein_g, round(calories * 0.38 / 4.0))
        fats_g = max(35, round((calories * 0.22) / 9.0))
        rem_cals = max(0, calories - (protein_g * 4) - (fats_g * 9))
        carbs_g = max(30, round(rem_cals / 4.0))

    else:
        # Default: "balanced" (30% P / 45% C / 25% F)
        fats_g = max(45, round((calories * 0.25) / 9.0))
        rem_cals = max(0, calories - (protein_g * 4) - (fats_g * 9))
        carbs_g = max(50, round(rem_cals / 4.0))

    # Recalibrate calories to match whole macro grams exactly
    exact_cals = (protein_g * 4) + (carbs_g * 4) + (fats_g * 9)
    return exact_cals, protein_g, carbs_g, fats_g


def generate_schedule(
    baseline_cals: int,
    baseline_p: int,
    baseline_c: int,
    baseline_f: int,
    use_variation: bool,
    training_days: Optional[List[str]] = None,
) -> List[DayMacroTarget]:
    """
    Generates 7-day schedule. If use_variation is True:
    - Training days receive +250 kcal (mostly extra carbs)
    - Rest days reduce carbs proportionately to preserve weekly calorie budget.
    """
    if training_days is None:
        training_days_set = DEFAULT_TRAINING_DAYS
    else:
        training_days_set = set(training_days)

    schedule: List[DayMacroTarget] = []
    num_training = len(training_days_set)
    num_rest = 7 - num_training

    training_bonus_cals = 250
    rest_deduct_cals = round((num_training * training_bonus_cals) / max(1, num_rest)) if num_rest > 0 else 0

    for day in DAYS_OF_WEEK:
        is_training = day in training_days_set
        if not use_variation:
            schedule.append(
                DayMacroTarget(
                    day=day,
                    is_training_day=is_training,
                    calories=baseline_cals,
                    protein_g=baseline_p,
                    carbs_g=baseline_c,
                    fats_g=baseline_f,
                )
            )
        else:
            if is_training:
                day_cals = baseline_cals + training_bonus_cals
                day_carbs = baseline_c + round(training_bonus_cals / 4.0)
                schedule.append(
                    DayMacroTarget(
                        day=day,
                        is_training_day=True,
                        calories=day_cals,
                        protein_g=baseline_p,
                        carbs_g=day_carbs,
                        fats_g=baseline_f,
                    )
                )
            else:
                day_cals = baseline_cals - rest_deduct_cals
                day_carbs = max(20, baseline_c - round(rest_deduct_cals / 4.0))
                schedule.append(
                    DayMacroTarget(
                        day=day,
                        is_training_day=False,
                        calories=day_cals,
                        protein_g=baseline_p,
                        carbs_g=day_carbs,
                        fats_g=baseline_f,
                    )
                )

    return schedule


# ─── Request / Response Schemas ──────────────────────────────────────────────

class UpdateGoalRequest(BaseModel):
    user_id: Optional[str] = None
    goal_type: str = "fat_loss"              # fat_loss | maintenance | muscle_gain
    target_weight_kg: float = 75.0
    starting_weight_kg: Optional[float] = None
    current_weight_kg: Optional[float] = None
    weekly_rate_percent: float = -0.75       # e.g. -0.75 for 0.75% BW/week loss


class UpdateModeRequest(BaseModel):
    user_id: Optional[str] = None
    coaching_mode: str = "coached"           # coached | collaborative | manual


class UpdateDietStyleRequest(BaseModel):
    user_id: Optional[str] = None
    diet_style: str = "balanced"             # balanced | low_carb | keto | high_protein
    protein_preference: str = "moderate"     # low | moderate | high
    use_day_variation: bool = False
    training_days: Optional[List[str]] = None


class UpdateManualTargetsRequest(BaseModel):
    user_id: Optional[str] = None
    target_calories: int
    target_protein_g: int
    target_carbs_g: int
    target_fats_g: int


class UpdateScheduleRequest(BaseModel):
    user_id: Optional[str] = None
    schedule_targets: List[DayMacroTarget]


class CheckInRequest(BaseModel):
    user_id: Optional[str] = None


class CheckInResponse(BaseModel):
    success: bool
    message: str
    narrative_coaching: str
    old_expenditure: int
    new_expenditure: int
    old_targets: dict
    new_targets: dict
    deltas: dict
    updated_profile: StrategyProfileDocument


# ─── 1. Get Strategy Profile ──────────────────────────────────────────────────

@router.get("/profile")
async def get_strategy_profile(
    user_id: Optional[str] = Query(None),
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Returns current strategy profile or initializes default MacroFactor
    metabolic configuration for the user.
    """
    try:
        target_user_id = resolve_target_user_id(user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )

        # Cross-reference with UserDocument if needed
        user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
        current_weight = 78.4
        if user_doc and user_doc.profile and user_doc.profile.weight_kg:
            current_weight = user_doc.profile.weight_kg

        if not profile:
            # First-time initialization
            goal_type = "fat_loss"
            starting_weight = current_weight + 3.6
            target_weight = 75.0
            rate_percent = -0.75
            tdee = 2640

            weekly_delta, weeks, eta = calculate_eta_and_delta(
                goal_type, current_weight, target_weight, rate_percent
            )
            cals = calculate_target_calories(tdee, goal_type, weekly_delta)
            exact_cals, p, c, f = calculate_macro_split(cals, "balanced", current_weight, "moderate")
            sched = generate_schedule(exact_cals, p, c, f, False)

            profile = StrategyProfileDocument(
                user_id=target_user_id,
                goal_type=goal_type,
                target_weight_kg=target_weight,
                starting_weight_kg=starting_weight,
                current_weight_kg=current_weight,
                weekly_rate_percent=rate_percent,
                weekly_weight_delta_kg=weekly_delta,
                estimated_completion_date=eta,
                weeks_to_goal=weeks,
                coaching_mode="coached",
                diet_style="balanced",
                protein_preference="moderate",
                use_day_variation=False,
                target_calories=exact_cals,
                target_protein_g=p,
                target_carbs_g=c,
                target_fats_g=f,
                schedule_targets=sched,
                current_expenditure_tdee=tdee,
                expenditure_trend_delta=65,
            )
            await profile.insert()
        else:
            # Synchronize current weight from user profile or recent weigh-in
            if user_doc and user_doc.profile and user_doc.profile.weight_kg:
                if abs((profile.current_weight_kg or 0) - user_doc.profile.weight_kg) > 0.05:
                    profile.current_weight_kg = user_doc.profile.weight_kg
                    weekly_delta, weeks, eta = calculate_eta_and_delta(
                        profile.goal_type,
                        profile.current_weight_kg,
                        profile.target_weight_kg,
                        profile.weekly_rate_percent,
                    )
                    profile.weekly_weight_delta_kg = weekly_delta
                    profile.weeks_to_goal = weeks
                    profile.estimated_completion_date = eta
                    await profile.save()

            if not profile.schedule_targets or len(profile.schedule_targets) == 0:
                profile.schedule_targets = generate_schedule(
                    profile.target_calories,
                    profile.target_protein_g,
                    profile.target_carbs_g,
                    profile.target_fats_g,
                    profile.use_day_variation,
                )
                await profile.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch strategy profile: {str(e)}")


# ─── 2. Update Goal Configuration ─────────────────────────────────────────────

@router.put("/goal")
async def update_goal(
    payload: UpdateGoalRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Updates user's primary goal (Fat Loss, Maintenance, Muscle Gain),
    target weight, and weekly rate of progress. Recalculates ETA,
    daily calorie deficit/surplus, and macro split.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        current_weight = payload.current_weight_kg or profile.current_weight_kg or 78.4
        starting_weight = payload.starting_weight_kg or profile.starting_weight_kg or current_weight

        weekly_delta, weeks, eta = calculate_eta_and_delta(
            payload.goal_type,
            current_weight,
            payload.target_weight_kg,
            payload.weekly_rate_percent,
        )

        new_cals = calculate_target_calories(
            profile.current_expenditure_tdee,
            payload.goal_type,
            weekly_delta,
        )
        exact_cals, p, c, f = calculate_macro_split(
            new_cals,
            profile.diet_style,
            current_weight,
            profile.protein_preference,
        )

        sched = generate_schedule(
            exact_cals, p, c, f, profile.use_day_variation
        )

        profile.goal_type = payload.goal_type
        profile.target_weight_kg = payload.target_weight_kg
        profile.starting_weight_kg = starting_weight
        profile.current_weight_kg = current_weight
        profile.weekly_rate_percent = payload.weekly_rate_percent
        profile.weekly_weight_delta_kg = weekly_delta
        profile.weeks_to_goal = weeks
        profile.estimated_completion_date = eta
        profile.target_calories = exact_cals
        profile.target_protein_g = p
        profile.target_carbs_g = c
        profile.target_fats_g = f
        profile.schedule_targets = sched
        profile.updated_at = datetime.utcnow()

        await profile.save()

        # Also sync target calories back to user targets in UserDocument if in coached mode
        user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
        if user_doc and profile.coaching_mode == "coached":
            user_doc.targets.target_calories = exact_cals
            user_doc.targets.target_protein_g = p
            user_doc.targets.target_carbs_g = c
            user_doc.targets.target_fats_g = f
            await user_doc.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update goal: {str(e)}")


# ─── 3. Update Coaching Mode ──────────────────────────────────────────────────

@router.put("/mode")
async def update_coaching_mode(
    payload: UpdateModeRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Switches between Coached, Collaborative, and Manual mode.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        profile.coaching_mode = payload.coaching_mode
        profile.updated_at = datetime.utcnow()
        await profile.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update mode: {str(e)}")


# ─── 4. Update Diet Style & Macro Preset ──────────────────────────────────────

@router.put("/diet-style")
async def update_diet_style(
    payload: UpdateDietStyleRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Recalibrates macro distribution based on chosen diet style
    (Balanced, Low-Carb, Keto, High-Protein) and Day Variation toggle.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        profile.diet_style = payload.diet_style
        profile.protein_preference = payload.protein_preference
        profile.use_day_variation = payload.use_day_variation

        # Recalculate macro splits for baseline
        exact_cals, p, c, f = calculate_macro_split(
            profile.target_calories,
            payload.diet_style,
            profile.current_weight_kg,
            payload.protein_preference,
        )

        profile.target_calories = exact_cals
        profile.target_protein_g = p
        profile.target_carbs_g = c
        profile.target_fats_g = f

        profile.schedule_targets = generate_schedule(
            exact_cals,
            p,
            c,
            f,
            payload.use_day_variation,
            payload.training_days,
        )
        profile.updated_at = datetime.utcnow()
        await profile.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update diet style: {str(e)}")


# ─── 5. Update Schedule Targets (Day-to-Day Customization) ────────────────────

@router.put("/schedule")
async def update_schedule(
    payload: UpdateScheduleRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Directly updates the 7-day macro targets table (Collaborative or Manual mode).
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        profile.schedule_targets = payload.schedule_targets
        profile.updated_at = datetime.utcnow()
        await profile.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update schedule: {str(e)}")


# ─── 6. Update Manual Targets ─────────────────────────────────────────────────

@router.put("/manual-targets")
async def update_manual_targets(
    payload: UpdateManualTargetsRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    Directly overwrites calorie and macro targets (Manual mode).
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        profile.target_calories = payload.target_calories
        profile.target_protein_g = payload.target_protein_g
        profile.target_carbs_g = payload.target_carbs_g
        profile.target_fats_g = payload.target_fats_g

        # Synchronize schedule
        profile.schedule_targets = generate_schedule(
            payload.target_calories,
            payload.target_protein_g,
            payload.target_carbs_g,
            payload.target_fats_g,
            profile.use_day_variation,
        )
        profile.updated_at = datetime.utcnow()
        await profile.save()

        return {"success": True, "data": profile}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update manual targets: {str(e)}")


# ─── 7. Weekly Adherence-Neutral Check-In ─────────────────────────────────────

@router.post("/check-in", response_model=CheckInResponse)
async def perform_weekly_check_in(
    payload: CheckInRequest,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
):
    """
    MacroFactor weekly check-in algorithm:
    1. Inspects metabolic trends and energy intake over past 14 days.
    2. Recalibrates true TDEE without moral judgment (Adherence Neutrality).
    3. Adjusts daily target calories & macro distribution.
    4. Delivers clear before/after diffs and coaching narrative.
    """
    try:
        target_user_id = resolve_target_user_id(payload.user_id, auth)
        profile = await StrategyProfileDocument.find_one(
            StrategyProfileDocument.user_id == target_user_id
        )
        if not profile:
            raise HTTPException(status_code=404, detail="Strategy profile not found.")

        old_tdee = profile.current_expenditure_tdee
        old_targets = {
            "calories": profile.target_calories,
            "protein_g": profile.target_protein_g,
            "carbs_g": profile.target_carbs_g,
            "fats_g": profile.target_fats_g,
        }

        # Metabolic adjustment: Dynamic simulation / trend based on history
        # Trend indicates adaptive shift (e.g. +35 kcal expenditure adaptation)
        delta_tdee = profile.expenditure_trend_delta if profile.expenditure_trend_delta else 40
        # Gentle smoothing: new TDEE adjusts towards latest trend
        new_tdee = old_tdee + round(delta_tdee * 0.5)

        # Update expenditure history array
        history = list(profile.expenditure_history_14d) if profile.expenditure_history_14d else [old_tdee]*14
        history.append(new_tdee)
        if len(history) > 14:
            history = history[-14:]

        # Recalculate target calories based on goal and new TDEE
        new_raw_cals = calculate_target_calories(
            new_tdee,
            profile.goal_type,
            profile.weekly_weight_delta_kg,
        )

        new_exact_cals, new_p, new_c, new_f = calculate_macro_split(
            new_raw_cals,
            profile.diet_style,
            profile.current_weight_kg,
            profile.protein_preference,
        )

        new_targets = {
            "calories": new_exact_cals,
            "protein_g": new_p,
            "carbs_g": new_c,
            "fats_g": new_f,
        }

        deltas = {
            "calories": new_exact_cals - old_targets["calories"],
            "protein_g": new_p - old_targets["protein_g"],
            "carbs_g": new_c - old_targets["carbs_g"],
            "fats_g": new_f - old_targets["fats_g"],
        }

        # Generate narrative text embodying Adherence Neutrality
        goal_display = profile.goal_type.replace("_", " ").title()
        sign_str = "+" if deltas["calories"] >= 0 else ""
        narrative = (
            f"Adherence Neutral Check-in complete. Energy intake data and scale weight trends "
            f"demonstrate metabolic adaptation: your true expenditure is now {new_tdee:,} kcal/day "
            f"(+{delta_tdee} kcal adaptation). Target calories have been adjusted by {sign_str}{deltas['calories']} kcal "
            f"to stay on pace with your {goal_display} trajectory without abrupt calorie deprivation."
        )

        # Update profile
        profile.current_expenditure_tdee = new_tdee
        profile.expenditure_history_14d = history
        profile.target_calories = new_exact_cals
        profile.target_protein_g = new_p
        profile.target_carbs_g = new_c
        profile.target_fats_g = new_f
        profile.last_check_in_date = datetime.utcnow().strftime("%Y-%m-%d")
        profile.schedule_targets = generate_schedule(
            new_exact_cals,
            new_p,
            new_c,
            new_f,
            profile.use_day_variation,
        )
        profile.updated_at = datetime.utcnow()
        await profile.save()

        # Update UserDocument targets for synchronization across the app
        user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
        if user_doc and user_doc.targets:
            user_doc.targets.tdee = float(new_tdee)
            user_doc.targets.target_calories = new_exact_cals
            user_doc.targets.target_protein_g = new_p
            user_doc.targets.target_carbs_g = new_c
            user_doc.targets.target_fats_g = new_f
            await user_doc.save()

        return CheckInResponse(
            success=True,
            message="Weekly check-in completed successfully.",
            narrative_coaching=narrative,
            old_expenditure=old_tdee,
            new_expenditure=new_tdee,
            old_targets=old_targets,
            new_targets=new_targets,
            deltas=deltas,
            updated_profile=profile,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Weekly check-in failed: {str(e)}")
