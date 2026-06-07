from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

CORRELATION_ID_HEADER = "X-Request-Id"


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Stamps every request with a correlation ID.

    * Reuses the incoming ``X-Request-Id`` header if present.
    * Generates a new UUID v4 otherwise.
    * Attaches the ID to ``request.state.correlation_id``.
    * Echoes the ID back in the response ``X-Request-Id`` header.
    """

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: object) -> Response:
        correlation_id = (
            request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())
        )
        request.state.correlation_id = correlation_id

        response: Response = await call_next(request)  # type: ignore[arg-type]
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response
