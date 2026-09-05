from langchain_core.tools import tool

@tool
def calculate_remaining_macros(consumed_calories: int, consumed_protein: int, target_calories: int = 2400, target_protein: int = 160):
    """Calculates remaining calories and protein targets for the day."""
    remaining_cal = max(0, target_calories - consumed_calories)
    remaining_pro = max(0, target_protein - consumed_protein)
    return {
        "remaining_calories": remaining_cal,
        "remaining_protein_g": remaining_pro
    }

@tool
def evaluate_readiness(
    sleep_minutes: int,
    steps: int = 0,
    resting_heart_rate_bpm: int = 0,
    active_calories_burned: int = 0
):
    """Calculates daily recovery and nervous system readiness score (1-100)."""
    # 1. Sleep score component (up to 50 pts) - optimal is 420-510 min (7-8.5 hrs)
    if sleep_minutes <= 0:
        sleep_pts = 25
    elif sleep_minutes < 360:  # < 6 hrs
        sleep_pts = max(10, int((sleep_minutes / 360.0) * 35))
    elif sleep_minutes <= 510:  # 6-8.5 hrs
        sleep_pts = 35 + int(((sleep_minutes - 360) / 150.0) * 15)
    else:  # > 8.5 hrs
        sleep_pts = 46

    # 2. Resting Heart Rate score component (up to 30 pts)
    if resting_heart_rate_bpm <= 0:
        rhr_pts = 22  # neutral baseline when sensor is absent
    elif resting_heart_rate_bpm < 58:
        rhr_pts = 30
    elif resting_heart_rate_bpm <= 68:
        rhr_pts = 26
    elif resting_heart_rate_bpm <= 78:
        rhr_pts = 18
    else:
        rhr_pts = 10

    # 3. Activity balance score component (up to 20 pts)
    if steps < 2500:
        activity_pts = 14  # low activity
    elif steps <= 12000:
        activity_pts = 20  # optimal activity range
    elif steps <= 16000:
        activity_pts = 16  # moderate strain
    else:
        activity_pts = 8   # acute fatigue from excessive volume

    # Cumulative score calculation
    score = sleep_pts + rhr_pts + activity_pts
    if active_calories_burned > 800 and sleep_minutes < 400:
        score -= 8  # energy deficit + sleep debt fatigue deduction

    score = max(20, min(99, score))
    fatigue_flag = "high_fatigue" if score < 60 else "nominal"
    return {"readiness_score": score, "fatigue_flag": fatigue_flag}