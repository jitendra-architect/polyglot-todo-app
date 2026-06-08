from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

if TYPE_CHECKING:
    from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None  # type: ignore[type-arg]
_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


async def connect_db() -> None:
    if settings.DB_PROFILE == "postgresql":
        await _connect_postgres()
    else:
        await _connect_mongo()


async def disconnect_db() -> None:
    if settings.DB_PROFILE == "postgresql":
        await _disconnect_postgres()
    else:
        await _disconnect_mongo()


async def _connect_mongo() -> None:
    global _client

    from app.todos.models import Todo  # noqa: PLC0415

    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    db: AsyncIOMotorDatabase = _client.get_default_database(default="todos")  # type: ignore[assignment]

    await init_beanie(database=db, document_models=[Todo])
    logger.info("MongoDB connected: %s", settings.MONGODB_URI)


async def _disconnect_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB disconnected")


async def _connect_postgres() -> None:
    global _engine, _async_session_factory

    from app.todos.postgres_models import Base  # noqa: PLC0415

    _engine = create_async_engine(settings.POSTGRESQL_URI)
    _async_session_factory = async_sessionmaker(_engine, expire_on_commit=False)

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("PostgreSQL connected: %s", settings.POSTGRESQL_URI)


async def _disconnect_postgres() -> None:
    global _engine, _async_session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("PostgreSQL disconnected")


def get_client() -> AsyncIOMotorClient:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError("Database is not connected. Call connect_db() first.")
    return _client


def get_async_session_factory() -> async_sessionmaker[AsyncSession]:
    if _async_session_factory is None:
        raise RuntimeError("PostgreSQL is not connected. Call connect_db() first.")
    return _async_session_factory


async def ping_mongo() -> bool:
    try:
        client = get_client()
        await client.admin.command("ping")
        return True
    except Exception:
        return False


async def ping_postgres() -> bool:
    try:
        if _engine is None:
            return False
        async with _engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
