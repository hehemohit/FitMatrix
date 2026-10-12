from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.nutrition_scanner import (
    lookup_food_barcode,
    save_custom_barcode,
    analyze_food_photo,
    CustomBarcodePayload,
)

router = APIRouter(prefix="/api/v1/nutrition", tags=["Nutrition Scanner & Vision"])

class VisionEstimateRequest(BaseModel):
    image_base64: str
    meal_hint: Optional[str] = None

@router.get("/barcode/{barcode}")
async def get_barcode_nutrition(barcode: str):
    """
    Looks up a food barcode.
    Checks custom crowdsourced database first, then Open Food Facts API v2.
    Returns parsed macro breakdown per serving and per 100g.
    """
    try:
        result = await lookup_food_barcode(barcode)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Barcode lookup failed: {str(e)}")

@router.post("/barcode/custom")
async def post_custom_barcode(payload: CustomBarcodePayload):
    """
    Saves a user-entered food product for a barcode that returned 404.
    Persists into MongoDB custom_barcodes collection for permanent future lookups.
    """
    try:
        result = await save_custom_barcode(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save custom barcode: {str(e)}")

@router.post("/vision-estimate")
async def post_vision_estimate(payload: VisionEstimateRequest):
    """
    Analyzes a meal photo using Google Gemini Multimodal Vision.
    Identifies constituents, estimates portion weights, and returns
    calories, protein, carbs, fats, confidence ('high'|'medium'|'low'),
    and reasoning notes on assumed tableware scale.
    """
    try:
        if not payload.image_base64:
            raise HTTPException(status_code=400, detail="image_base64 is required")
        analysis = await analyze_food_photo(payload.image_base64, payload.meal_hint)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision estimation failed: {str(e)}")
