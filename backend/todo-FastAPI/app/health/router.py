from __future__ import annotations

import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.cache.service import CacheService, get_cache
from app.database import get_client

router = APIRouter(prefix="/health", tags=["health"])

_start_time = time.time()


class HealthResponse(BaseModel):
    status: str
    mongodb: str
    redis: str
    uptime: float


@router.get("", response_model=HealthResponse)
async def get_health(cache: CacheService = Depends(get_cache)) -> HealthResponse:
    # MongoDB check via Motor connection state
    try:
        client = get_client()
        await client.admin.command("ping")
        mongo_status = "up"
    except Exception:
        mongo_status = "down"

    # Redis check
    if cache.enabled():
        redis_status = "up" if await cache.ping() else "down"
    else:
        redis_status = "disabled"

    return HealthResponse(
        status="ok",
        mongodb=mongo_status,
        redis=redis_status,
        uptime=round(time.time() - _start_time, 2),
    )
