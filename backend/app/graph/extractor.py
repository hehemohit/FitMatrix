"""
Entity and State Extractor — FitMatrix
--------------------------------------
Decouples persistent user state (dietary restrictions, fitness goals, daily logs)
from raw conversational history. Runs deterministically in <1ms without LLM latency
or token overhead, preventing context loss and O(N^2) token bloat.
"""

import re
from typing import Tuple, Dict, Any, List


# Patterns for dietary preferences
_DIETARY_PATTERNS = [
    (r"\b(pure\s*veg|pure\s*vegetarian)\b", "pure_vegetarian"),
    (r"\b(vegan)\b", "vegan"),
    (r"\b(jain)\b", "jain"),
    (r"\b(vegetarian|veg)\b", "vegetarian"),
    (r"\b(eggetarian|egg\s*only)\b", "eggetarian"),
    (r"\b(keto|ketogenic)\b", "keto"),
    (r"\b(non\s*veg|non-veg|meat\s*eater|omnivore)\b", "omnivore"),
]

# Patterns for fitness goals
_GOAL_PATTERNS = [
    (r"\b(hypertrophy|build\s*muscle|muscle\s*gain|bulk|bulking)\b", "hypertrophy"),
    (r"\b(fat\s*loss|weight\s*loss|lose\s*weight|cut|cutting|shred)\b", "fat_loss"),
    (r"\b(strength|get\s*strong|powerlifting)\b", "strength"),
    (r"\b(endurance|stamina|cardio\s*focus|marathon)\b", "endurance"),
]

# Common food & workout keywords for topic tagging
_DIET_TOPIC_KEYWORDS = {
    "diet", "meal", "nutrition", "eat", "eating", "food", "protein", "calorie",
    "calories", "macro", "macros", "carb", "carbs", "fat", "fats", "supplement",
    "snack", "lunch", "dinner", "breakfast", "pre-workout", "post-workout",
    "fueling", "veg", "vegetarian", "vegan", "paneer", "tofu", "dairy", "meat",
    "chicken", "fish", "eggs", "keto", "fasting", "water", "hydration", "recipe",
}

_WORKOUT_TOPIC_KEYWORDS = {
    "workout", "exercise", "training", "lift", "lifting", "gym", "cardio",
    "run", "running", "sets", "reps", "routine", "split", "squat", "bench",
    "deadlift", "push", "pull", "legs", "drills", "conditioning", "strength",
    "deload", "stretch", "stretching", "mobility", "sore", "soreness",
}


def extract_and_update_state(
    user_text: str,
    current_profile: Dict[str, Any],
    current_log: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """
    Extracts entities (diet preferences, goals, logs) from user text and updates
    the structured profile and daily log objects.
    
    Returns:
        (updated_profile, updated_log, current_topic)
    """
    text = user_text.lower().strip()
    profile = dict(current_profile or {})
    log = dict(current_log or {})

    # Ensure base collections exist
    profile.setdefault("allergies", [])
    log.setdefault("meals_logged", [])
    log.setdefault("workouts_completed", [])

    # 1. Extract Dietary Preference
    for pattern, preference_value in _DIETARY_PATTERNS:
        if re.search(pattern, text):
            profile["dietary_preference"] = preference_value
            break

    # 2. Extract Fitness Goals
    for pattern, goal_value in _GOAL_PATTERNS:
        if re.search(pattern, text):
            profile["fitness_goal"] = goal_value
            break

    # 3. Extract Allergy / Intolerance Mentions
    allergy_match = re.search(r"(?:allergic\s+to|allergy\s+to|intolerant\s+to)\s+([a-zA-Z\s]+)", text)
    if allergy_match:
        detected = allergy_match.group(1).strip()
        # Clean trailing filler words
        detected = re.split(r"\b(and|or|but|so|please)\b", detected)[0].strip()
        if detected and detected not in profile["allergies"]:
            profile["allergies"].append(detected)

    # 4. Extract Logged Meals (e.g. "I ate 100g paneer", "had 2 rotis and dal")
    meal_log_match = re.search(r"(?:i\s+ate|i\s+had|logged\s+meal|consumed)\s+(.+)", text)
    if meal_log_match:
        meal_desc = meal_log_match.group(1).strip()
        meal_desc = re.split(r"[.!?]", meal_desc)[0].strip()
        if meal_desc and meal_desc not in log["meals_logged"]:
            log["meals_logged"].append(meal_desc)

    # 5. Extract Logged Workouts (e.g. "completed 3 sets pullups", "did 5km run")
    workout_log_match = re.search(r"(?:completed|i\s+did|logged\s+workout)\s+(.+)", text)
    if workout_log_match:
        w_desc = workout_log_match.group(1).strip()
        w_desc = re.split(r"[.!?]", w_desc)[0].strip()
        if w_desc and w_desc not in log["workouts_completed"]:
            log["workouts_completed"].append(w_desc)

    # 6. Determine Topic
    has_diet = any(kw in text for kw in _DIET_TOPIC_KEYWORDS)
    has_workout = any(kw in text for kw in _WORKOUT_TOPIC_KEYWORDS)

    if has_diet and has_workout:
        current_topic = "combined"
    elif has_diet:
        current_topic = "diet_planning"
    elif has_workout:
        current_topic = "workout_planning"
    else:
        current_topic = "general"

    return profile, log, current_topic
