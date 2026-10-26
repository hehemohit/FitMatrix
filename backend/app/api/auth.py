"""
FitMatrix Authentication & Onboarding API
------------------------------------------
Handles:
  - User registration & bcrypt authentication
  - JWT token generation & session management
  - Multi-step onboarding calibration engine:
      • Mifflin-St Jeor BMR + Activity TDEE computation
      • Goal trajectory & ETA calculator
      • StrategyProfileDocument initialization with 7-day macro schedule
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from app.models.documents import (
    UserDocument,
    UserProfileData,
    MetabolicTargets,
    StrategyProfileDocument,
    DailyLogDocument,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.api.strategy import (
    calculate_eta_and_delta,
    calculate_target_calories,
    calculate_macro_split,
    generate_schedule,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "active": 1.725,
    "very_active": 1.9,
}


# ─── Request & Response Models ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = "Athlete"


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    full_name: str
    email: str
    is_onboarded: bool


class OnboardingRequest(BaseModel):
    user_id: Optional[str] = None
    full_name: str
    age: int = 26
    sex: str = "male"                         # 'male' | 'female'
    height_cm: float = 178.0
    current_weight_kg: float = 78.4
    goal_type: str = "fat_loss"               # 'fat_loss' | 'maintenance' | 'muscle_gain'
    target_weight_kg: float = 75.0
    weekly_rate_percent: float = -0.75
    activity_level: str = "moderate"          # sedentary | light | moderate | active | very_active
    diet_style: str = "balanced"              # balanced | low_carb | keto | high_protein
    protein_preference: str = "moderate"      # low | moderate | high
    training_days: List[str] = ["mon", "tue", "thu", "fri"]


# ─── 1. Register ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
async def register_user(payload: RegisterRequest):
    """
    Registers a new unique user instance with hashed password credentials.
    """
    normalized_email = payload.email.strip().lower()
    if len(payload.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long."
        )

    existing = await UserDocument.find_one(UserDocument.email == normalized_email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email address already exists."
        )

    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    hashed_pw = hash_password(payload.password)

    new_user = UserDocument(
        user_id=user_id,
        email=normalized_email,
        hashed_password=hashed_pw,
        full_name=payload.full_name.strip() or "Athlete",
        is_onboarded=False,
    )
    await new_user.insert()

    token = create_access_token({"sub": user_id, "email": normalized_email})
    return AuthResponse(
        access_token=token,
        user_id=user_id,
        full_name=new_user.full_name or "Athlete",
        email=normalized_email,
        is_onboarded=False,
    )


# ─── 2. Login ────────────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse)
async def login_user(payload: LoginRequest):
    """
    Authenticates user and returns JWT token + onboarding status.
    """
    normalized_email = payload.email.strip().lower()
    user = await UserDocument.find_one(UserDocument.email == normalized_email)

    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password."
        )

    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Incorrect email or password."
        )

    token = create_access_token({"sub": user.user_id, "email": user.email})
    return AuthResponse(
        access_token=token,
        user_id=user.user_id,
        full_name=user.full_name or "Athlete",
        email=user.email or "",
        is_onboarded=user.is_onboarded,
    )


# ─── 3. Get Current User ─────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user: UserDocument = Depends(get_current_user)):
    """
    Returns profile and state for the authenticated session user.
    """
    return {
        "success": True,
        "user_id": current_user.user_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_onboarded": current_user.is_onboarded,
        "profile": current_user.profile,
        "targets": current_user.targets,
    }


# ─── 4. Onboarding Calibration Engine ────────────────────────────────────────

@router.post("/onboarding")
async def complete_onboarding(
    payload: OnboardingRequest,
    current_user: Optional[UserDocument] = Depends(get_current_user),
):
    """
    Ingests all startup onboarding answers:
      1. Computes Mifflin-St Jeor BMR & Activity TDEE.
      2. Derives caloric deficit/surplus & target macro distribution.
      3. Computes Goal Trajectory ETA.
      4. Initializes StrategyProfileDocument & DailyLogDocument instances.
      5. Marks user as is_onboarded = True.
    """
    target_user_id = current_user.user_id if current_user else (payload.user_id or f"usr_{uuid.uuid4().hex[:10]}")
    user_doc = await UserDocument.find_one(UserDocument.user_id == target_user_id)
    if not user_doc:
        # Create user document if initializing from standalone onboarding
        user_doc = UserDocument(
            user_id=target_user_id,
            full_name=payload.full_name,
            is_onboarded=True,
        )
        await user_doc.insert()

    # ── A. Calculate Mifflin-St Jeor BMR ──
    # Men: 10 * weight (kg) + 6.25 * height (cm) - 5 * age + 5
    # Women: 10 * weight (kg) + 6.25 * height (cm) - 5 * age - 161
    s_factor = 5 if payload.sex.lower() == "male" else -161
    bmr = round(
        (10.0 * payload.current_weight_kg)
        + (6.25 * payload.height_cm)
        - (5.0 * payload.age)
        + s_factor,
        1,
    )

    # ── B. Total Daily Energy Expenditure (TDEE) ──
    activity_multiplier = ACTIVITY_MULTIPLIERS.get(payload.activity_level.lower(), 1.55)
    tdee = round(bmr * activity_multiplier)

    # ── C. Goal Trajectory & Calorie Deficit/Surplus ──
    weekly_delta_kg, weeks_to_goal, completion_eta = calculate_eta_and_delta(
        payload.goal_type,
        payload.current_weight_kg,
        payload.target_weight_kg,
        payload.weekly_rate_percent,
    )

    target_calories = calculate_target_calories(
        tdee,
        payload.goal_type,
        weekly_delta_kg,
    )

    # ── D. Macro Distribution (Protein, Carbs, Fats) ──
    exact_cals, p_g, c_g, f_g = calculate_macro_split(
        target_calories,
        payload.diet_style,
        payload.current_weight_kg,
        payload.protein_preference,
    )

    # ── E. 7-Day Macro Schedule with Training vs Rest Variation ──
    schedule = generate_schedule(
        exact_cals,
        p_g,
        c_g,
        f_g,
        use_variation=True,
        training_days=payload.training_days,
    )

    # ── F. Persist User Document Profile & Targets ──
    user_doc.full_name = payload.full_name
    user_doc.is_onboarded = True
    user_doc.profile = UserProfileData(
        weight_kg=payload.current_weight_kg,
        height_cm=payload.height_cm,
        age=payload.age,
        sex=payload.sex,
        activity_level=payload.activity_level,
        fitness_goal=payload.goal_type,
        dietary_preference=payload.diet_style,
    )
    user_doc.targets = MetabolicTargets(
        bmr=bmr,
        tdee=tdee,
        target_calories=exact_cals,
        target_protein_g=p_g,
        target_carbs_g=c_g,
        target_fats_g=f_g,
        computed_at=datetime.utcnow(),
    )
    user_doc.updated_at = datetime.utcnow()
    await user_doc.save()

    # ── G. Upsert StrategyProfileDocument for this User ──
    strategy_profile = await StrategyProfileDocument.find_one(
        StrategyProfileDocument.user_id == target_user_id
    )
    if not strategy_profile:
        strategy_profile = StrategyProfileDocument(
            user_id=target_user_id,
            goal_type=payload.goal_type,
            target_weight_kg=payload.target_weight_kg,
            starting_weight_kg=payload.current_weight_kg,
            current_weight_kg=payload.current_weight_kg,
            weekly_rate_percent=payload.weekly_rate_percent,
            weekly_weight_delta_kg=weekly_delta_kg,
            estimated_completion_date=completion_eta,
            weeks_to_goal=weeks_to_goal,
            coaching_mode="coached",
            diet_style=payload.diet_style,
            protein_preference=payload.protein_preference,
            use_day_variation=True,
            target_calories=exact_cals,
            target_protein_g=p_g,
            target_carbs_g=c_g,
            target_fats_g=f_g,
            schedule_targets=schedule,
            current_expenditure_tdee=tdee,
            expenditure_trend_delta=45,
        )
        await strategy_profile.insert()
    else:
        strategy_profile.goal_type = payload.goal_type
        strategy_profile.target_weight_kg = payload.target_weight_kg
        strategy_profile.starting_weight_kg = payload.current_weight_kg
        strategy_profile.current_weight_kg = payload.current_weight_kg
        strategy_profile.weekly_rate_percent = payload.weekly_rate_percent
        strategy_profile.weekly_weight_delta_kg = weekly_delta_kg
        strategy_profile.estimated_completion_date = completion_eta
        strategy_profile.weeks_to_goal = weeks_to_goal
        strategy_profile.diet_style = payload.diet_style
        strategy_profile.protein_preference = payload.protein_preference
        strategy_profile.use_day_variation = True
        strategy_profile.target_calories = exact_cals
        strategy_profile.target_protein_g = p_g
        strategy_profile.target_carbs_g = c_g
        strategy_profile.target_fats_g = f_g
        strategy_profile.schedule_targets = schedule
        strategy_profile.current_expenditure_tdee = tdee
        strategy_profile.updated_at = datetime.utcnow()
        await strategy_profile.save()

    return {
        "success": True,
        "message": "Metabolic calibration completed successfully.",
        "calibration": {
            "bmr": bmr,
            "tdee": tdee,
            "target_calories": exact_cals,
            "protein_g": p_g,
            "carbs_g": c_g,
            "fats_g": f_g,
            "weekly_delta_kg": weekly_delta_kg,
            "weeks_to_goal": weeks_to_goal,
            "estimated_completion_date": completion_eta,
        },
        "user": user_doc,
        "strategy_profile": strategy_profile,
    }
