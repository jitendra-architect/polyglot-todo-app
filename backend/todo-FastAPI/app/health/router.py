from __future__ import annotations

import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.cache.service import CacheService, get_cache
from app.config import settings
from app.database import ping_mongo, ping_postgres

router = APIRouter(prefix="/health", tags=["health"])

_start_time = time.time()


class HealthResponse(BaseModel):
    model_config = ConfigDict(exclude_none=True)

    status: str
    mongodb: str
    postgresql: str | None = None
    redis: str
    uptime: float


@router.get("", response_model=HealthResponse)
async def get_health(cache: CacheService = Depends(get_cache)) -> HealthResponse:
    if settings.DB_PROFILE == "mongodb":
        mongo_status = "up" if await ping_mongo() else "down"
        postgres_status = None
    else:
        mongo_status = "disabled"
        postgres_status = "up" if await ping_postgres() else "down"

    if cache.enabled():
        redis_status = "up" if await cache.ping() else "down"
    else:
        redis_status = "disabled"

    return HealthResponse(
        status="ok",
        mongodb=mongo_status,
        postgresql=postgres_status,
        redis=redis_status,
        uptime=round(time.time() - _start_time, 2),
    )
