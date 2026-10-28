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
from datetime import datetime
from beanie import Document, Indexed
from pydantic import BaseModel, Field
import uuid


# ─── Nested Value Objects (embedded in documents, not their own collections) ───

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
    
    # RP Hypertrophy Mesocycle Progression State
    mesocycle_week: int = 1                 # Week 1 to 6
    mesocycle_phase: str = "accumulation"  # accumulation | intensification | overreaching | deload
    target_rir: int = 3                     # Reps In Reserve: 3 -> 2 -> 1 -> 0 -> 4 (deload)


class MetabolicTargets(BaseModel):
    """Deterministic targets computed from UserProfileData via Mifflin-St Jeor."""
    bmr: float = 0.0           # Basal Metabolic Rate (kcal/day)
    tdee: float = 0.0          # Total Daily Energy Expenditure (kcal/day)
    target_calories: int = 0
    target_protein_g: int = 0
    target_carbs_g: int = 0
    target_fats_g: int = 0
    computed_at: Optional[datetime] = None


class MealEntry(BaseModel):
    """A single logged meal within a nutrition day."""
    meal_id: str = Field(default_factory=lambda: f"m_{uuid.uuid4().hex[:6]}")
    name: str = "Unnamed Meal"
    category: str = "Lunch"    # Breakfast | Lunch | Dinner | Snack | Pre-Workout | Post-Workout
    time: str = "12:00"        # HH:MM (24-hour)
    calories: int = 0
    protein_g: int = 0
    carbs_g: int = 0
    fats_g: int = 0
    logged_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Beanie Document Models (= MongoDB Collections) ───────────────────────────

class UserDocument(Document):
    """
    Collection: users
    One document per user. Holds identity, auth credentials,
    biometrics, and computed metabolic targets.
    """
    user_id: Annotated[str, Indexed(unique=True)]
    email: Optional[str] = None
    hashed_password: Optional[str] = None
    full_name: Optional[str] = "Athlete"
    is_onboarded: bool = False
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
    Compound index on (user_id, date) for fast per-day lookups.
    """
    user_id: Annotated[str, Indexed()]
    date: str                                 # ISO date string: YYYY-MM-DD
    steps: int = 0
    sleep_minutes: int = 0
    resting_heart_rate_bpm: int = 0
    active_calories: int = 0
    scale_weight_kg: Optional[float] = None   # Morning weigh-in from user
    readiness_score: Optional[int] = None     # Cached after computation
    fatigue_flag: Optional[str] = None
    synced_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_metrics"
        indexes = [[("user_id", 1), ("date", -1)]]


class NutritionLogDocument(Document):
    """
    Collection: nutrition_logs
    One document per user per calendar day.
    Stores aggregated daily macro totals + individual MealEntry objects.
    Updated incrementally each time a meal is logged via upsert.
    """
    user_id: Annotated[str, Indexed()]
    date: str                                 # ISO date string: YYYY-MM-DD
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
    payload: the full validated Pydantic schema dumped to a dict.
    """
    plan_id: Annotated[str, Indexed(unique=True)]
    user_id: Annotated[str, Indexed()]
    plan_type: str                            # workout | diet | sleep
    payload: dict                             # Full WorkoutPlanSchema / DietPlanSchema / SleepGoalSchema
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "plan_artifacts"
        indexes = [[("user_id", 1), ("plan_type", 1)]]


class WorkoutItem(BaseModel):
    """A single logged workout within a daily log."""
    workout_id: str = Field(default_factory=lambda: f"w_{uuid.uuid4().hex[:6]}")
    activity_type: str = "Strength Training"
    calories_burned: int = 0
    duration_minutes: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DailyLogDocument(Document):
    """
    Collection: daily_logs
    Unified document per user per calendar day.
    Stores daily totals, embedded meal entries, workouts, and morning weigh-ins.
    Compound unique index on (user_id, date_id) enables lazy initialization
    and fast range lookups for 30-day habits and calendar heatmaps.
    """
    user_id: Annotated[str, Indexed()]
    date_id: Annotated[str, Indexed()]              # YYYY-MM-DD in client's local timezone
    calorie_goal: int = 2400
    protein_goal_g: int = 160
    total_calories_consumed: int = 0
    total_protein_g: int = 0
    total_carbs_g: int = 0
    total_fats_g: int = 0
    total_calories_burned: int = 0
    scale_weight_kg: Optional[float] = None
    meals: List[MealEntry] = Field(default_factory=list)
    workout_logs: List[WorkoutItem] = Field(default_factory=list)
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_logs"
        indexes = [
            [("user_id", 1), ("date_id", 1)],  # Compound index for user + date
        ]


class DayMacroTarget(BaseModel):
    """Macro distribution for a specific day of the week."""
    day: str = "mon"                     # mon | tue | wed | thu | fri | sat | sun
    is_training_day: bool = False
    calories: int = 2400
    protein_g: int = 160
    carbs_g: int = 250
    fats_g: int = 70


class StrategyProfileDocument(Document):
    """
    Collection: strategy_profiles
    Command center configuration for goals, coaching modes, macro programs,
    and metabolic expenditure trends.
    """
    user_id: Annotated[str, Indexed(unique=True)]

    # 1. Goal Configuration
    goal_type: str = "fat_loss"                  # fat_loss | maintenance | muscle_gain
    target_weight_kg: float = 75.0
    starting_weight_kg: float = 82.0
    current_weight_kg: float = 78.4
    weekly_rate_percent: float = -0.75           # % of bodyweight per week (negative for cut)
    weekly_weight_delta_kg: float = -0.55        # derived kg/week
    estimated_completion_date: Optional[str] = None  # YYYY-MM-DD
    weeks_to_goal: Optional[float] = None

    # 2. Coaching Mode
    coaching_mode: str = "coached"               # coached | collaborative | manual
    check_in_day: str = "monday"
    last_check_in_date: Optional[str] = None

    # 3. Macro Program Customization
    diet_style: str = "balanced"                 # balanced | low_carb | keto | high_protein
    protein_preference: str = "moderate"         # low | moderate | high
    use_day_variation: bool = False              # Training Day vs Rest Day cycling
    target_calories: int = 2400
    target_protein_g: int = 160
    target_carbs_g: int = 250
    target_fats_g: int = 70
    schedule_targets: List[DayMacroTarget] = Field(default_factory=list)

    # 4. Expenditure & History
    current_expenditure_tdee: int = 2640
    expenditure_trend_delta: int = 65            # +65 kcal/week
    expenditure_history_14d: List[int] = Field(
        default_factory=lambda: [2520, 2530, 2550, 2570, 2560, 2580, 2600, 2610, 2590, 2620, 2635, 2640, 2645, 2640]
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "strategy_profiles"


class CustomBarcodeDocument(Document):
    """
    Collection: custom_barcodes
    Crowdsourced and user-contributed food barcodes when external
    databases (Open Food Facts) return 404 Not Found.
    """
    barcode: Annotated[str, Indexed(unique=True)]
    product_name: str
    brand: Optional[str] = "Custom Product"
    serving_size: str = "100g"
    serving_size_g: float = 100.0
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int
    image_url: Optional[str] = None
    contributed_by_user_id: Optional[str] = "community"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "custom_barcodes"


# ─── Workout Universe Beanie Documents ─────────────────────────────────────────

class CompletedSetData(BaseModel):
    set_number: int
    type: str = "normal"
    weight: float
    reps: int
    rir: Optional[int] = None
    rpe: Optional[float] = None
    is_completed: bool = True


class CompletedExerciseData(BaseModel):
    exercise_id: str
    name: str
    category: Optional[str] = None
    target: Optional[str] = None
    secondary: List[str] = Field(default_factory=list)
    equipment: Optional[str] = None
    sets: List[CompletedSetData] = Field(default_factory=list)


class WorkoutSessionDocument(Document):
    """
    Collection: workout_sessions
    Full record of completed workouts, volume, sets, and muscle recruitment.
    """
    session_id: Annotated[str, Indexed(unique=True)]
    user_id: Annotated[str, Indexed()]
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
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "workout_sessions"
        indexes = [
            [("user_id", 1), ("completed_at", -1)],
        ]


class GymCheckInDocument(Document):
    """
    Collection: gym_check_ins
    History of physical gym attendance records and duration.
    """
    check_in_id: Annotated[str, Indexed(unique=True)]
    user_id: Annotated[str, Indexed()]
    gym_name: str
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    date: str                                   # YYYY-MM-DD
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "gym_check_ins"
        indexes = [
            [("user_id", 1), ("date", -1)],
        ]


class RoutineScheduleItemData(BaseModel):
    id: str
    name: str
    exercise_count: int = 4
    exercise_ids: List[str] = Field(default_factory=list)
    icon_type: str = "push"


class DayScheduleData(BaseModel):
    day_name: str
    is_rest: bool = False
    routines: List[RoutineScheduleItemData] = Field(default_factory=list)


class WeeklyScheduleDocument(Document):
    """
    Collection: weekly_schedules
    User's active 7-day Monday to Sunday workout schedule.
    """
    user_id: Annotated[str, Indexed(unique=True)]
    schedule: List[DayScheduleData] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "weekly_schedules"


class AgentPromptDocument(Document):
    """
    Collection: agent_prompts
    Dynamic system prompts, persona settings, and guardrail rules for FitMatrix agents.
    Allows runtime prompt tuning and promotion directly to production mobile apps.
    """
    prompt_id: Annotated[str, Indexed(unique=True)]  # e.g. "workout_agent", "diet_agent", "supervisor", "cards"
    agent_role: str                                  # "workout_agent" | "diet_agent" | "supervisor" | "cards"
    active_version: str = "v1_baseline"              # e.g. "v1_baseline", "v2_autoregulation"
    system_prompt: str                               # The active system prompt template
    versions: dict = Field(default_factory=dict)     # version_tag -> prompt string
    guardrails: dict = Field(default_factory=dict)   # e.g. {"max_rpe_when_fatigued": 7, "enforce_veg": True}
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "agent_prompts"
        indexes = [[("agent_role", 1)]]


class EvalCaseTrace(BaseModel):
    test_case_id: str
    scenario_name: str
    input_message: str
    biometrics_summary: dict = Field(default_factory=dict)
    routing_path: List[str] = Field(default_factory=list)
    tool_calls: List[dict] = Field(default_factory=list)
    deterministic_passed: bool = True
    deterministic_checks: dict = Field(default_factory=dict)
    llm_judge_score: float = 5.0
    llm_judge_rubric: dict = Field(default_factory=dict)
    llm_judge_reasoning: str = ""
    latency_ms: int = 0
    token_usage: dict = Field(default_factory=dict)
    final_reply: str = ""
    card_artifact: Optional[dict] = None


class EvalRunDocument(Document):
    """
    Collection: eval_runs
    Persists evaluation run results, step traces, scores, and model comparisons.
    """
    run_id: Annotated[str, Indexed(unique=True)]
    model_name: str
    prompt_version: str
    status: str = "completed"                        # "running" | "completed" | "failed"
    total_cases: int = 0
    passed_cases: int = 0
    pass_rate: float = 0.0
    avg_latency_ms: float = 0.0
    total_cost_usd: float = 0.0
    avg_judge_score: float = 0.0
    cases: List[EvalCaseTrace] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "eval_runs"
        indexes = [[("created_at", -1)], [("model_name", 1)]]


class ChatMessageEntry(BaseModel):
    role: str  # "user" | "coach" | "system"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatSessionDocument(Document):
    """
    Collection: chat_sessions
    Provides durable, low-latency hybrid session memory keyed by user_id and session_id.
    Persists across server restarts and provides bounded sliding-window retrieval.
    """
    session_id: Annotated[str, Indexed(unique=True)]
    user_id: Annotated[str, Indexed()]
    messages: List[ChatMessageEntry] = Field(default_factory=list)
    current_topic: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_sessions"
        indexes = [[("user_id", 1), ("updated_at", -1)]]


class DailyBriefingDocument(Document):
    """
    Collection: daily_briefings
    Persists once-per-day ambient physiological briefings for athletes,
    preventing duplicate LLM syntheses on repeat screen mounts.
    """
    user_id: Annotated[str, Indexed()]
    date_id: Annotated[str, Indexed()]  # YYYY-MM-DD
    readiness_score: int
    fatigue_flag: str
    sleep_hours: float
    steps_today: int
    resting_heart_rate_bpm: int
    headline: str
    briefing_text: str
    prescribed_workout: str
    peri_workout_carbs_g: int = 35
    target_rir: int = 2
    mesocycle_week: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_briefings"
        indexes = [[("user_id", 1), ("date_id", 1)]]


class MealParseCacheDocument(Document):
    """
    Collection: meal_parse_cache
    Stores exact normalized text hashes to macro estimates,
    allowing 80% of common meals to return in < 10ms with 0 tokens.
    """
    normalized_query: Annotated[str, Indexed(unique=True)]
    name: str
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int
    serving_size: str = "1 serving"
    allergen_flags: List[str] = Field(default_factory=list)
    dietary_flags: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "meal_parse_cache"






