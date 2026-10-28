from langchain_core.tools import tool
from typing import Optional

@tool
def calculate_remaining_macros(
    consumed_calories: int,
    consumed_protein: int,
    target_calories: int,
    target_protein: int
):
    """
    Calculates remaining calories and protein targets dynamically from the athlete's
    active metabolic profile. Eliminates hardcoded defaults completely.
    """
    remaining_cal = max(0, target_calories - consumed_calories)
    remaining_pro = max(0, target_protein - consumed_protein)
    return {
        "remaining_calories": remaining_cal,
        "remaining_protein_g": remaining_pro,
        "consumed_calories": consumed_calories,
        "consumed_protein_g": consumed_protein,
        "target_calories": target_calories,
        "target_protein_g": target_protein,
    }

@tool
def evaluate_readiness(
    sleep_minutes: int,
    steps: int = 0,
    resting_heart_rate_bpm: int = 0,
    active_calories_burned: int = 0,
    muscle_soreness_rating: int = 1,
    baseline_sleep_need_minutes: int = 480
):
    """
    Calculates daily recovery and central nervous system readiness score (1-100)
    using a multi-pillar physiological model:
      1. Sleep Duration & Sleep Debt relative to athlete baseline (up to 40 pts)
      2. Resting Heart Rate autonomic tone (up to 25 pts)
      3. Subjective Muscle Soreness / DOMS rating 1-5 (up to 20 pts)
      4. Daily Physical Activity / Cardiovascular Strain balance (up to 15 pts)
    """
    # 1. Sleep score & Sleep Debt component (up to 40 pts)
    sleep_debt = max(0, baseline_sleep_need_minutes - sleep_minutes)
    if sleep_minutes <= 0:
        sleep_pts = 10
    elif sleep_minutes < 360:  # < 6 hrs: acute deficit
        sleep_pts = max(8, int((sleep_minutes / 360.0) * 25))
    elif sleep_minutes <= baseline_sleep_need_minutes + 30:  # optimal recovery
        sleep_pts = 28 + int(((sleep_minutes - 360) / max(1, baseline_sleep_need_minutes - 360)) * 12)
    else:  # > 9 hrs
        sleep_pts = 38

    if sleep_debt > 120:
        sleep_pts = max(5, sleep_pts - 8)

    # 2. Resting Heart Rate score component (up to 25 pts)
    if resting_heart_rate_bpm <= 0:
        rhr_pts = 18  # neutral baseline when sensor is absent
    elif resting_heart_rate_bpm < 58:
        rhr_pts = 25
    elif resting_heart_rate_bpm <= 68:
        rhr_pts = 21
    elif resting_heart_rate_bpm <= 78:
        rhr_pts = 14
    else:
        rhr_pts = 7

    # 3. Subjective Muscle Soreness / DOMS component (up to 20 pts)
    # Scale: 1 = Fresh, 2 = Mild, 3 = Moderate, 4 = Heavy, 5 = Trashed / Severely Impaired
    soreness_pts = max(2, 20 - (max(1, min(5, muscle_soreness_rating)) - 1) * 4)

    # 4. Activity balance score component (up to 15 pts)
    if steps < 2500:
        activity_pts = 10
    elif steps <= 12000:
        activity_pts = 15  # optimal activity range
    elif steps <= 16000:
        activity_pts = 11  # elevated strain
    else:
        activity_pts = 6   # acute fatigue from excessive volume

    # Cumulative score calculation
    score = sleep_pts + rhr_pts + soreness_pts + activity_pts
    if active_calories_burned > 800 and sleep_minutes < 400:
        score -= 8  # energy deficit + sleep debt fatigue deduction

    score = max(20, min(99, score))
    fatigue_flag = "high_fatigue" if score < 60 else "nominal"
    return {
        "readiness_score": score,
        "fatigue_flag": fatigue_flag,
        "pillars": {
            "sleep_pts": sleep_pts,
            "rhr_pts": rhr_pts,
            "soreness_pts": soreness_pts,
            "activity_pts": activity_pts,
        }
    }
