"""
FitMatrix — Beanie Document Models (MongoDB Atlas)
---------------------------------------------------
Each class maps directly to a MongoDB collection.
Using Beanie (async ODM over Pydantic v2 + Motor), documents are fully
typed via Pydantic and require zero serialization boilerplate.

Collections:
  • users             — User identity, profile, and computed metabolic targets
  • daily_metrics     — Per-day biometric snapshot from Health Connect + weigh-ins
  • nutrition_logs    — Per-day cumulative food intake + individual meal entries
  • plan_artifacts    — Structured workout / diet / sleep plans from Plan Studio
"""

from typing import List, Optional, Annotated
from datetime import datetime, date
from beanie import Document, Indexed
from pydantic import BaseModel, Field
import uuid


# ─── Nested Value Objects (not collections, embedded in documents) ─────────────

class UserProfileData(BaseModel):
    """Anthropometric and preference data set by the user in ProfileScreen."""
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    sex: str = "male"                       # "male" | "female"
    activity_level: str = "moderate"        # sedentary | light | moderate | active | very_active
    fitness_goal: str = "hypertrophy"       # hypertrophy | fat_loss | strength | endurance
    dietary_preference: str = "omnivore"    # omnivore | vegetarian | pure_vegetarian | vegan | keto | jain
    allergies: List[str] = Field(default_factory=list)


class MetabolicTargets(BaseModel):
    """Deterministic targets computed from UserProfileData via Mifflin-St Jeor."""
    bmr: float = 0.0          # Basal Metabolic Rate (kcal/day)
    tdee: float = 0.0         # Total Daily Energy Expenditure (kcal/day)
    target_calories: int = 2400
    target_protein_g: int = 160
    target_carbs_g: int = 250
    target_fats_g: int = 70
    computed_at: Optional[datetime] = None


class MealEntry(BaseModel):
    """A single logged meal within a nutrition day."""
    meal_id: str = Field(default_factory=lambda: f"m_{uuid.uuid4().hex[:6]}")
    name: str = "Unnamed Meal"
    category: str = "Lunch"   # Breakfast | Lunch | Dinner | Snack | Pre-Workout | Post-Workout
    time: str = "12:00"       # HH:MM
    calories: int = 0
    protein_g: int = 0
    carbs_g: int = 0
    fats_g: int = 0
    logged_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Beanie Document Models (= MongoDB Collections) ───────────────────────────

class UserDocument(Document):
    """
    Collection: users
    One document per user. Holds the full profile and pre-computed metabolic targets.
    user_id matches the mobile client's usr_dev_1 identifier.
    """
    user_id: Annotated[str, Indexed(unique=True)]
    profile: UserProfileData = Field(default_factory=UserProfileData)
    targets: MetabolicTargets = Field(default_factory=MetabolicTargets)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"


class DailyMetricDocument(Document):
    """
    Collection: daily_metrics
    One document per user per calendar day.
    Stores Health Connect biometrics + optional morning weigh-in.
    Compound index on (user_id, date) for fast per-day queries.
    """
    user_id: Annotated[str, Indexed()]
    date: str                             # ISO format YYYY-MM-DD
    steps: int = 0
    sleep_minutes: int = 0
    resting_heart_rate_bpm: int = 0
    active_calories: int = 0
    scale_weight_kg: Optional[float] = None   # morning weigh-in from user
    readiness_score: Optional[int] = None      # cached after computation
    fatigue_flag: Optional[str] = None
    synced_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_metrics"
        indexes = [[("user_id", 1), ("date", -1)]]


class NutritionLogDocument(Document):
    """
    Collection: nutrition_logs
    One document per user per calendar day.
    Stores the aggregated daily macro totals + all individual MealEntry objects.
    Updated incrementally each time a meal is logged (upsert pattern).
    """
    user_id: Annotated[str, Indexed()]
    date: str                             # ISO format YYYY-MM-DD
    total_calories: int = 0
    total_protein_g: int = 0
    total_carbs_g: int = 0
    total_fats_g: int = 0
    meals: List[MealEntry] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "nutrition_logs"
        indexes = [[("user_id", 1), ("date", -1)]]


class PlanArtifactDocument(Document):
    """
    Collection: plan_artifacts
    Stores the most recent structured plan of each type per user.
    plan_type: 'workout' | 'diet' | 'sleep'
    payload: the full validated Pydantic schema dumped to dict.
    """
    plan_id: Annotated[str, Indexed(unique=True)]
    user_id: Annotated[str, Indexed()]
    plan_type: str                        # workout | diet | sleep
    payload: dict                         # raw WorkoutPlanSchema / DietPlanSchema / SleepGoalSchema
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "plan_artifacts"
        indexes = [[("user_id", 1), ("plan_type", 1)]]
