from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional

from app.todos.schemas import (
    CreateTodoSchema,
    ListTodosQuerySchema,
    TodoListResponse,
    TodoResponse,
    UpdateTodoSchema,
)


class TodoRepository(ABC):
    @abstractmethod
    async def create(self, dto: CreateTodoSchema) -> TodoResponse: ...

    @abstractmethod
    async def find_all(self, query: ListTodosQuerySchema) -> TodoListResponse: ...

    @abstractmethod
    async def find_one(self, todo_id: str) -> Optional[TodoResponse]: ...

    @abstractmethod
    async def update(self, todo_id: str, dto: UpdateTodoSchema) -> TodoResponse: ...

    @abstractmethod
    async def remove(self, todo_id: str) -> None: ...
