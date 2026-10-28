"""
FitMatrix Dynamic Prompt & Guardrail Registry (MongoDB Atlas + In-Memory Cache)
-------------------------------------------------------------------------------
Provides real-time dynamic prompt updates and guardrail configuration.
Changes deployed from the evaluation dashboard instantly take effect
for the production mobile application without redeploying code.
"""

import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.models.documents import AgentPromptDocument

logger = logging.getLogger(__name__)

# Default Baselines (fallback if MongoDB is offline or uninitialized)
BASELINE_PROMPTS = {
    "workout_agent": (
        "You are the FitMatrix Head Strength & Conditioning Coach — an elite, knowledgeable, and empathetic human coach.\n"
        "Active Athlete State:\n{state_context}\n\n"
        "Coaching Guidelines:\n"
        "- Tone & Persona: Speak naturally, humanly, and encourage the athlete. Do NOT repeat or recite the athlete's raw readiness score or biometrics unless they specifically ask about their readiness, recovery, or why a session is modified.\n"
        "- Casual Greetings: If the user says 'hi', 'hello', or checks in, greet them warmly, ask what they would like to focus on today (e.g. training, nutrition, or recovery), and keep it friendly and inviting.\n"
        "- Workout Requests: When the athlete asks for a workout (e.g. 'give me a workout for today', 'leg day routine', 'what should I train?'), prescribe a concrete, well-structured workout with exercise names, sets, reps, and target RIR aligned with their goal (e.g. hypertrophy, strength).\n"
        "- Mesocycle & Auto-Regulation:\n"
        "  * If mesocycle.week == 6 or phase == 'deload': recommend a strategic deload (RPE 6-7, 50% working volume sets).\n"
        "  * If fatigue is 'high_fatigue' or readiness < 60: gently explain that CNS recovery is lower today, and recommend auto-regulating volume or swapping heavy spinal loads for submaximal or machine work.\n"
        "  * If joint, spine, or tendon pain is reported: immediately prescribe spine-sparing/joint-friendly alternatives.\n"
        "  * If readiness is optimal (nominal fatigue): prescribe high-yield progressive overload volume.\n"
        "- Communication: Be direct, helpful, and concise, but never artificially truncate necessary workout details or speak like a robotic telemetry readout."
    ),
    "diet_agent": (
        "You are the FitMatrix Lead Sports Nutritionist.\n"
        "Active Athlete State:\n{state_context}\n\n"
        "Nutrition Rules:\n"
        "- Strictly enforce user_profile.dietary_preference:\n"
        "  * If 'pure_vegetarian', exclusively prescribe paneer, lentils/dal, tofu, soya chunks, or plant/dairy vegetarian protein; NEVER prescribe meat, fish, poultry, or eggs.\n"
        "  * If 'jain', strictly avoid all root vegetables (potatoes, onions, garlic, carrots, beetroots) and animal meats/eggs; prescribe moong dal, paneer, and tofu.\n"
        "  * If athlete reports overeating or calorie deviation: apply adherence-neutral coaching (MacroFactor principle). NEVER recommend extreme fasting, starvation, or compensatory restriction. Instruct the athlete to return to their regular daily targets.\n"
        "  * Avoid outdated jargon like 'spike insulin'; focus on total daily protein distribution, essential amino acids, and post-workout glycogen replenishment.\n"
        "  * Explicitly meet the athlete's requested protein grams (e.g. 45g post-workout).\n"
        "- Strictly avoid any items in user_profile.allergies.\n"
        "- Provide direct meal and macro timing recommendations (timing of complex carbs and protein around training/recovery).\n"
        "- Keep response strictly under 3-4 crisp sentences."
    ),
    "sleep_agent": (
        "You are the FitMatrix Sleep Architect — an expert in sleep science and athletic recovery.\n"
        "Generate a personalized nightly sleep protocol as structured JSON.\n"
        "Athlete Data: {biometrics_summary}\n\n"
        "Rules:\n"
        "- Prescribe a target bedtime and wake time that provide 7-9 hours of sleep.\n"
        "- Adjust recovery_score_threshold based on fatigue: 'high_fatigue' -> threshold 75+, 'nominal' -> 65+.\n"
        "- Include 3 actionable wind-down milestones (e.g., blue light cutoff, temperature, breathwork)."
    ),
    "supervisor": (
        "You are the FitMatrix Master Coordinator. Evaluate athlete telemetry and route to:\n"
        "- 'sleep_agent' if biometric readiness is uncalculated or sleep debt is severe.\n"
        "- 'workout_agent' if user asks for workout guidance or daily training prescription.\n"
        "- 'diet_agent' if user asks for nutrition, food logging, or macro balancing.\n"
        "- 'FINISH' when all required specialized guidance turns have concluded."
    ),
    "cards": (
        "You are the FitMatrix Ambient Card Generator. Analyze active athlete biometrics, "
        "recovery score, and daily goals to produce a high-impact, actionable summary card "
        "tailored for mobile glanceability."
    )
}

BASELINE_GUARDRAILS = {
    "workout_agent": {
        "max_rpe_when_fatigued": 7,
        "forbid_failure_sets_when_fatigued": True,
        "max_sentence_count": 12,
    },
    "diet_agent": {
        "strict_allergy_enforcement": True,
        "strict_diet_preference": True,
        "max_sentence_count": 10,
    },
    "cards": {
        "require_action_item": True,
        "max_headline_length": 45,
    }
}

# Cache structure: {role: {"prompt": str, "guardrails": dict, "version": str, "cached_at": float}}
_PROMPT_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 30.0


async def get_prompt(agent_role: str) -> str:
    """Returns the currently active prompt template for an agent role."""
    data = await _get_role_entry(agent_role)
    return data["prompt"]


async def get_guardrails(agent_role: str) -> dict:
    """Returns the currently active runtime guardrail config for an agent role."""
    data = await _get_role_entry(agent_role)
    return data.get("guardrails", {})


def get_prompt_sync(agent_role: str) -> str:
    """Synchronous prompt accessor: checks RAM cache first, falls back to baseline."""
    cached = _PROMPT_CACHE.get(agent_role)
    if cached and cached.get("prompt"):
        return cached["prompt"]
    return BASELINE_PROMPTS.get(agent_role, "")


def get_guardrails_sync(agent_role: str) -> dict:
    """Synchronous guardrail accessor: checks RAM cache first, falls back to baseline."""
    cached = _PROMPT_CACHE.get(agent_role)
    if cached and cached.get("guardrails"):
        return cached["guardrails"]
    return BASELINE_GUARDRAILS.get(agent_role, {})


async def get_active_version(agent_role: str) -> str:
    """Returns the currently active version tag."""
    data = await _get_role_entry(agent_role)
    return data.get("version", "v1_baseline")


async def _get_role_entry(agent_role: str) -> Dict[str, Any]:
    now = time.time()
    cached = _PROMPT_CACHE.get(agent_role)
    if cached and (now - cached["cached_at"] < CACHE_TTL_SECONDS):
        return cached

    # Attempt fetching from MongoDB Atlas if client is connected
    try:
        from app.core.database import _mongo_client
        if _mongo_client is not None:
            doc = await AgentPromptDocument.find_one(AgentPromptDocument.agent_role == agent_role)
            if doc and doc.system_prompt:
                entry = {
                    "prompt": doc.system_prompt,
                    "guardrails": doc.guardrails or BASELINE_GUARDRAILS.get(agent_role, {}),
                    "version": doc.active_version or "v1_production",
                    "cached_at": now,
                }
                _PROMPT_CACHE[agent_role] = entry
                return entry
    except Exception as e:
        logger.warning("MongoDB prompt lookup for '%s' failed (%s), using baseline.", agent_role, e)

    # Fallback to hardcoded baseline
    entry = {
        "prompt": BASELINE_PROMPTS.get(agent_role, ""),
        "guardrails": BASELINE_GUARDRAILS.get(agent_role, {}),
        "version": "v1_baseline",
        "cached_at": now,
    }
    _PROMPT_CACHE[agent_role] = entry
    return entry


async def list_all_prompts() -> list[dict]:
    """Lists all agent prompt configs from MongoDB, or baselines if empty."""
    results = []
    roles = ["workout_agent", "diet_agent", "sleep_agent", "supervisor", "cards"]

    for role in roles:
        entry = await _get_role_entry(role)
        doc = None
        try:
            doc = await AgentPromptDocument.find_one(AgentPromptDocument.agent_role == role)
        except Exception:
            pass

        versions_dict = doc.versions if doc else {"v1_baseline": BASELINE_PROMPTS.get(role, "")}
        results.append({
            "agent_role": role,
            "active_version": entry.get("version", "v1_baseline"),
            "system_prompt": entry.get("prompt", ""),
            "guardrails": entry.get("guardrails", {}),
            "versions": versions_dict,
            "updated_at": doc.updated_at.isoformat() if doc and doc.updated_at else datetime.utcnow().isoformat(),
        })
    return results


async def update_prompt_version(
    agent_role: str,
    version_tag: str,
    prompt_text: str,
    guardrails: Optional[dict] = None,
    promote: bool = False
) -> dict:
    """
    Saves a new prompt version to MongoDB Atlas.
    If promote=True, immediately marks it as the active production prompt.
    """
    now = datetime.utcnow()
    guardrails = guardrails or BASELINE_GUARDRAILS.get(agent_role, {})

    doc = None
    try:
        doc = await AgentPromptDocument.find_one(AgentPromptDocument.agent_role == agent_role)
    except Exception as e:
        logger.warning("Error fetching document for update: %s", e)

    if not doc:
        doc = AgentPromptDocument(
            prompt_id=f"prompt_{agent_role}",
            agent_role=agent_role,
            active_version=version_tag if promote else "v1_baseline",
            system_prompt=prompt_text if promote else BASELINE_PROMPTS.get(agent_role, prompt_text),
            versions={version_tag: prompt_text, "v1_baseline": BASELINE_PROMPTS.get(agent_role, prompt_text)},
            guardrails=guardrails,
            updated_at=now,
        )
        try:
            await doc.insert()
        except Exception as e:
            logger.error("Could not insert new AgentPromptDocument: %s", e)
    else:
        doc.versions[version_tag] = prompt_text
        if guardrails:
            doc.guardrails.update(guardrails)
        if promote:
            doc.active_version = version_tag
            doc.system_prompt = prompt_text
        doc.updated_at = now
        try:
            await doc.save()
        except Exception as e:
            logger.error("Could not update AgentPromptDocument: %s", e)

    # Invalidate local cache
    if agent_role in _PROMPT_CACHE:
        del _PROMPT_CACHE[agent_role]

    return {
        "status": "success",
        "agent_role": agent_role,
        "active_version": doc.active_version,
        "promoted": promote,
        "updated_at": doc.updated_at.isoformat()
    }


async def promote_version(agent_role: str, version_tag: str) -> dict:
    """Promotes an existing version in MongoDB to active production."""
    doc = await AgentPromptDocument.find_one(AgentPromptDocument.agent_role == agent_role)
    if not doc or version_tag not in doc.versions:
        raise ValueError(f"Version '{version_tag}' not found for agent '{agent_role}'")

    doc.active_version = version_tag
    doc.system_prompt = doc.versions[version_tag]
    doc.updated_at = datetime.utcnow()
    await doc.save()

    if agent_role in _PROMPT_CACHE:
        del _PROMPT_CACHE[agent_role]

    return {
        "status": "success",
        "agent_role": agent_role,
        "active_version": version_tag,
        "system_prompt": doc.system_prompt,
    }
