"""
FitMatrix — MongoDB Atlas Database Connection (Motor + Beanie)
--------------------------------------------------------------
Provides:
  • init_db()           — Called at FastAPI app startup via lifespan context manager.
                          Initialises Motor client and registers all Beanie document models.
  • get_database()      — Returns the raw AsyncIOMotorDatabase for manual queries if needed.
  • db_lifespan()       — FastAPI lifespan context manager that connects on startup
                          and cleanly disconnects on shutdown.

Usage in main.py:
    from app.core.database import db_lifespan
    app = FastAPI(lifespan=db_lifespan, ...)
"""

import logging
import certifi
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from beanie import init_beanie
from app.core.config import settings
from app.models.documents import (
    UserDocument,
    DailyMetricDocument,
    NutritionLogDocument,
    PlanArtifactDocument,
    DailyLogDocument,
    StrategyProfileDocument,
    CustomBarcodeDocument,
)

logger = logging.getLogger(__name__)

# Module-level motor client — created once, reused across the process lifetime
_mongo_client: AsyncIOMotorClient | None = None


def get_database() -> AsyncIOMotorDatabase:
    """
    Returns the active AsyncIOMotorDatabase instance.
    Call after init_db() has been awaited (i.e. after app startup).
    """
    if _mongo_client is None:
        raise RuntimeError(
            "MongoDB client has not been initialised. "
            "Ensure db_lifespan is attached to the FastAPI app."
        )
    return _mongo_client[settings.DATABASE_NAME]


async def init_db() -> None:
    """
    Initialise the Motor client and register all Beanie document models.
    Creates indexes defined in each document's Settings.indexes automatically.
    """
    global _mongo_client

    if not settings.MONGODB_URI:
        logger.warning(
            "MONGODB_URI is not set. Database persistence will be disabled until configured in environment variables."
        )
        return

    try:
        logger.info("Connecting to MongoDB: %s / %s", settings.MONGODB_URI[:35] + "...", settings.DATABASE_NAME)

        _mongo_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,  # Fail fast during startup if Atlas is unreachable
            tlsCAFile=certifi.where(),
        )

        # Bridge PyMongo 4.14+ driver metadata for Beanie compatibility with Motor 3.7+
        if hasattr(_mongo_client.delegate, "append_metadata"):
            _mongo_client.append_metadata = _mongo_client.delegate.append_metadata

        db = _mongo_client[settings.DATABASE_NAME]

        await init_beanie(
            database=db,
            document_models=[
                UserDocument,
                DailyMetricDocument,
                NutritionLogDocument,
                PlanArtifactDocument,
                DailyLogDocument,
                StrategyProfileDocument,
                CustomBarcodeDocument,
            ],
        )

        logger.info(
            "MongoDB Atlas connected. Collections: users, daily_metrics, nutrition_logs, plan_artifacts, daily_logs"
        )
    except Exception as e:
        logger.error(
            "Failed to connect to MongoDB at startup: %s. "
            "Please check MONGODB_URI and IP Access List in Atlas. App continuing in degraded mode.",
            e,
        )


async def close_db() -> None:
    """Gracefully close the Motor connection pool on app shutdown."""
    global _mongo_client
    if _mongo_client is not None:
        _mongo_client.close()
        _mongo_client = None
        logger.info("MongoDB Atlas connection closed.")


@asynccontextmanager
async def db_lifespan(app):
    """
    FastAPI lifespan context manager.

    Attach to FastAPI app:
        app = FastAPI(lifespan=db_lifespan)

    Handles:
      - Startup: connects Motor client and initialises Beanie ODM.
      - Shutdown: cleanly closes the connection pool.
    """
    await init_db()
    yield
    await close_db()
