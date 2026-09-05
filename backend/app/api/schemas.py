"""
FitMatrix Agent Output Schemas
-------------------------------
Pydantic models for structured plan generation.
Used by /api/v1/plan/* endpoints and llm.with_structured_output().
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


# ─── Workout Plan ──────────────────────────────────────────────────────────

class Exercise(BaseModel):
    name: str
    sets: int
    reps: str  # e.g. "8", "8-12", "AMRAP"
    rpe: Optional[int] = Field(None, ge=1, le=10, description="Rate of Perceived Exertion")
    rest_seconds: Optional[int] = None
    notes: Optional[str] = None


class WorkoutDay(BaseModel):
    day: str
    target_muscle_groups: List[str]
    exercises: List[Exercise]


class WorkoutPlanSchema(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"wp_{uuid.uuid4().hex[:8]}")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    duration_weeks: int = Field(default=1, ge=1, le=52)
    fitness_goal: str  # e.g. "hypertrophy", "strength", "fat_loss"
    days: List[WorkoutDay]


# ─── Diet Plan ────────────────────────────────────────────────────────────

class MacroSplit(BaseModel):
    protein_g: int
    carbs_g: int
    fats_g: int


class MealWindow(BaseModel):
    time: str  # e.g. "08:00" or "Pre-workout"
    description: str
    protein_g: int
    carbs_g: int
    fats_g: int
    calories: int


class DietPlanSchema(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"dp_{uuid.uuid4().hex[:8]}")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    daily_calories: int
    macro_split: MacroSplit
    dietary_preference: str  # e.g. "pure_vegetarian", "omnivore"
    meals: List[MealWindow]
    hydration_liters: float = Field(default=2.5)


# ─── Sleep Goal ────────────────────────────────────────────────────────────

class SleepGoalSchema(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"sg_{uuid.uuid4().hex[:8]}")
    generated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    target_bedtime: str       # e.g. "22:30"
    target_wake_time: str     # e.g. "06:30"
    target_duration_hours: float
    wind_down_milestones: List[str]
    recovery_score_threshold: int = Field(default=70, ge=0, le=100)


# ─── Plan Request Payload ─────────────────────────────────────────────────

class PlanRequest(BaseModel):
    user_id: str
    steps_today: int = 0
    sleep_minutes: int = 420
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0
    readiness_score: Optional[int] = None
    user_profile: Optional[dict] = {}
    daily_log: Optional[dict] = {}
    context_message: Optional[str] = None  # Optional free-text override
