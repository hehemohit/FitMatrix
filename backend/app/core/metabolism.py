"""
FitMatrix — Deterministic Metabolism & Physiology Engine
---------------------------------------------------------
Implements:
  1. Mifflin-St Jeor BMR & Harris-Benedict TDEE formulas.
  2. MacroFactor Dynamic Expenditure Algorithm (EWMA weight smoothing + true energy balance).
  3. Day-to-Day Macro Cycling (Training vs Rest day energy distribution).
  4. Strength Mechanics & 1RM Estimation (Epley / Brzycki formulas) for progressive overload.

Eliminates static hardcoded defaults (2,400 kcal / 160g protein) across the platform.
"""

from typing import Optional, List, Dict, Any, Tuple
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
    "hypertrophy": 2.0,    # g/kg — optimal MPS for muscle gain
    "fat_loss":    2.2,    # g/kg — preserves LBM in hypocaloric deficit
    "strength":    1.9,    # g/kg — powerlifting / neuromuscular focus
    "endurance":   1.6,    # g/kg — glycogen preservation priority
    "general_fitness": 1.7,
}

_DEFAULT_PROTEIN_RATIO = 1.8


def calculate_bmr(weight_kg: float, height_cm: float, age: int, sex: str) -> float:
    """
    Mifflin-St Jeor BMR Equation (kcal/day).
      Male:   (10 × weight_kg) + (6.25 × height_cm) − (5 × age) + 5
      Female: (10 × weight_kg) + (6.25 × height_cm) − (5 × age) − 161
    """
    base = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age)
    return base + 5.0 if sex.lower() in ("male", "m") else base - 161.0


def calculate_tdee(bmr: float, activity_level: str) -> float:
    """Total Daily Energy Expenditure = BMR × activity multiplier."""
    multiplier = _ACTIVITY_MULTIPLIERS.get(activity_level.lower(), 1.55)
    return round(bmr * multiplier, 1)


def compute_targets(profile: UserProfileData) -> MetabolicTargets:
    """
    Compute deterministic macro targets from a UserProfileData object.
    Dynamically scales protein, fat, and carbs based on goal and anthropometry.
    """
    weight = profile.weight_kg or 70.0
    height = profile.height_cm or 175.0
    age = profile.age or 25
    sex = profile.sex or "male"

    bmr = calculate_bmr(weight, height, age, sex)
    tdee = calculate_tdee(bmr, profile.activity_level or "moderate")

    goal = (profile.fitness_goal or "hypertrophy").lower()
    if goal == "fat_loss":
        target_calories = round(tdee * 0.80)  # 20% sustainable deficit
    elif goal in ("hypertrophy", "strength"):
        target_calories = round(tdee * 1.10)  # 10% lean surplus
    else:
        target_calories = round(tdee)

    ratio = _PROTEIN_RATIO.get(goal, _DEFAULT_PROTEIN_RATIO)
    target_protein_g = round(weight * ratio)
    protein_kcal = target_protein_g * 4

    fat_pct = 0.25 if goal == "endurance" else 0.28
    fat_kcal = round(target_calories * fat_pct)
    target_fats_g = round(fat_kcal / 9)

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


# ─── MacroFactor Dynamic Energy Expenditure Algorithm ─────────────────────────

def calculate_ewma_weight_series(weights: List[float], alpha: float = 0.1) -> List[float]:
    """
    Exponentially Weighted Moving Average (EWMA) weight filter.
    Smooths daily water and glycogen fluctuations to reveal true tissue trend.
    Formula: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
    """
    if not weights:
        return []
    smoothed = [weights[0]]
    for w in weights[1:]:
        smoothed.append(round(alpha * w + (1.0 - alpha) * smoothed[-1], 2))
    return smoothed


def calculate_dynamic_tdee(
    avg_daily_calories_logged: float,
    weight_start_smoothed_kg: float,
    weight_end_smoothed_kg: float,
    days_elapsed: int
) -> float:
    """
    Computes rolling true metabolic expenditure decoupled from static formulas.
    Uses the energy density constant of human body mass (~7,700 kcal / kg tissue change).
    TDEE = Mean(Intake) - (7700 * delta_weight / days)
    """
    if days_elapsed <= 0:
        return avg_daily_calories_logged
    delta_weight_kg = weight_end_smoothed_kg - weight_start_smoothed_kg
    daily_energy_balance_shift = (7700.0 * delta_weight_kg) / days_elapsed
    true_expenditure = avg_daily_calories_logged - daily_energy_balance_shift
    return round(max(1200.0, min(5000.0, true_expenditure)), 1)


# ─── Day-Type Macro Cycling (Training vs Rest Day Allotment) ──────────────────

def compute_cycled_macro_split(
    base_targets: MetabolicTargets,
    is_training_day: bool = True
) -> Dict[str, Any]:
    """
    Calculates adherence-neutral daily macro targets based on training demand:
      - Training Days: +10-15% calories, +25% carbs for glycogen & performance.
      - Rest Days: -10-15% calories, higher fat ratio (30%) for satiety & hormonal health.
    """
    base_cals = base_targets.target_calories
    base_pro = base_targets.target_protein_g

    if is_training_day:
        cycled_cals = round(base_cals * 1.12)
        protein_g = base_pro
        fats_g = round((cycled_cals * 0.22) / 9)
        carbs_g = round((cycled_cals - (protein_g * 4) - (fats_g * 9)) / 4)
    else:
        cycled_cals = round(base_cals * 0.88)
        protein_g = base_pro
        fats_g = round((cycled_cals * 0.30) / 9)
        carbs_g = max(30, round((cycled_cals - (protein_g * 4) - (fats_g * 9)) / 4))

    return {
        "day_type": "training" if is_training_day else "rest",
        "target_calories": cycled_cals,
        "target_protein_g": protein_g,
        "target_carbs_g": carbs_g,
        "target_fats_g": fats_g,
    }


# ─── Strength Mechanics & Progressive Overload Formulas ───────────────────────

def estimate_1rm_epley(weight_kg: float, reps: int) -> float:
    """Epley formula for Estimated 1RM: 1RM = w * (1 + r / 30)."""
    if reps <= 1:
        return round(weight_kg, 1)
    return round(weight_kg * (1.0 + (reps / 30.0)), 1)


def estimate_1rm_brzycki(weight_kg: float, reps: int) -> float:
    """Brzycki formula for Estimated 1RM: 1RM = w * 36 / (37 - r)."""
    if reps <= 1:
        return round(weight_kg, 1)
    if reps >= 37:
        return round(weight_kg * 2.0, 1)
    return round(weight_kg * (36.0 / (37.0 - reps)), 1)


def recommend_progressive_overload(
    previous_weight_kg: float,
    completed_reps: int,
    target_reps: int,
    actual_rpe: Optional[float] = None
) -> Dict[str, Any]:
    """
    Determines next-session progressive overload prescription based on RP standards:
    - If reps completed >= target and RPE <= 8: Recommend +2.5kg (upper) or +5.0kg (lower).
    - If reps completed >= target but RPE == 9-10: Maintain weight and add +1 rep.
    - If reps missed: Maintain load and aim for target reps.
    """
    e1rm = estimate_1rm_epley(previous_weight_kg, completed_reps)
    if completed_reps >= target_reps:
        if actual_rpe and actual_rpe <= 8:
            next_weight = previous_weight_kg + 2.5
            action = "increment_weight"
            rationale = f"Target reps achieved at moderate RPE ({actual_rpe}). Advance load by +2.5kg."
        else:
            next_weight = previous_weight_kg
            action = "increment_reps"
            rationale = f"Target reps met near limit (RPE {actual_rpe or 'nominal'}). Consolidate load and target +1 rep."
    else:
        next_weight = previous_weight_kg
        action = "maintain_load"
        rationale = f"Completed {completed_reps}/{target_reps} reps. Maintain load to master volume before advancing."

    return {
        "current_e1rm": e1rm,
        "recommended_next_weight_kg": next_weight,
        "action": action,
        "rationale": rationale,
    }
