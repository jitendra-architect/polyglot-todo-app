from __future__ import annotations

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

router = APIRouter(prefix="/api/todos", tags=["todos"])


@router.get("", response_model=TodoListResponse, status_code=status.HTTP_200_OK)
async def list_todos(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    service: TodoService = Depends(get_todo_service),
    cache: CacheService = Depends(get_cache),
) -> TodoListResponse:
    from app.todos.schemas import ListTodosQuerySchema  # noqa: PLC0415
    from app.todos.models import TodoStatus  # noqa: PLC0415

    todo_status = TodoStatus(status_filter) if status_filter else None
    query = ListTodosQuerySchema(page=page, limit=limit, status=todo_status)

    key = f"todos:list:page:{page}:limit:{limit}:status:{status_filter or 'all'}"
    cached = await cache.get(key)
    if cached is not None:
        return TodoListResponse.model_validate(cached)

    result = await service.find_all(query)
    await cache.set(key, result.model_dump())
    return result


@router.get("/{todo_id}", response_model=TodoResponse, status_code=status.HTTP_200_OK)
async def get_todo(
    todo_id: str,
    service: TodoService = Depends(get_todo_service),
) -> TodoResponse:
    return await service.find_one(todo_id)


@router.post("", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    dto: CreateTodoSchema,
    service: TodoService = Depends(get_todo_service),
    cache: CacheService = Depends(get_cache),
) -> TodoResponse:
    item = await service.create(dto)
    await cache.scan_del("todos:list:*")
    return item


@router.put("/{todo_id}", response_model=TodoResponse, status_code=status.HTTP_200_OK)
async def update_todo(
    todo_id: str,
    dto: UpdateTodoSchema,
    service: TodoService = Depends(get_todo_service),
    cache: CacheService = Depends(get_cache),
) -> TodoResponse:
    item = await service.update(todo_id, dto)
    await cache.scan_del("todos:list:*")
    return item


@router.delete("/{todo_id}", response_model=DeleteResponse, status_code=status.HTTP_200_OK)
async def delete_todo(
    todo_id: str,
    service: TodoService = Depends(get_todo_service),
    cache: CacheService = Depends(get_cache),
) -> DeleteResponse:
    await service.remove(todo_id)
    await cache.scan_del("todos:list:*")
    return DeleteResponse()
