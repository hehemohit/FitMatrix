"""
FitMatrix Dynamic Prompt Registry API
-------------------------------------
Endpoints for viewing, saving, and promoting system prompts and guardrails.
Promoted prompts instantly take effect in the mobile application.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from app.harness.prompt_manager import (
    list_all_prompts,
    update_prompt_version,
    promote_version
)

router = APIRouter(prefix="/api/v1/prompts", tags=["prompts"])


class UpdatePromptRequest(BaseModel):
    agent_role: str                     # "workout_agent" | "diet_agent" | "sleep_agent" | "supervisor" | "cards"
    version_tag: str                    # e.g. "v2_autoreg_strict"
    prompt_text: str
    guardrails: Optional[Dict[str, Any]] = None
    promote_immediately: bool = False


class PromotePromptRequest(BaseModel):
    agent_role: str
    version_tag: str


@router.get("")
async def get_all_prompts():
    """Returns all agent prompt configurations and version histories."""
    try:
        prompts = await list_all_prompts()
        return {"status": "success", "prompts": prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update")
async def save_prompt_version(payload: UpdatePromptRequest):
    """Saves a prompt draft or new version to MongoDB Atlas."""
    try:
        result = await update_prompt_version(
            agent_role=payload.agent_role,
            version_tag=payload.version_tag,
            prompt_text=payload.prompt_text,
            guardrails=payload.guardrails,
            promote=payload.promote_immediately,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/promote")
async def promote_prompt_version(payload: PromotePromptRequest):
    """
    Promotes an existing prompt version to active production in MongoDB Atlas.
    Mobile app requests will immediately execute on this prompt.
    """
    try:
        result = await promote_version(
            agent_role=payload.agent_role,
            version_tag=payload.version_tag,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

