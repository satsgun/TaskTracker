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


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("name must not be empty")
        return value

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, value: str) -> str:
        if "@" not in value or not value.strip():
            raise ValueError("email must be valid")
        return value

    @field_validator("password")
    @classmethod
    def password_must_meet_minimum_length(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("password must be at least 8 characters")
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    created_at: datetime
