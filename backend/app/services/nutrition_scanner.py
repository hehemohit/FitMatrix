import os
import re
import logging
import httpx
from typing import Optional, List, Literal
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.models.documents import CustomBarcodeDocument

logger = logging.getLogger(__name__)

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class IngredientItem(BaseModel):
    name: str
    portion_g: int = Field(description="Estimated portion in grams")
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int

class VisionMealAnalysis(BaseModel):
    dish_name: str
    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fats_g: int
    confidence: Literal["high", "medium", "low"] = Field(
        description="High: clear visibility of known foods with obvious plate scale. Medium: overlapping components or hidden depths. Low: heavy gravies, ambiguous fillings, or unclear perspective."
    )
    reasoning_note: str = Field(
        description="Explanation of visual portion and tableware scale assumptions (e.g. estimated on a standard 10-inch plate)."
    )
    items: List[IngredientItem]

class CustomBarcodePayload(BaseModel):
    barcode: str
    product_name: str
    brand: Optional[str] = "Custom Product"
    serving_size: Optional[str] = "100g"
    serving_size_g: Optional[float] = 100.0
    calories: int
    protein_g: int
    carbs_g: int
    fats_g: int
    image_url: Optional[str] = None
    user_id: Optional[str] = "community"


# ─── 1. Barcode Service (Open Food Facts + Custom Database) ───────────────────

OPEN_FOOD_FACTS_BASE_URL = "https://world.openfoodfacts.org/api/v2/product"

async def lookup_food_barcode(barcode: str) -> dict:
    clean_code = re.sub(r"[^0-9a-zA-Z]", "", barcode).strip()
    if not clean_code:
        return {"status": "not_found", "barcode": barcode, "error": "Invalid barcode"}

    # 1. First check our local/community custom barcode repository
    try:
        custom_doc = await CustomBarcodeDocument.find_one(
            CustomBarcodeDocument.barcode == clean_code
        )
        if custom_doc:
            return {
                "status": "found",
                "source": "custom_database",
                "barcode": clean_code,
                "product_name": custom_doc.product_name,
                "brand": custom_doc.brand,
                "serving_size": custom_doc.serving_size,
                "serving_size_g": custom_doc.serving_size_g,
                "calories": custom_doc.calories,
                "protein_g": custom_doc.protein_g,
                "carbs_g": custom_doc.carbs_g,
                "fats_g": custom_doc.fats_g,
                "image_url": custom_doc.image_url,
            }
    except Exception as e:
        logger.warning(f"[lookup_food_barcode] Custom DB lookup error: {e}")

    # 2. Query Open Food Facts API v2
    url = f"{OPEN_FOOD_FACTS_BASE_URL}/{clean_code}.json"
    headers = {"User-Agent": "FitMatrix-HealthEngine/1.0 (contact: support@fitmatrix.app)"}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == 1 and "product" in data:
                    product = data["product"]
                    nutriments = product.get("nutriments", {})

                    # Parse calories
                    cals = (
                        nutriments.get("energy-kcal_100g")
                        or nutriments.get("energy-kcal")
                        or nutriments.get("energy-kcal_serving")
                        or 0
                    )
                    protein = (
                        nutriments.get("proteins_100g")
                        or nutriments.get("proteins")
                        or nutriments.get("proteins_serving")
                        or 0
                    )
                    carbs = (
                        nutriments.get("carbohydrates_100g")
                        or nutriments.get("carbohydrates")
                        or nutriments.get("carbohydrates_serving")
                        or 0
                    )
                    fats = (
                        nutriments.get("fat_100g")
                        or nutriments.get("fat")
                        or nutriments.get("fat_serving")
                        or 0
                    )

                    serving_size_str = product.get("serving_size") or "100g"
                    serving_g = 100.0
                    match_g = re.search(r"(\d+(\.\d+)?)\s*g", serving_size_str, re.IGNORECASE)
                    if match_g:
                        serving_g = float(match_g.group(1))

                    return {
                        "status": "found",
                        "source": "open_food_facts",
                        "barcode": clean_code,
                        "product_name": product.get("product_name") or product.get("product_name_en") or "Packaged Food Item",
                        "brand": product.get("brands") or "Unknown Brand",
                        "serving_size": serving_size_str,
                        "serving_size_g": serving_g,
                        "calories": int(round(float(cals))),
                        "protein_g": int(round(float(protein))),
                        "carbs_g": int(round(float(carbs))),
                        "fats_g": int(round(float(fats))),
                        "image_url": product.get("image_front_url") or product.get("image_url"),
                    }
    except Exception as e:
        logger.warning(f"[lookup_food_barcode] Open Food Facts error: {e}")

    return {
        "status": "not_found",
        "barcode": clean_code,
        "message": "Product not found in global database. Enter details once to save permanently."
    }


async def save_custom_barcode(payload: CustomBarcodePayload) -> dict:
    clean_code = re.sub(r"[^0-9a-zA-Z]", "", payload.barcode).strip()
    existing = await CustomBarcodeDocument.find_one(
        CustomBarcodeDocument.barcode == clean_code
    )

    if existing:
        existing.product_name = payload.product_name
        existing.brand = payload.brand or existing.brand
        existing.serving_size = payload.serving_size or existing.serving_size
        existing.serving_size_g = payload.serving_size_g or existing.serving_size_g
        existing.calories = payload.calories
        existing.protein_g = payload.protein_g
        existing.carbs_g = payload.carbs_g
        existing.fats_g = payload.fats_g
        existing.image_url = payload.image_url or existing.image_url
        await existing.save()
        return {"status": "updated", "barcode": clean_code}

    new_doc = CustomBarcodeDocument(
        barcode=clean_code,
        product_name=payload.product_name,
        brand=payload.brand or "Custom Product",
        serving_size=payload.serving_size or "100g",
        serving_size_g=payload.serving_size_g or 100.0,
        calories=payload.calories,
        protein_g=payload.protein_g,
        carbs_g=payload.carbs_g,
        fats_g=payload.fats_g,
        image_url=payload.image_url,
        contributed_by_user_id=payload.user_id or "community",
    )
    await new_doc.insert()
    return {"status": "saved", "barcode": clean_code}


# ─── 2. AI Vision Food Recognition Service (Gemini Multimodal) ────────────────

VISION_SYSTEM_PROMPT = """You are an elite sports nutritionist and culinary vision estimation specialist.
Analyze the meal in the image with meticulous scientific accuracy for macro and calorie tracking.

Mandatory Guidelines:
1. Spatial Reference: Calibrate portion masses based on standard tableware (e.g. standard dinner plate ~10-11 inches, bowl ~6 inches, fork/spoon length).
2. Decompose Meal: Break the plate down into individual constituent ingredients with estimated grams, calories, and macros.
3. Hidden Oils & Dressings: Look for glossy sheen, glazes, or frying marks indicating added oils, butter, or dressing.
4. Confidence Rating:
   - 'high': Items are separated, distinct, and clear with obvious scale reference.
   - 'medium': Multiple overlapping foods, mixed stir-fries, or obscured depths.
   - 'low': Heavy curries/sauces concealing proteins, covered casseroles, or ambiguous fillings.
5. Reasoning Note: Provide a 1-sentence note stating assumed scale reference and potential variance so the athlete can calibrate grams.
"""

async def analyze_food_photo(image_base64: str, meal_hint: Optional[str] = None) -> dict:
    # Ensure clean data URI format
    clean_b64 = image_base64.strip()
    if not clean_b64.startswith("data:"):
        clean_b64 = f"data:image/jpeg;base64,{clean_b64}"

    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        raise ValueError("GOOGLE_API_KEY is not configured in backend environment")

    # Use Gemini 3.8 Flash for fast multimodal vision
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.8-flash",
        google_api_key=google_api_key,
        temperature=0.0,
    )
    structured_llm = llm.with_structured_output(VisionMealAnalysis)

    user_text = "Identify all food items in this photo, estimate portions in grams, and calculate total calories and macros."
    if meal_hint:
        user_text += f" User note/context: {meal_hint}"

    message_content = [
        {"type": "text", "text": user_text},
        {
            "type": "image_url",
            "image_url": clean_b64,
        },
    ]

    try:
        result: VisionMealAnalysis = await structured_llm.ainvoke([
            SystemMessage(content=VISION_SYSTEM_PROMPT),
            HumanMessage(content=message_content),
        ])
        return result.model_dump()
    except Exception as e:
        logger.error(f"[analyze_food_photo] Gemini Vision analysis failed: {e}")
        raise
