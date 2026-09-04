"""
LLM Provider Factory — FitMatrix
---------------------------------
Priority order (auto-fallback):
  1. Google/Gemini (gemini-3.6-flash)          — Google tier
  2. Groq          (llama-3.3-70b-versatile)   — fastest, free tier
  3. OpenAI        (gpt-4o)                    — paid fallback

Set DEFAULT_LLM_PROVIDER in .env to pin a specific provider.
If the pinned provider fails, the factory falls back automatically.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider constructors
# ---------------------------------------------------------------------------

def _groq_model(temperature: float):
    from langchain_groq import ChatGroq
    model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    return ChatGroq(
        model=model,
        temperature=temperature,
        max_tokens=500,
        api_key=os.getenv("GROQ_API_KEY"),
    )

def _gemini_model(temperature: float):
    from langchain_google_genai import ChatGoogleGenerativeAI
    model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temperature,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )

def _openai_model(temperature: float):
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        model="gpt-4o",
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

# ---------------------------------------------------------------------------
# Provider registry — ordered by preference (Google -> Groq -> OpenAI)
# ---------------------------------------------------------------------------

_PROVIDER_ORDER = ["gemini", "groq", "openai"]

_PROVIDER_FACTORIES = {
    "gemini": (_gemini_model, "GOOGLE_API_KEY"),
    "google": (_gemini_model, "GOOGLE_API_KEY"),
    "groq":   (_groq_model,   "GROQ_API_KEY"),
    "openai": (_openai_model, "OPENAI_API_KEY"),
}

# ---------------------------------------------------------------------------
# Public factory
# ---------------------------------------------------------------------------

def get_chat_model(
    provider: Optional[str] = None,
    temperature: float = 0.2,
):
    """
    Return a ready-to-use LangChain chat model with runtime fallbacks.
    """
    preferred = (provider or os.getenv("DEFAULT_LLM_PROVIDER", "")).lower().strip()

    # Build ordered list: preferred first, then the rest
    order = []
    if preferred and preferred in _PROVIDER_FACTORIES:
        order.append(preferred)
    for p in _PROVIDER_ORDER:
        if p not in order:
            order.append(p)

    placeholder_prefixes = ("your_", "sk-dummy")
    valid_models = []
    seen = set()

    for name in order:
        canonical = "gemini" if name == "google" else name
        if canonical in seen:
            continue
        seen.add(canonical)

        factory_fn, key_env = _PROVIDER_FACTORIES[name]
        api_key = os.getenv(key_env, "")

        # Skip providers with missing or placeholder keys
        if not api_key or any(api_key.startswith(p) for p in placeholder_prefixes):
            continue

        try:
            model = factory_fn(temperature)
            valid_models.append((canonical, model))
        except Exception as exc:
            logger.warning("Provider %s failed to instantiate (%s)", name, exc)

    if not valid_models:
        raise RuntimeError(
            "All LLM providers exhausted — no valid API keys found.\n"
            "Set at least one of GOOGLE_API_KEY, GROQ_API_KEY, OPENAI_API_KEY in backend/.env"
        )

    primary_name, primary_model = valid_models[0]
    logger.info("Primary LLM provider selected: %s", primary_name)

    if len(valid_models) > 1:
        fallbacks = [m for _, m in valid_models[1:]]
        return primary_model.with_fallbacks(fallbacks)
    return primary_model


# ---------------------------------------------------------------------------
# Convenience helpers — cached per process so selection only happens once
# ---------------------------------------------------------------------------

_cache: dict = {}

def get_agent_model(temperature: float = 0.2):
    """Cached model for agent nodes (fallback chain applied)."""
    key = f"agent_{temperature}"
    if key not in _cache:
        _cache[key] = get_chat_model(temperature=temperature)
    return _cache[key]

def get_supervisor_model():
    """Deterministic model for the supervisor router (temperature=0)."""
    if "supervisor" not in _cache:
        _cache["supervisor"] = get_chat_model(temperature=0)
    return _cache["supervisor"]

