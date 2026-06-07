from __future__ import annotations

import logging

from fastapi import HTTPException, status

from app.config import settings
from app.todos.repository import TodoRepository
from app.todos.schemas import (
    CreateTodoSchema,
    ListTodosQuerySchema,
    TodoListResponse,
    TodoResponse,
    UpdateTodoSchema,
)

logger = logging.getLogger(__name__)


class TodoService:
    def __init__(self, repo: TodoRepository) -> None:
        self._repo = repo

    async def create(self, dto: CreateTodoSchema) -> TodoResponse:
        response = await self._repo.create(dto)

        from app.jobs.tasks import enqueue_todo_created  # noqa: PLC0415

        await enqueue_todo_created(response.id, response.title)
        return response

    async def find_all(self, query: ListTodosQuerySchema) -> TodoListResponse:
        return await self._repo.find_all(query)

    async def find_one(self, todo_id: str) -> TodoResponse:
        result = await self._repo.find_one(todo_id)
        if result is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
        return result

    async def update(self, todo_id: str, dto: UpdateTodoSchema) -> TodoResponse:
        return await self._repo.update(todo_id, dto)

    async def remove(self, todo_id: str) -> None:
        await self._repo.remove(todo_id)


def make_todo_service() -> TodoService:
    if settings.DB_PROFILE == "postgresql":
        from app.todos.postgres_repository import PostgresTodoRepository

        return TodoService(PostgresTodoRepository())

    from app.todos.mongo_repository import MongoTodoRepository

    return TodoService(MongoTodoRepository())


_service_instance: TodoService | None = None


def get_todo_service() -> TodoService:
    global _service_instance
    if _service_instance is None:
        _service_instance = make_todo_service()
    return _service_instance
