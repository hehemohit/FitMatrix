import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "FitMatrix AI Engine")
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # ── MongoDB Atlas ──────────────────────────────────────────────────────────
    MONGODB_URI: str = os.getenv(
        "MONGODB_URI",
        ""
    )
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "fitmatrix_db")

    # ── Redis (optional caching layer) ────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ── LLM providers — priority: groq → gemini → openai ─────────────────────
    DEFAULT_LLM_PROVIDER: str = os.getenv("DEFAULT_LLM_PROVIDER", "groq")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()