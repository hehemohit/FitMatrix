from fastapi import APIRouter, HTTPException, Request, Depends
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
    image_base64: Optional[str] = None
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
async def post_vision_estimate(request: Request):
    """
    Analyzes a meal photo using Google Gemini Multimodal Vision with automatic EXIF
    normalization, thumbnail compression, and Redis caching.
    Supports:
    1. High-speed binary multipart/form-data upload (field 'file' + optional 'meal_hint').
    2. Backward-compatible JSON body ({"image_base64": "...", "meal_hint": "..."}).
    """
    try:
        content_type = request.headers.get("content-type", "")
        image_bytes: Optional[bytes] = None
        image_base64: Optional[str] = None
        meal_hint: Optional[str] = None

        if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
            form = await request.form()
            file = form.get("file")
            raw_hint = form.get("meal_hint")
            meal_hint = str(raw_hint) if raw_hint else None
            
            if file and hasattr(file, "read"):
                image_bytes = await file.read()
            elif "image_base64" in form:
                image_base64 = str(form.get("image_base64"))
        else:
            # JSON payload fallback
            body = await request.json()
            image_base64 = body.get("image_base64")
            meal_hint = body.get("meal_hint")

        if not image_bytes and not image_base64:
            raise HTTPException(
                status_code=400,
                detail="Either 'file' (multipart upload) or 'image_base64' (JSON) must be provided."
            )

        analysis = await analyze_food_photo(
            image_bytes=image_bytes,
            image_base64=image_base64,
            meal_hint=meal_hint,
        )
        return analysis
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vision estimation failed: {str(e)}")

