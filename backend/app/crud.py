from datetime import date

from sqlalchemy import case, select
from sqlalchemy.orm import Session

from app.models import Task

_PRIORITY_ORDER = case((Task.priority == "High", 0), (Task.priority == "Medium", 1), (Task.priority == "Low", 2))


def create_task(
    db: Session, description: str, priority: str = "Medium", due_date: date | None = None
) -> Task:
    task = Task(description=description, priority=priority, due_date=due_date)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def set_status(db: Session, task_id: int, status: str) -> Task | None:
    task = db.get(Task, task_id)
    if task is None:
        return None

    task.status = status
    db.commit()
    db.refresh(task)
    return task


def list_tasks(db: Session, status: str = "all", q: str | None = None) -> list[Task]:
    stmt = select(Task)

    if status == "pending":
        stmt = stmt.where(Task.status == "Incomplete")

    if q:
        stmt = stmt.where(Task.description.ilike(f"%{q}%"))

    stmt = stmt.order_by(_PRIORITY_ORDER)

    return list(db.execute(stmt).scalars().all())
