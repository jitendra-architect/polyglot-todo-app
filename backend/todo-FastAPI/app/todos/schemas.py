from __future__ import annotations

from datetime import datetime
from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from app.todos.models import TodoStatus


# ── Helpers ───────────────────────────────────────────────────────────────────

def _object_id_to_str(v: object) -> str:
    return str(v) if isinstance(v, ObjectId) else str(v)


# ── Request schemas ───────────────────────────────────────────────────────────

class CreateTodoSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TodoStatus = TodoStatus.TODO
    priority: int = Field(default=3, ge=1, le=5)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank")
        return stripped


class UpdateTodoSchema(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[TodoStatus] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    # Optimistic concurrency version — must match the stored revision
    revision: Optional[int] = Field(default=None, ge=0)

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank")
        return stripped


class ListTodosQuerySchema(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    status: Optional[TodoStatus] = None


# ── Response schemas ──────────────────────────────────────────────────────────

class TodoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    status: TodoStatus
    priority: int
    revision: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("id")
    def serialize_id(self, v: object) -> str:
        return _object_id_to_str(v)


class TodoListResponse(BaseModel):
    items: list[TodoResponse]
    total: int
    page: int
    limit: int


class DeleteResponse(BaseModel):
    status: str = "ok"
