"""
FitMatrix Card & Recommendation Endpoints
------------------------------------------
Generates structured visual cards for the mobile dashboard and web preview:
  - /api/v1/cards/ambient: AmbientCompanionCard data (readiness, fatigue, prescribed workout)
  - /api/v1/cards/workout: WorkoutPlanSchema
  - /api/v1/cards/diet: DietPlanSchema
  - /api/v1/cards/sleep: SleepGoalSchema
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.api.schemas import PlanRequest, WorkoutPlanSchema, DietPlanSchema, SleepGoalSchema
from app.agents.workout_agent import workout_agent_structured
from app.agents.diet_agent import diet_agent_structured
from app.agents.sleep_agent import sleep_agent_structured
from app.tools.fitness_tools import evaluate_readiness
from app.harness.guardrails import GuardrailEngine
from app.harness.prompt_manager import get_prompt_sync
from app.models.documents import DailyBriefingDocument

router = APIRouter(prefix="/api/v1/cards", tags=["cards"])


class AmbientBriefingRequest(BaseModel):
    user_id: str = "guest_athlete"
    date_id: Optional[str] = None
    force_refresh: bool = False
    steps_today: int = 0
    sleep_minutes: int = 420
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0
    user_profile: Optional[dict] = Field(default_factory=dict)
    daily_log: Optional[dict] = Field(default_factory=dict)


class AmbientBriefingResponse(BaseModel):
    user_id: str
    date_id: str
    readiness_score: int
    fatigue_flag: str
    sleep_hours: float
    steps_today: int
    resting_heart_rate_bpm: int
    headline: str
    briefing_text: str
    prescribed_workout: str
    peri_workout_carbs_g: int
    target_rir: int
    mesocycle_week: int
    cached: bool = False


@router.post("/ambient-briefing", response_model=AmbientBriefingResponse)
async def get_or_generate_ambient_briefing(payload: AmbientBriefingRequest):
    """
    Idempotent once-per-day ambient physiological briefing.
    Checks MongoDB daily_briefings first; returns in < 5ms if already synthesized today.
    Only generates once per day unless force_refresh=True is explicitly passed by user.
    """
    try:
        today_str = payload.date_id or datetime.utcnow().strftime("%Y-%m-%d")

        # 1. Idempotency Check: Return cached briefing if already synthesized today
        if not payload.force_refresh:
            existing = await DailyBriefingDocument.find_one(
                DailyBriefingDocument.user_id == payload.user_id,
                DailyBriefingDocument.date_id == today_str
            )
            if existing:
                return AmbientBriefingResponse(
                    user_id=existing.user_id,
                    date_id=existing.date_id,
                    readiness_score=existing.readiness_score,
                    fatigue_flag=existing.fatigue_flag,
                    sleep_hours=existing.sleep_hours,
                    steps_today=existing.steps_today,
                    resting_heart_rate_bpm=existing.resting_heart_rate_bpm,
                    headline=existing.headline,
                    briefing_text=existing.briefing_text,
                    prescribed_workout=existing.prescribed_workout,
                    peri_workout_carbs_g=existing.peri_workout_carbs_g,
                    target_rir=existing.target_rir,
                    mesocycle_week=existing.mesocycle_week,
                    cached=True,
                )

        # 2. Fresh Synthesis (First time today, or user explicitly requested refresh)
        user_prof = payload.user_profile or {}
        meso_week = int(user_prof.get("mesocycle_week") or 1)
        target_rir = int(user_prof.get("target_rir") or (2 if meso_week < 5 else (0 if meso_week == 5 else 4)))
        peri_carbs = int(user_prof.get("peri_workout_carbs_g") or 40)

        recovery = evaluate_readiness.invoke({
            "sleep_minutes": payload.sleep_minutes,
            "steps": payload.steps_today,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "active_calories_burned": payload.active_calories_burned,
            "subjective_soreness_1_to_5": user_prof.get("muscle_soreness_rating", 2),
        })

        score = recovery["readiness_score"]
        fatigue = recovery["fatigue_flag"]
        sleep_hrs = round(payload.sleep_minutes / 60.0, 1)
        rhr = payload.resting_heart_rate_bpm or 58

        if fatigue == "high_fatigue" or score < 60:
            headline = "Recovery Required"
            prescribed = "Active Recovery & Mobility (RPE 6 max)"
            briefing = (
                f"Sleep debt is elevated ({sleep_hrs}h recorded) with nervous system strain. "
                f"Today in Mesocycle Week {meso_week}, cap loading at RPE 6-7 and prioritize joint mobility over volume."
            )
        elif score < 75:
            headline = "Steady Readiness"
            prescribed = f"Mesocycle Week {meso_week} Hypertrophy ({target_rir} RIR)"
            briefing = (
                f"Resting HR is steady at {rhr} bpm and recovery baseline is stable. "
                f"Today is Mesocycle Week {meso_week} with a {target_rir} RIR volume target. Fuel with {peri_carbs}g pre-workout carbs before training."
            )
        else:
            headline = "Prime Performance"
            prescribed = f"Mesocycle Week {meso_week} Progressive Overload ({target_rir} RIR)"
            briefing = (
                f"Readiness is primed ({score}%) with {sleep_hrs}h sleep and low cardiovascular strain. "
                f"Cleared for high-intensity progressive overload in Mesocycle Week {meso_week}. Target {peri_carbs}g carbs prior to your main lifts."
            )

        # 3. Persist to MongoDB Atlas for zero-token retrieval across subsequent opens
        briefing_doc = await DailyBriefingDocument.find_one(
            DailyBriefingDocument.user_id == payload.user_id,
            DailyBriefingDocument.date_id == today_str
        )
        if briefing_doc:
            briefing_doc.readiness_score = score
            briefing_doc.fatigue_flag = fatigue
            briefing_doc.sleep_hours = sleep_hrs
            briefing_doc.steps_today = payload.steps_today
            briefing_doc.resting_heart_rate_bpm = rhr
            briefing_doc.headline = headline
            briefing_doc.briefing_text = briefing
            briefing_doc.prescribed_workout = prescribed
            briefing_doc.peri_workout_carbs_g = peri_carbs
            briefing_doc.target_rir = target_rir
            briefing_doc.mesocycle_week = meso_week
            briefing_doc.created_at = datetime.utcnow()
            await briefing_doc.save()
        else:
            briefing_doc = DailyBriefingDocument(
                user_id=payload.user_id,
                date_id=today_str,
                readiness_score=score,
                fatigue_flag=fatigue,
                sleep_hours=sleep_hrs,
                steps_today=payload.steps_today,
                resting_heart_rate_bpm=rhr,
                headline=headline,
                briefing_text=briefing,
                prescribed_workout=prescribed,
                peri_workout_carbs_g=peri_carbs,
                target_rir=target_rir,
                mesocycle_week=meso_week,
            )
            await briefing_doc.insert()

        return AmbientBriefingResponse(
            user_id=payload.user_id,
            date_id=today_str,
            readiness_score=score,
            fatigue_flag=fatigue,
            sleep_hours=sleep_hrs,
            steps_today=payload.steps_today,
            resting_heart_rate_bpm=rhr,
            headline=headline,
            briefing_text=briefing,
            prescribed_workout=prescribed,
            peri_workout_carbs_g=peri_carbs,
            target_rir=target_rir,
            mesocycle_week=meso_week,
            cached=False,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class AmbientCardRequest(BaseModel):
    user_id: str = "guest_athlete"
    steps_today: int = 0
    sleep_minutes: int = 420
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0
    user_profile: Optional[dict] = Field(default_factory=dict)
    daily_log: Optional[dict] = Field(default_factory=dict)


class AmbientCardResponse(BaseModel):
    readiness_score: int
    fatigue_flag: str
    sleep_hours: float
    steps_today: int
    resting_heart_rate_bpm: int
    active_calories_burned: int
    headline: str
    prescribed_workout: str
    recovery_guidance: str
    action_items: List[str]
    guardrail_status: Dict[str, Any]


@router.post("/ambient", response_model=AmbientCardResponse)
def generate_ambient_card(payload: AmbientCardRequest):
    """
    Computes real-time recovery status and generates structured card content
    for the mobile AmbientCompanionCard component.
    """
    try:
        # 1. Compute deterministic biometrics
        recovery = evaluate_readiness.invoke({
            "sleep_minutes": payload.sleep_minutes,
            "steps": payload.steps_today,
            "resting_heart_rate_bpm": payload.resting_heart_rate_bpm,
            "active_calories_burned": payload.active_calories_burned,
        })
        score = recovery["readiness_score"]
        fatigue = recovery["fatigue_flag"]
        sleep_hrs = round(payload.sleep_minutes / 60.0, 1)

        # 2. Derive headline and recommendation based on physiological state
        if fatigue == "high_fatigue" or score < 60:
            headline = "Recovery Required"
            prescribed = "Active Recovery & Mobility (RPE 6 max)"
            guidance = "Nervous system recovery is depressed. Reduce volume by 1-2 sets and avoid failure sets."
            actions = ["Cap intensity at RPE 6-7", "Hydrate + 500ml electrolytes", "Aim for 8+ hours sleep tonight"]
        elif score < 75:
            headline = "Moderate Readiness"
            prescribed = "Technique & Volume Hypertrophy (RPE 7-8)"
            guidance = "Energy is steady. Train with standard working volume, keeping 2 reps in reserve."
            actions = ["Maintain 2 RIR on compound lifts", "Hit 40g post-workout protein", "Mobility cooldown"]
        else:
            headline = "Prime Performance"
            prescribed = "Progressive Overload / High Intensity (RPE 8-9)"
            guidance = "Optimal recovery detected. Green light for progressive overload or heavy compound lifts."
            actions = ["Attempt target PR or +1 rep on main lift", "Pre-workout hydration", "Maintain explosive bar speed"]

        # Run guardrail check
        guard_result = GuardrailEngine.post_execution_check(
            output_text=f"{prescribed}. {guidance}",
            state={
                "readiness_score": score,
                "fatigue_flag": fatigue,
                "user_profile": payload.user_profile,
            },
            is_production=True
        )

        return AmbientCardResponse(
            readiness_score=score,
            fatigue_flag=fatigue,
            sleep_hours=sleep_hrs,
            steps_today=payload.steps_today,
            resting_heart_rate_bpm=payload.resting_heart_rate_bpm,
            active_calories_burned=payload.active_calories_burned,
            headline=headline,
            prescribed_workout=prescribed,
            recovery_guidance=guidance,
            action_items=actions,
            guardrail_status=guard_result,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workout", response_model=WorkoutPlanSchema)
def generate_workout_card(payload: PlanRequest):
    """Generates structured WorkoutPlanSchema for mobile cards."""
    try:
        plan = workout_agent_structured(payload.model_dump())
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/diet", response_model=DietPlanSchema)
def generate_diet_card(payload: PlanRequest):
    """Generates structured DietPlanSchema for mobile cards."""
    try:
        plan = diet_agent_structured(payload.model_dump())
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sleep", response_model=SleepGoalSchema)
def generate_sleep_card(payload: PlanRequest):
    """Generates structured SleepGoalSchema for mobile cards."""
    try:
        plan = sleep_agent_structured(payload.model_dump())
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
