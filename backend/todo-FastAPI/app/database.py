from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]


async def connect_db() -> None:
    """Initialise Motor client and Beanie ODM."""
    global _client

    # Import here to avoid circular imports at module load time
    from app.todos.models import Todo  # noqa: PLC0415

    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db: AsyncIOMotorDatabase = _client.get_default_database(default="todos")  # type: ignore[assignment]

    await init_beanie(database=db, document_models=[Todo])
    logger.info("MongoDB connected: %s", settings.MONGODB_URI)


async def disconnect_db() -> None:
    """Close the Motor client."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB disconnected")


def get_client() -> AsyncIOMotorClient:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError("Database is not connected. Call connect_db() first.")
    return _client
