from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_session_factory
from app.todos.postgres_models import TodoRow
from app.todos.repository import TodoRepository
from app.todos.schemas import (
    CreateTodoSchema,
    ListTodosQuerySchema,
    TodoListResponse,
    TodoResponse,
    UpdateTodoSchema,
)


def _row_to_response(row: TodoRow) -> TodoResponse:
    return TodoResponse.model_validate(
        {
            "_id": row.id,
            "title": row.title,
            "description": row.description,
            "due_date": row.due_date,
            "status": row.status,
            "priority": row.priority,
            "revision": row.revision,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
        }
    )


class PostgresTodoRepository(TodoRepository):
    def _session(self) -> AsyncSession:
        return get_async_session_factory()()

    async def create(self, dto: CreateTodoSchema) -> TodoResponse:
        now = datetime.now(timezone.utc)
        row = TodoRow(
            title=dto.title,
            description=dto.description,
            due_date=dto.due_date,
            status=dto.status.value,
            priority=dto.priority,
            revision=0,
            created_at=now,
            updated_at=now,
        )
        async with self._session() as session:
            session.add(row)
            await session.commit()
            await session.refresh(row)
        return _row_to_response(row)

    async def find_all(self, query: ListTodosQuerySchema) -> TodoListResponse:
        page = query.page
        limit = query.limit
        skip = (page - 1) * limit

        stmt = select(TodoRow)
        count_stmt = select(func.count()).select_from(TodoRow)
        if query.status is not None:
            stmt = stmt.where(TodoRow.status == query.status.value)
            count_stmt = count_stmt.where(TodoRow.status == query.status.value)

        stmt = stmt.order_by(TodoRow.created_at.desc()).offset(skip).limit(limit)

        async with self._session() as session:
            items_result = await session.execute(stmt)
            total_result = await session.execute(count_stmt)
            items = items_result.scalars().all()
            total = total_result.scalar_one()

        return TodoListResponse(
            items=[_row_to_response(row) for row in items],
            total=total,
            page=page,
            limit=limit,
        )

    async def find_one(self, todo_id: str) -> Optional[TodoResponse]:
        async with self._session() as session:
            row = await session.get(TodoRow, todo_id)
        if row is None:
            return None
        return _row_to_response(row)

    async def update(self, todo_id: str, dto: UpdateTodoSchema) -> TodoResponse:
        async with self._session() as session:
            row = await session.get(TodoRow, todo_id)
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Todo not found",
                )

            if dto.revision is not None and row.revision != dto.revision:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Version conflict. Please reload and try again.",
                )

            if dto.title is not None:
                row.title = dto.title
            if dto.description is not None:
                row.description = dto.description
            if dto.due_date is not None:
                row.due_date = dto.due_date
            if dto.status is not None:
                row.status = dto.status.value
            if dto.priority is not None:
                row.priority = dto.priority

            row.revision += 1
            row.updated_at = datetime.now(timezone.utc)
            await session.commit()
            await session.refresh(row)

        return _row_to_response(row)

    async def remove(self, todo_id: str) -> None:
        async with self._session() as session:
            row = await session.get(TodoRow, todo_id)
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Todo not found",
                )
            await session.delete(row)
            await session.commit()
