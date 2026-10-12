"""
FitMatrix — Deterministic Metabolism Engine
-------------------------------------------
Implements the Mifflin-St Jeor BMR equation with Harris-Benedict activity
multipliers to compute exact caloric targets from user anthropometric data.

This replaces the hardcoded 2,400 kcal / 160g protein defaults that previously
leaked into every agent prompt and the mobile MacroCard.

Macro Allocation Logic:
  • Protein: 1.8–2.2 g/kg of body weight depending on fitness goal.
  • Fat:     25–30% of total target calories.
  • Carbs:   Remaining caloric balance.
"""

from typing import Optional
from datetime import datetime
from app.models.documents import UserProfileData, MetabolicTargets


# ─── Activity Multipliers (Harris-Benedict) ────────────────────────────────────

_ACTIVITY_MULTIPLIERS: dict[str, float] = {
    "sedentary":   1.2,    # Little or no exercise, desk job
    "light":       1.375,  # Light exercise 1–3 days/week
    "moderate":    1.55,   # Moderate exercise 3–5 days/week
    "active":      1.725,  # Hard exercise 6–7 days/week
    "very_active": 1.9,    # Very hard exercise + physical job or 2× training
}

# ─── Protein Targets per kg of Body Weight ────────────────────────────────────

_PROTEIN_RATIO: dict[str, float] = {
    "hypertrophy": 1.8,    # g/kg — building muscle at moderate surplus
    "fat_loss":    2.2,    # g/kg — preserve muscle in a deficit
    "strength":    1.8,    # g/kg — powerlifting focus
    "endurance":   1.6,    # g/kg — lower demand, higher carb priority
    "general_fitness": 1.6,
}

_DEFAULT_PROTEIN_RATIO = 1.8   # fallback for unknown goals


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """
    Mifflin-St Jeor BMR Equation (kcal/day).
    Most accurate formula for non-athletic populations.

      Male:   (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
      Female: (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
    """
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age)
    return base + 5.0 if sex.lower() in ("male", "m") else base - 161.0


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Total Daily Energy Expenditure = BMR × activity multiplier.
    Defaults to 'moderate' if the activity level string is unrecognised.
    """
    multiplier = _ACTIVITY_MULTIPLIERS.get(activity_level.lower(), 1.55)
    return round(bmr * multiplier, 1)


def compute_targets(profile: UserProfileData) -> MetabolicTargets:
    """
    Compute deterministic macro targets from a UserProfileData object.

    If anthropometric data is missing (profile is incomplete), returns
    conservative defaults so the app always has a usable number.

    Returns:
        MetabolicTargets — bmr, tdee, target_calories, target_protein_g,
                           target_carbs_g, target_fats_g, computed_at.
    """
    weight = profile.weight_kg
    height = profile.height_cm
    age    = profile.age
    sex    = profile.sex or "male"

    # ── BMR & TDEE ─────────────────────────────────────────────────────────────
    if weight and height and age:
        bmr  = calculate_bmr(weight, height, age, sex)
        tdee = calculate_tdee(bmr, profile.activity_level)
    else:
        # Conservative defaults when profile is still incomplete
        bmr  = 1700.0
        tdee = 2400.0

    # ── Goal-Adjusted Caloric Target ───────────────────────────────────────────
    goal = (profile.fitness_goal or "hypertrophy").lower()
    if goal == "fat_loss":
        # 20% deficit from TDEE
        target_calories = round(tdee * 0.80)
    elif goal in ("hypertrophy", "strength"):
        # 10% surplus
        target_calories = round(tdee * 1.10)
    else:
        # Maintenance for endurance / general fitness
        target_calories = round(tdee)

    # ── Protein Target ─────────────────────────────────────────────────────────
    ratio = _PROTEIN_RATIO.get(goal, _DEFAULT_PROTEIN_RATIO)
    if weight:
        target_protein_g = round(weight * ratio)
    else:
        target_protein_g = 160   # fallback

    protein_kcal = target_protein_g * 4

    # ── Fat Target (25–30% of total calories) ─────────────────────────────────
    fat_pct = 0.25 if goal == "endurance" else 0.28
    fat_kcal = round(target_calories * fat_pct)
    target_fats_g = round(fat_kcal / 9)

    # ── Carbohydrate Target (remaining calories) ───────────────────────────────
    remaining_kcal = target_calories - protein_kcal - fat_kcal
    target_carbs_g = max(0, round(remaining_kcal / 4))

    return MetabolicTargets(
        bmr=round(bmr, 1),
        tdee=round(tdee, 1),
        target_calories=target_calories,
        target_protein_g=target_protein_g,
        target_carbs_g=target_carbs_g,
        target_fats_g=target_fats_g,
        computed_at=datetime.utcnow(),
    )
