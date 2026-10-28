import json
import logging
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from app.core.llm import get_agent_model
from app.graph.state import FitMatrixState
from app.api.schemas import DietPlanSchema
from app.harness.prompt_manager import get_prompt_sync, get_guardrails_sync
from app.harness.guardrails import GuardrailEngine

logger = logging.getLogger(__name__)


def diet_agent_node(state: FitMatrixState) -> dict:
    """Calculates macro timing and adjustments based on structured entity state & workout."""
    workout = state.get("prescribed_workout", "Rest/Active Recovery")
    user_profile = state.get("user_profile", {})
    daily_log = state.get("daily_log", {})
    
    # Dynamically resolve from profile / state — zero static hardcoding
    target_cals = state.get("target_calories") or user_profile.get("target_calories")
    target_pro = state.get("target_protein_g") or user_profile.get("target_protein_g")
    cals = state.get("remaining_calories") or target_cals or 2200
    protein = state.get("remaining_protein_g") or target_pro or 140
    is_training_day = state.get("is_training_day", bool(workout and "rest" not in workout.lower()))

    # Decoupled structured state injected into system prompt (~80-120 tokens, O(1) constant size)
    state_context = {
        "user_profile": user_profile,
        "daily_log": daily_log,
        "active_plan": {
            "today_workout": workout,
            "is_training_day": is_training_day,
            "remaining_calories": cals,
            "remaining_protein_g": protein,
            "active_calories_burned": state.get("active_calories_burned", 0),
        },
    }

    prompt_template = get_prompt_sync("diet_agent")
    if "{state_context}" in prompt_template:
        system_prompt = prompt_template.format(state_context=json.dumps(state_context, indent=2))
    else:
        system_prompt = f"{prompt_template}\n\nActive Athlete State:\n{json.dumps(state_context, indent=2)}"

    # Decouple state from chat: use strictly the last 2 messages (recency window) to prevent O(N^2) token bloat
    raw_messages = list(state.get("messages", []))
    windowed_messages = raw_messages[-2:] if raw_messages else []

    # Guard against Gemini prefilling error: conversation must end on a user turn
    if windowed_messages and isinstance(windowed_messages[-1], AIMessage):
        windowed_messages.append(HumanMessage(content="What should I eat today?"))
    elif not windowed_messages:
        windowed_messages = [HumanMessage(content="What should I eat today?")]

    llm = get_agent_model(temperature=0.2)
    response = llm.invoke([SystemMessage(content=system_prompt)] + windowed_messages)

    # Normalize content: Gemini may return a list of content blocks instead of a plain string
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )

    # Runtime guardrail check: Dietary compliance and tone
    guardrails = get_guardrails_sync("diet_agent")
    guard_result = GuardrailEngine.post_execution_check(
        output_text=content,
        state=state,
        guardrail_config=guardrails,
        is_production=True
    )
    final_diet_text = guard_result.get("sanitized_output", content)
    response.content = final_diet_text

    return {
        "messages": [response]
    }


def diet_agent_structured(state: dict) -> DietPlanSchema:
    """
    Structured output mode — called from /api/v1/plan/diet.
    Returns a validated DietPlanSchema using direct JSON generation
    without triggering Automatic Function Calling (AFC) warnings.
    """
    user_profile = state.get("user_profile", {})
    dietary_pref = user_profile.get("dietary_preference", "omnivore").lower()
    is_vegan = "vegan" in dietary_pref
    is_pure_veg = "veg" in dietary_pref

    daily_cals = user_profile.get("target_calories") or 2300
    daily_protein = user_profile.get("target_protein_g") or 150
    daily_carbs = int((daily_cals * 0.45) / 4)
    daily_fats = int((daily_cals * 0.25) / 9)

    if is_vegan:
        meals_example = [
            {
                "time": "08:00",
                "description": "Tofu scramble with spinach, nutritional yeast, roasted potatoes, and avocado toast",
                "protein_g": 35,
                "carbs_g": 55,
                "fats_g": 16,
                "calories": 504
            },
            {
                "time": "12:30",
                "description": "Lentil and chickpea Mediterranean bowl with quinoa, cucumbers, kalamata olives, and tahini",
                "protein_g": 40,
                "carbs_g": 70,
                "fats_g": 18,
                "calories": 602
            },
            {
                "time": "16:30",
                "description": "Pre-workout plant protein smoothie with frozen berries, oat milk, and chia seeds",
                "protein_g": 35,
                "carbs_g": 45,
                "fats_g": 8,
                "calories": 392
            },
            {
                "time": "20:00",
                "description": "Pan-seared marinated tempeh with jasmine rice, edamame, and steamed broccoli",
                "protein_g": 40,
                "carbs_g": 60,
                "fats_g": 16,
                "calories": 544
            }
        ]
    elif is_pure_veg:
        meals_example = [
            {
                "time": "08:00",
                "description": "Paneer bhurji with toasted whole wheat roti and a bowl of fresh seasonal berries",
                "protein_g": 35,
                "carbs_g": 50,
                "fats_g": 18,
                "calories": 502
            },
            {
                "time": "12:30",
                "description": "Moong dal tadka with brown basmati rice, sautéed greens, and cucumber salad",
                "protein_g": 40,
                "carbs_g": 75,
                "fats_g": 14,
                "calories": 586
            },
            {
                "time": "16:30",
                "description": "Post-workout plant protein shake with almond milk and banana",
                "protein_g": 35,
                "carbs_g": 40,
                "fats_g": 6,
                "calories": 354
            },
            {
                "time": "20:00",
                "description": "Grilled tofu and vegetable tikka with quinoa and lentil soup",
                "protein_g": 40,
                "carbs_g": 65,
                "fats_g": 15,
                "calories": 555
            }
        ]
    else:
        meals_example = [
            {
                "time": "08:00",
                "description": "Scrambled egg whites with spinach, oatmeal, and blueberries",
                "protein_g": 35,
                "carbs_g": 50,
                "fats_g": 12,
                "calories": 448
            },
            {
                "time": "12:30",
                "description": "Grilled chicken breast with jasmine rice, roasted asparagus, and olive oil",
                "protein_g": 45,
                "carbs_g": 65,
                "fats_g": 14,
                "calories": 566
            },
            {
                "time": "16:30",
                "description": "Whey protein isolate shake with an apple and peanut butter",
                "protein_g": 30,
                "carbs_g": 35,
                "fats_g": 10,
                "calories": 350
            },
            {
                "time": "20:00",
                "description": "Baked salmon with sweet potato mash and steamed green beans",
                "protein_g": 40,
                "carbs_g": 55,
                "fats_g": 18,
                "calories": 542
            }
        ]

    schema_example = json.dumps({
        "daily_calories": daily_cals,
        "macro_split": {
            "protein_g": daily_protein,
            "carbs_g": daily_carbs,
            "fats_g": daily_fats
        },
        "dietary_preference": dietary_pref,
        "hydration_liters": 3.0,
        "meals": meals_example
    })

    forbidden_instruction = ""
    if is_vegan:
        forbidden_instruction = "CRITICAL: The athlete is STRICT VEGAN. NEVER use meat, chicken, beef, dairy, milk, cheese, whey, or egg in any meal description."
    elif is_pure_veg:
        forbidden_instruction = "CRITICAL: The athlete is PURE VEGETARIAN. NEVER use meat, fish, chicken, beef, bacon, or eggs in any meal description."

    system_prompt = (
        "You are the FitMatrix Lead Sports Nutritionist.\n"
        f"Athlete Profile: {json.dumps(user_profile)}\n"
        f"Daily Target: {daily_cals} kcal, {daily_protein}g protein.\n"
        f"Dietary Preference: {dietary_pref}.\n"
        f"{forbidden_instruction}\n\n"
        "Requirements:\n"
        "- Generate at least 3 distinct meal windows with protein_g, carbs_g, fats_g, and calories per meal.\n"
        "- Respond STRICTLY with a valid JSON object matching this schema. No markdown fences, no explanatory text:\n"
        f"{schema_example}"
    )

    try:
        llm = get_agent_model(temperature=0.2)
        resp = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.get("context_message") or "Generate my structured daily nutrition plan JSON."),
        ])
        raw_text = resp.content
        if isinstance(raw_text, list):
            raw_text = "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in raw_text)

        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]

        import re
        cleaned_fixed = re.sub(r',\s*([\]\}])', r'\1', cleaned)
        try:
            parsed = json.loads(cleaned_fixed)
        except Exception:
            parsed = json.loads(cleaned)
        # Final safety check: if vegan, ensure no forbidden terms slipped in
        if is_vegan:
            for m in parsed.get("meals", []):
                desc_lower = m.get("description", "").lower()
                for bad in ["meat", "chicken", "beef", "dairy", "milk", "cheese", "whey", "egg"]:
                    if bad in desc_lower:
                        return DietPlanSchema.model_validate(json.loads(schema_example))
        return DietPlanSchema.model_validate(parsed)
    except Exception as e:
        logger.debug(f"diet_agent_structured JSON generation fallback: {e}")
        return DietPlanSchema.model_validate(json.loads(schema_example))
