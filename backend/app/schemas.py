from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator


class TaskCreate(BaseModel):
    description: str
    priority: Literal["High", "Medium", "Low"] = "Medium"
    due_date: date | None = None

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("description must not be empty")
        return value


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    priority: str
    due_date: date | None
    status: str
    created_at: datetime
