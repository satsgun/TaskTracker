from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


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


class TaskUpdate(BaseModel):
    description: str | None = None
    status: Literal["Complete", "Incomplete"] | None = None

    @field_validator("description")
    @classmethod
    def description_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("description must not be empty")
        return value

    @model_validator(mode="after")
    def at_least_one_field_required(self) -> "TaskUpdate":
        if self.description is None and self.status is None:
            raise ValueError("at least one of description or status is required")
        return self


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    priority: str
    due_date: date | None
    status: str
    created_at: datetime
