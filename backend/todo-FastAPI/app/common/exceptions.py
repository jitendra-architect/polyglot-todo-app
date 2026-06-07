from __future__ import annotations

import logging
import traceback

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


def _correlation_id(request: Request) -> str:
    return getattr(request.state, "correlation_id", "")


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    correlation_id = _correlation_id(request)
    logger.warning(
        "%s %s [%s] %s",
        exc.status_code,
        exc.detail,
        correlation_id,
        request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "statusCode": exc.status_code,
            "message": exc.detail,
            "path": request.url.path,
            "correlationId": correlation_id,
        },
        headers={"X-Request-Id": correlation_id},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    correlation_id = _correlation_id(request)
    errors = exc.errors()
    logger.warning(
        "422 Validation error [%s] %s — %s",
        correlation_id,
        request.url.path,
        errors,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "statusCode": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "message": "Validation failed",
            "errors": errors,
            "path": request.url.path,
            "correlationId": correlation_id,
        },
        headers={"X-Request-Id": correlation_id},
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = _correlation_id(request)
    logger.error(
        "500 Internal Server Error [%s] %s\n%s",
        correlation_id,
        request.url.path,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "Internal server error",
            "path": request.url.path,
            "correlationId": correlation_id,
        },
        headers={"X-Request-Id": correlation_id},
    )
