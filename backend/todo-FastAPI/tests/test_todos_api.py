"""Integration tests — full HTTP flow via HTTPX + in-memory MongoDB."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.anyio
async def test_create_returns_201(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/todos",
        json={"title": "Buy milk", "priority": 2, "status": "todo"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Buy milk"
    assert data["priority"] == 2
    assert data["status"] == "todo"
    assert data["revision"] == 0
    assert "_id" in data


@pytest.mark.anyio
async def test_create_validates_empty_title(client: AsyncClient) -> None:
    resp = await client.post("/api/todos", json={"title": "  "})
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_create_validates_priority_range(client: AsyncClient) -> None:
    resp = await client.post("/api/todos", json={"title": "x", "priority": 10})
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_list_returns_pagination(client: AsyncClient) -> None:
    for i in range(3):
        await client.post("/api/todos", json={"title": f"Todo {i}"})

    resp = await client.get("/api/todos?page=1&limit=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert data["page"] == 1
    assert data["limit"] == 2
    assert len(data["items"]) == 2


@pytest.mark.anyio
async def test_list_filters_by_status(client: AsyncClient) -> None:
    await client.post("/api/todos", json={"title": "A", "status": "todo"})
    await client.post("/api/todos", json={"title": "B", "status": "done"})

    resp = await client.get("/api/todos?status=done")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "done"


@pytest.mark.anyio
async def test_list_rejects_oversized_limit(client: AsyncClient) -> None:
    resp = await client.get("/api/todos?limit=9999")
    assert resp.status_code == 422


@pytest.mark.anyio
async def test_get_single_todo(client: AsyncClient) -> None:
    create = await client.post("/api/todos", json={"title": "Single"})
    todo_id = create.json()["_id"]

    resp = await client.get(f"/api/todos/{todo_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Single"


@pytest.mark.anyio
async def test_get_not_found(client: AsyncClient) -> None:
    resp = await client.get("/api/todos/000000000000000000000000")
    assert resp.status_code == 404
    assert resp.json()["statusCode"] == 404


@pytest.mark.anyio
async def test_update_todo(client: AsyncClient) -> None:
    create = await client.post("/api/todos", json={"title": "Old title"})
    todo_id = create.json()["_id"]

    resp = await client.put(
        f"/api/todos/{todo_id}",
        json={"title": "New title", "status": "doing"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New title"
    assert data["status"] == "doing"
    assert data["revision"] == 1


@pytest.mark.anyio
async def test_optimistic_concurrency_conflict(client: AsyncClient) -> None:
    create = await client.post("/api/todos", json={"title": "OCC test"})
    todo_id = create.json()["_id"]

    # First update succeeds — revision 0 → 1
    await client.put(f"/api/todos/{todo_id}", json={"title": "Updated", "revision": 0})

    # Second update with stale revision 0 must conflict
    resp = await client.put(f"/api/todos/{todo_id}", json={"title": "Conflict", "revision": 0})
    assert resp.status_code == 409
    assert "conflict" in resp.json()["message"].lower()


@pytest.mark.anyio
async def test_delete_todo(client: AsyncClient) -> None:
    create = await client.post("/api/todos", json={"title": "Delete me"})
    todo_id = create.json()["_id"]

    resp = await client.delete(f"/api/todos/{todo_id}")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

    get_resp = await client.get(f"/api/todos/{todo_id}")
    assert get_resp.status_code == 404


@pytest.mark.anyio
async def test_full_create_list_delete_flow(client: AsyncClient) -> None:
    """Mirror of the NestJS e2e test: create → list → delete → confirm gone."""
    create = await client.post(
        "/api/todos",
        json={"title": "e2e todo", "status": "todo", "priority": 3},
    )
    assert create.status_code == 201
    todo_id = create.json()["_id"]

    lst = await client.get("/api/todos")
    ids = [t["_id"] for t in lst.json()["items"]]
    assert todo_id in ids

    await client.delete(f"/api/todos/{todo_id}")

    lst2 = await client.get("/api/todos")
    ids2 = [t["_id"] for t in lst2.json()["items"]]
    assert todo_id not in ids2


@pytest.mark.anyio
async def test_correlation_id_echoed(client: AsyncClient) -> None:
    resp = await client.get("/api/todos", headers={"X-Request-Id": "test-corr-123"})
    assert resp.headers.get("x-request-id") == "test-corr-123"


@pytest.mark.anyio
async def test_health_endpoint(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "mongodb" in data
    assert "uptime" in data
