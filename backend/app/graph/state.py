from typing import Annotated, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
import operator

class FitMatrixState(TypedDict):
    # Appends new messages without overwriting history
    messages: Annotated[List[BaseMessage], operator.add]
    
    # Biometric inputs from mobile Health Connect
    steps_today: int
    sleep_minutes: int
    logged_workouts: List[dict]
    
    # Computed metrics
    readiness_score: int
    fatigue_flag: Optional[str]
    remaining_calories: int
    remaining_protein_g: int
    prescribed_workout: Optional[str]

    # Decoupled Structured State / Entity Profiles
    user_profile: dict  # {"dietary_preference": str, "allergies": List[str], "fitness_goal": str, ...}
    daily_log: dict     # {"meals_logged": List[str], "workouts_completed": List[str], ...}
    current_topic: Optional[str]
    
    # Supervisor routing flag
    next_step: str