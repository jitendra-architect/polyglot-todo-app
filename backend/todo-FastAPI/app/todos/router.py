from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.cache.service import CacheService, get_cache
from app.todos.schemas import (
    CreateTodoSchema,
    DeleteResponse,
    ListTodosQuerySchema,
    TodoListResponse,
    TodoResponse,
    UpdateTodoSchema,
)
from app.todos.service import TodoService, get_todo_service
from app.todos.models import TodoStatus

router = APIRouter(prefix="/api/todos", tags=["todos"])

TodoServiceDep = Annotated[TodoService, Depends(get_todo_service)]
CacheDep = Annotated[CacheService, Depends(get_cache)]


@router.get("", status_code=status.HTTP_200_OK)
async def list_todos(
    service: TodoServiceDep,
    cache: CacheDep,
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> TodoListResponse:

    todo_status = TodoStatus(status_filter) if status_filter else None
    query = ListTodosQuerySchema(page=page, limit=limit, status=todo_status)

    key = f"todos:list:page:{page}:limit:{limit}:status:{status_filter or 'all'}"
    cached = await cache.get(key)
    if cached is not None:
        return TodoListResponse.model_validate(cached)

    result = await service.find_all(query)
    await cache.set(key, result.model_dump())
    return result


@router.get("/{todo_id}", status_code=status.HTTP_200_OK)
async def get_todo(
    todo_id: str,
    service: TodoServiceDep,
) -> TodoResponse:
    return await service.find_one(todo_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_todo(
    dto: CreateTodoSchema,
    service: TodoServiceDep,
    cache: CacheDep,
) -> TodoResponse:
    item = await service.create(dto)
    await cache.scan_del("todos:list:*")
    return item


@router.put("/{todo_id}", status_code=status.HTTP_200_OK)
async def update_todo(
    todo_id: str,
    dto: UpdateTodoSchema,
    service: TodoServiceDep,
    cache: CacheDep,
) -> TodoResponse:
    item = await service.update(todo_id, dto)
    await cache.scan_del("todos:list:*")
    return item


@router.delete("/{todo_id}", status_code=status.HTTP_200_OK)
async def delete_todo(
    todo_id: str,
    service: TodoServiceDep,
    cache: CacheDep,
) -> DeleteResponse:
    await service.remove(todo_id)
    await cache.scan_del("todos:list:*")
    return DeleteResponse()
