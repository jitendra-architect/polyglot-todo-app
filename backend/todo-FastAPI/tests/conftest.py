"""Shared test fixtures.

* Uses ``mongomock_motor`` for an in-memory MongoDB — no real Mongo needed.
* Uses ``fakeredis`` for an in-memory Redis — no real Redis needed.
* Sets ``REDIS_ENABLED=false`` by default so jobs and cache fall back to
  their no-op / in-memory paths.
"""

from __future__ import annotations

import os

# Must be set before any app imports so Settings reads the right values
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017/test_todos")
os.environ.setdefault("REDIS_ENABLED", "false")

import pytest
import mongomock_motor
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient

from app.todos.models import Todo


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
async def mongo_db():
    """Session-scoped in-memory MongoDB database."""
    client = mongomock_motor.AsyncMongoMockClient()
    db = client["test_todos"]
    await init_beanie(database=db, document_models=[Todo])
    yield db
    client.close()


@pytest.fixture(autouse=True)
async def clean_todos(mongo_db):
    """Wipe the todos collection between every test."""
    yield
    await Todo.delete_all()


@pytest.fixture(scope="session")
async def client(mongo_db):
    """HTTPX async test client wired to the FastAPI app."""
    from app.main import app
    from app.cache.service import get_cache_instance

    # Patch cache startup so it stays in-memory mode (REDIS_ENABLED=false)
    cache = get_cache_instance()
    await cache.startup()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac
