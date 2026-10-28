"""
FitMatrix Shared Runtime Protection & Guardrail Engine
------------------------------------------------------
Enforces pre-execution safety and post-execution auto-regulation.
Used in both production (/api/v1/chat, /api/v1/plan/*) and evaluation benchmarks.
"""

import re
import logging
from typing import Dict, Any, Optional, Tuple
from app.api.schemas import WorkoutPlanSchema, DietPlanSchema, SleepGoalSchema

logger = logging.getLogger(__name__)

# Medical emergency triggers requiring immediate refusal of exercise
EMERGENCY_TRIGGERS = [
    "chest pain", "heart palpitation", "palpitations", "shortness of breath",
    "fainted", "passed out", "dizziness and blacking out", "broken bone",
    "fracture", "severe sharp pain", "vomiting blood", "concussion",
]

# Non-vegetarian food terms
NON_VEG_TERMS = [
    r"\bchicken\b", r"\bbeef\b", r"\bpork\b", r"\bturkey\b", r"\bfish\b",
    r"\bsalmon\b", r"\btuna\b", r"\bsteak\b", r"\bbacon\b", r"\bshrimp\b",
    r"\bmutton\b", r"\blamb\b", r"\bham\b", r"\bpoultry\b"
]


class GuardrailEngine:
    """Evaluates and enforces active guardrails on agent inputs and outputs."""

    @staticmethod
    def pre_execution_check(user_message: str, state: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Runs before LangGraph execution.
        Returns: (passed: bool, message: Optional[str])
        """
        # 1. Acute clinical red flag detection
        lower_msg = user_message.lower()
        for trigger in EMERGENCY_TRIGGERS:
            if trigger in lower_msg:
                alert = (
                    "[SAFETY ALERT] FitMatrix Medical Warning: We detected potential acute medical distress "
                    f"('{trigger}'). Do NOT proceed with any training. "
                    "Please rest immediately and seek medical evaluation from a healthcare professional."
                )
                return False, alert

        # 2. Biometric sanity validation
        sleep_min = state.get("sleep_minutes", 0)
        steps = state.get("steps_today", 0)
        rhr = state.get("resting_heart_rate_bpm", 0)

        if sleep_min < 0 or sleep_min > 1440:
            return False, "Invalid sleep duration: must be between 0 and 1440 minutes."
        if steps < 0 or steps > 120_000:
            return False, "Invalid steps telemetry: must be positive and under 120,000."
        if rhr < 0 or (rhr > 0 and (rhr < 30 or rhr > 220)):
            return False, "Invalid resting heart rate: expected between 30 and 220 bpm."

        return True, None

    @staticmethod
    def post_execution_check(
        output_text: str,
        state: Dict[str, Any],
        guardrail_config: Optional[Dict[str, Any]] = None,
        is_production: bool = False
    ) -> Dict[str, Any]:
        """
        Runs after agent generates output.
        Checks:
          - Auto-regulation compliance (RPE caps during high fatigue)
          - Dietary restriction compliance
          - Conciseness / sentence limit
        """
        guardrail_config = guardrail_config or {}
        fatigue = state.get("fatigue_flag")
        readiness = state.get("readiness_score", 100)
        user_profile = state.get("user_profile", {}) or {}
        diet_pref = (user_profile.get("dietary_preference") or "").lower()

        checks = {
            "autoregulation_passed": True,
            "dietary_compliance_passed": True,
            "sentence_length_passed": True,
            "violations": []
        }

        # 1. Auto-regulation check
        is_fatigued = fatigue == "high_fatigue" or (readiness and readiness < 60)
        if is_fatigued:
            lower_out = output_text.lower()
            # Look for dangerous failure-set or high RPE prescription
            high_intensity_indicators = ["rpe 9", "rpe 10", "to failure", "till failure", "pr attempt", "1rm", "max effort"]
            for indicator in high_intensity_indicators:
                if indicator in lower_out:
                    checks["autoregulation_passed"] = False
                    checks["violations"].append(f"Prescribed high-intensity term '{indicator}' despite high athlete fatigue.")

        # 2. Dietary preference enforcement
        if diet_pref in ["pure_vegetarian", "pure_veg", "vegetarian", "vegan", "jain"]:
            for term in NON_VEG_TERMS:
                if re.search(term, output_text, re.IGNORECASE):
                    checks["dietary_compliance_passed"] = False
                    checks["violations"].append(f"Non-compliant dietary recommendation: mentioned '{term.strip(chr(92) + 'b')}' for {diet_pref} user.")
                    break

        # 3. Conciseness check
        sentence_count = len([s for s in re.split(r"[.!?]+", output_text) if s.strip()])
        max_sentences = guardrail_config.get("max_sentence_count", 4)
        if sentence_count > max_sentences + 2:  # allow 1-2 buffer
            checks["sentence_length_passed"] = False
            checks["violations"].append(f"Output has {sentence_count} sentences, exceeding limit of {max_sentences}.")

        all_passed = checks["autoregulation_passed"] and checks["dietary_compliance_passed"]
        checks["all_passed"] = all_passed

        # If in production mode and autoregulation failed, append safety auto-correction
        corrected_output = output_text
        if is_production and not checks["autoregulation_passed"]:
            corrected_output += "\n\n[AUTO-REGULATION] Override: Readiness is low. Cap all sets at RPE 6-7 and prioritize submaximal recovery form."

        checks["sanitized_output"] = corrected_output
        return checks

    @staticmethod
    def validate_card_schema(card_type: str, card_payload: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Validates structured card outputs against official Pydantic models."""
        try:
            if card_type == "workout":
                WorkoutPlanSchema.model_validate(card_payload)
            elif card_type == "diet":
                DietPlanSchema.model_validate(card_payload)
            elif card_type == "sleep":
                SleepGoalSchema.model_validate(card_payload)
            return True, None
        except Exception as e:
            return False, str(e)
