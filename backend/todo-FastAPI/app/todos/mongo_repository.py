from __future__ import annotations

from asyncio import gather as asyncio_gather
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from bson import ObjectId
from fastapi import HTTPException, status

from app.todos.models import Todo
from app.todos.repository import TodoRepository
from app.todos.schemas import (
    CreateTodoSchema,
    ListTodosQuerySchema,
    TodoListResponse,
    TodoResponse,
    UpdateTodoSchema,
)


def _to_response(doc: Todo) -> TodoResponse:
    data = doc.model_dump(by_alias=False)
    data["_id"] = str(doc.id)
    return TodoResponse.model_validate(data)


class MongoTodoRepository(TodoRepository):
    async def create(self, dto: CreateTodoSchema) -> TodoResponse:
        doc = Todo(
            title=dto.title,
            description=dto.description,
            due_date=dto.due_date,
            status=dto.status,
            priority=dto.priority,
        )
        await doc.insert()
        return _to_response(doc)

    async def find_all(self, query: ListTodosQuerySchema) -> TodoListResponse:
        page = query.page
        limit = query.limit
        skip = (page - 1) * limit

        filter_: dict = {}
        if query.status is not None:
            filter_["status"] = query.status.value

        items, total = await asyncio_gather(
            Todo.find(filter_).sort("-created_at").skip(skip).limit(limit).to_list(),
            Todo.find(filter_).count(),
        )

        return TodoListResponse(
            items=[_to_response(doc) for doc in items],
            total=total,
            page=page,
            limit=limit,
        )

    async def find_one(self, todo_id: str) -> Optional[TodoResponse]:
        doc = await Todo.get(PydanticObjectId(todo_id))
        if doc is None:
            return None
        return _to_response(doc)

    async def update(self, todo_id: str, dto: UpdateTodoSchema) -> TodoResponse:
        oid = PydanticObjectId(todo_id)

        updates: dict = {"updated_at": datetime.now(timezone.utc)}
        if dto.title is not None:
            updates["title"] = dto.title
        if dto.description is not None:
            updates["description"] = dto.description
        if dto.due_date is not None:
            updates["due_date"] = dto.due_date
        if dto.status is not None:
            updates["status"] = dto.status.value
        if dto.priority is not None:
            updates["priority"] = dto.priority

        collection = Todo.get_motor_collection()

        if dto.revision is not None:
            result = await collection.find_one_and_update(
                {"_id": ObjectId(oid), "revision": dto.revision},
                {"$set": updates, "$inc": {"revision": 1}},
                return_document=True,
            )
            if result is None:
                exists = await Todo.get(oid)
                if exists is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Todo not found",
                    )
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Version conflict. Please reload and try again.",
                )
            doc = Todo.model_validate(result)
        else:
            result = await collection.find_one_and_update(
                {"_id": ObjectId(oid)},
                {"$set": updates, "$inc": {"revision": 1}},
                return_document=True,
            )
            if result is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Todo not found",
                )
            doc = Todo.model_validate(result)

        return _to_response(doc)

    async def remove(self, todo_id: str) -> None:
        oid = PydanticObjectId(todo_id)
        doc = await Todo.get(oid)
        if doc is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Todo not found")
        await doc.delete()
