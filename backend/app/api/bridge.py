"""
FitMatrix Mobile-to-Web Sync Bridge
------------------------------------
Allows a mobile device running FitMatrix to beam its live MMKV biometrics
and user profile directly to the web evaluation studio via a 4-digit session PIN.
"""

import time
import random
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/bridge", tags=["bridge"])

# In-memory store: {session_code: {"payload": dict, "created_at": float}}
_BRIDGE_SESSIONS: Dict[str, Dict[str, Any]] = {}
SESSION_TTL_SECONDS = 600.0  # 10 minutes


class CreateSessionResponse(BaseModel):
    session_code: str
    expires_in_seconds: int = 600


class BeamPayloadRequest(BaseModel):
    session_code: str
    user_id: str
    steps_today: int = 0
    sleep_minutes: int = 420
    active_calories_burned: int = 0
    resting_heart_rate_bpm: int = 0
    readiness_score: Optional[int] = None
    user_profile: Optional[dict] = Field(default_factory=dict)
    daily_log: Optional[dict] = Field(default_factory=dict)


@router.post("/session", response_model=CreateSessionResponse)
def create_bridge_session():
    """Generates a temporary 4-digit session PIN for mobile pairing."""
    # Cleanup expired sessions
    now = time.time()
    expired = [k for k, v in _BRIDGE_SESSIONS.items() if now - v["created_at"] > SESSION_TTL_SECONDS]
    for k in expired:
        del _BRIDGE_SESSIONS[k]

    # Generate 4-digit code (e.g. "4821")
    code = f"{random.randint(1000, 9999)}"
    _BRIDGE_SESSIONS[code] = {
        "payload": None,
        "created_at": now
    }
    return CreateSessionResponse(session_code=code, expires_in_seconds=int(SESSION_TTL_SECONDS))


@router.post("/beam")
def beam_mobile_payload(payload: BeamPayloadRequest):
    """Called by mobile app to push its current MMKV state into the active web session."""
    code = payload.session_code.strip()
    session = _BRIDGE_SESSIONS.get(code)
    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired session code.")

    session["payload"] = payload.model_dump()
    session["updated_at"] = time.time()
    return {"status": "success", "message": f"Biometrics beamed to session {code} successfully."}


@router.get("/session/{code}")
def get_beamed_payload(code: str):
    """Called by web studio to poll or retrieve the beamed athlete context."""
    code = code.strip()
    session = _BRIDGE_SESSIONS.get(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")

    return {
        "session_code": code,
        "has_data": session["payload"] is not None,
        "payload": session["payload"],
    }
