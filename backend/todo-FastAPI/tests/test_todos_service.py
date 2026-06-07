"""Unit tests for TodoService — in-memory MongoDB, no HTTP layer."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.todos.models import TodoStatus
from app.todos.schemas import CreateTodoSchema, ListTodosQuerySchema, UpdateTodoSchema
from app.todos.service import TodoService


@pytest.fixture
def service() -> TodoService:
    return TodoService()


@pytest.mark.anyio
async def test_create_persists_todo(mongo_db, service: TodoService) -> None:
    dto = CreateTodoSchema(title="unit test", priority=2)
    result = await service.create(dto)

    assert result.title == "unit test"
    assert result.priority == 2
    assert result.status == TodoStatus.TODO
    assert result.revision == 0
    assert result._id  # noqa: SLF001


@pytest.mark.anyio
async def test_find_all_returns_paginated(mongo_db, service: TodoService) -> None:
    for i in range(5):
        await service.create(CreateTodoSchema(title=f"Todo {i}"))

    result = await service.find_all(ListTodosQuerySchema(page=1, limit=3))
    assert result.total == 5
    assert len(result.items) == 3
    assert result.page == 1
    assert result.limit == 3


@pytest.mark.anyio
async def test_find_one_raises_404_for_unknown(mongo_db, service: TodoService) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await service.find_one("000000000000000000000000")
    assert exc_info.value.status_code == 404


@pytest.mark.anyio
async def test_update_changes_fields(mongo_db, service: TodoService) -> None:
    created = await service.create(CreateTodoSchema(title="Original"))
    updated = await service.update(
        created._id,  # noqa: SLF001
        UpdateTodoSchema(title="Updated", status=TodoStatus.DOING),
    )
    assert updated.title == "Updated"
    assert updated.status == TodoStatus.DOING
    assert updated.revision == 1


@pytest.mark.anyio
async def test_update_occ_conflict(mongo_db, service: TodoService) -> None:
    created = await service.create(CreateTodoSchema(title="OCC"))
    todo_id = created._id  # noqa: SLF001

    # First update: revision 0 → 1
    await service.update(todo_id, UpdateTodoSchema(title="First", revision=0))

    # Second update with stale revision 0 should conflict
    with pytest.raises(HTTPException) as exc_info:
        await service.update(todo_id, UpdateTodoSchema(title="Second", revision=0))
    assert exc_info.value.status_code == 409


@pytest.mark.anyio
async def test_remove_deletes_todo(mongo_db, service: TodoService) -> None:
    created = await service.create(CreateTodoSchema(title="Delete me"))
    await service.remove(created._id)  # noqa: SLF001

    with pytest.raises(HTTPException) as exc_info:
        await service.find_one(created._id)  # noqa: SLF001
    assert exc_info.value.status_code == 404


@pytest.mark.anyio
async def test_remove_raises_404_for_unknown(mongo_db, service: TodoService) -> None:
    with pytest.raises(HTTPException) as exc_info:
        await service.remove("000000000000000000000000")
    assert exc_info.value.status_code == 404
