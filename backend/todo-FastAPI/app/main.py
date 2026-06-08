from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.cache.service import get_cache_instance
from app.common.exceptions import (
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.common.middleware import CorrelationIdMiddleware
from app.config import settings
from app.database import connect_db, disconnect_db
from app.health.router import router as health_router
from app.jobs.tasks import close_arq_pool, get_arq_pool
from app.todos.router import router as todos_router

logging.basicConfig(
    level=logging.DEBUG if not settings.is_production else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting up (env=%s)", settings.APP_ENV)

    await connect_db()
    await get_cache_instance().startup()

    if settings.REDIS_ENABLED:
        await get_arq_pool()
        logger.info("ARQ job pool ready")

    yield

    logger.info("Shutting down")
    await close_arq_pool()
    await get_cache_instance().shutdown()
    await disconnect_db()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Todo API",
        description="Production-grade Todo REST API — FastAPI + MongoDB/PostgreSQL + Redis",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── Middleware (outermost → innermost) ────────────────────────────────────
    app.add_middleware(CorrelationIdMiddleware)

    # ── Exception handlers ────────────────────────────────────────────────────
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(todos_router)
    app.include_router(health_router)

    return app


app = create_app()
