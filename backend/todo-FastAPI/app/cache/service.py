from __future__ import annotations

import fnmatch
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from app.config import settings

logger = logging.getLogger(__name__)


# ── In-memory fallback ────────────────────────────────────────────────────────

@dataclass
class _MemoryEntry:
    value: str
    expires_at: float


class CacheService:
    """Redis-first cache with a TTL-aware in-memory fallback.

    Mirrors the NestJS CacheService: same public API, same invalidation strategy.
    Instantiated once at startup; injected via FastAPI Depends.
    """

    def __init__(self) -> None:
        self._redis: Any = None  # redis.asyncio.Redis | None
        self._memory: dict[str, _MemoryEntry] = {}
        self._ttl = settings.CACHE_TTL_SECONDS
        self._enabled = settings.REDIS_ENABLED

    async def startup(self) -> None:
        if not self._enabled:
            logger.info("Redis cache disabled — using in-memory shim")
            return
        import redis.asyncio as aioredis  # noqa: PLC0415

        self._redis = aioredis.from_url(
            settings.redis_dsn,
            encoding="utf-8",
            decode_responses=True,
        )
        logger.info("Redis cache enabled: %s", settings.redis_dsn)

    async def shutdown(self) -> None:
        if self._redis is not None:
            await self._redis.aclose()
            self._redis = None

    def enabled(self) -> bool:
        return self._enabled

    async def get(self, key: str) -> Optional[Any]:
        if self._redis is not None:
            raw: Optional[str] = await self._redis.get(key)
            return json.loads(raw) if raw is not None else None

        entry = self._memory.get(key)
        if entry is None:
            return None
        if time.monotonic() > entry.expires_at:
            del self._memory[key]
            return None
        return json.loads(entry.value)

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        effective_ttl = ttl if ttl is not None else self._ttl
        serialized = json.dumps(value, default=str)

        if self._redis is not None:
            await self._redis.set(key, serialized, ex=effective_ttl)
            return

        self._memory[key] = _MemoryEntry(
            value=serialized,
            expires_at=time.monotonic() + effective_ttl,
        )

    async def delete(self, key: str) -> None:
        if self._redis is not None:
            await self._redis.delete(key)
            return
        self._memory.pop(key, None)

    async def scan_del(self, pattern: str) -> int:
        """Delete all keys matching a glob pattern. Returns the count deleted."""
        if self._redis is not None:
            total = 0
            cursor: int = 0
            while True:
                cursor, keys = await self._redis.scan(cursor, match=pattern, count=100)
                if keys:
                    total += await self._redis.delete(*keys)
                if cursor == 0:
                    break
            return total

        to_delete = [k for k in self._memory if fnmatch.fnmatch(k, pattern)]
        for k in to_delete:
            del self._memory[k]
        return len(to_delete)

    async def ping(self) -> bool:
        if self._redis is None:
            return False
        try:
            return await self._redis.ping()
        except Exception:
            return False


# ── Module-level singleton + Depends helper ───────────────────────────────────

_cache_instance = CacheService()


def get_cache() -> CacheService:
    return _cache_instance


def get_cache_instance() -> CacheService:
    """Expose the singleton for lifespan startup/shutdown."""
    return _cache_instance
