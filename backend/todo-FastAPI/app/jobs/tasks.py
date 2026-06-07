from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)


# ── Task definitions ──────────────────────────────────────────────────────────

async def todo_created(ctx: dict[str, Any], todo_id: str, title: str) -> None:
    """ARQ worker task — runs in the separate worker process."""
    logger.info("Processed job: todo_created id=%s title=%s", todo_id, title)


# ── ARQ WorkerSettings ────────────────────────────────────────────────────────

class WorkerSettings:
    functions = [todo_created]
    # Connection settings are resolved lazily so the module can be imported
    # without Redis being available (e.g. during tests).

    @classmethod
    def redis_settings(cls):  # type: ignore[override]
        from arq.connections import RedisSettings  # noqa: PLC0415
        return RedisSettings.from_dsn(settings.redis_dsn)


# ── Enqueueing helper (called from the web process) ───────────────────────────

_pool: Any = None  # arq.ArqRedis | None


async def get_arq_pool() -> Any:
    """Return (and lazily create) the shared ARQ connection pool."""
    global _pool
    if _pool is None and settings.REDIS_ENABLED:
        from arq import create_pool  # noqa: PLC0415
        from arq.connections import RedisSettings  # noqa: PLC0415
        _pool = await create_pool(RedisSettings.from_dsn(settings.redis_dsn))
    return _pool


async def close_arq_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None


async def enqueue_todo_created(todo_id: str, title: str) -> None:
    """Non-blocking enqueue — silently no-ops when Redis is disabled."""
    if not settings.REDIS_ENABLED:
        return
    try:
        pool = await get_arq_pool()
        if pool is not None:
            await pool.enqueue_job("todo_created", todo_id, title)
    except Exception:
        # Job enqueueing is best-effort; never fail a request because of it
        logger.exception("Failed to enqueue todo_created job for id=%s", todo_id)
