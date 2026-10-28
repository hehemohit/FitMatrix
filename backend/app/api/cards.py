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
from app.api.schemas import PlanRequest, WorkoutPlanSchema, DietPlanSchema, SleepGoalSchema
from app.agents.workout_agent import workout_agent_structured
from app.agents.diet_agent import diet_agent_structured
from app.agents.sleep_agent import sleep_agent_structured
from app.tools.fitness_tools import evaluate_readiness
from app.harness.guardrails import GuardrailEngine
from app.harness.prompt_manager import get_prompt_sync

router = APIRouter(prefix="/api/v1/cards", tags=["cards"])


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
