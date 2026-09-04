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
def evaluate_readiness(sleep_minutes: int, steps: int):
    """Calculates daily recovery and nervous system readiness score (1-100)."""
    # 420 minutes = 7 hours baseline
    sleep_ratio = min(1.0, sleep_minutes / 420.0)
    score = int(sleep_ratio * 80)
    
    if steps > 15000:
        score -= 10  # Significant physical fatigue penalty
        
    fatigue_flag = "high_fatigue" if score < 60 else "nominal"
    return {"readiness_score": score, "fatigue_flag": fatigue_flag}