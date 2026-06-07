from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Any, ClassVar, Optional

from beanie import Document, Indexed
from pymongo import ASCENDING, IndexModel
from pydantic import Field


class TodoStatus(str, Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"


class Todo(Document):
    """MongoDB document for a single Todo item.

    ``revision`` is used for optimistic concurrency: the service increments it
    on every successful write and rejects updates where the client's submitted
    revision no longer matches the stored one.
    """

    title: Annotated[str, Indexed()] = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TodoStatus = TodoStatus.TODO
    priority: int = Field(default=3, ge=1, le=5)
    revision: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "todos"
        indexes: ClassVar[list[Any]] = [
            IndexModel([("status", ASCENDING), ("due_date", ASCENDING)]),
        ]
