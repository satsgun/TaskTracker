from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Task

_PRIORITY_RANK = {"High": 0, "Medium": 1, "Low": 2}


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


def delete_task(db: Session, task_id: int) -> bool:
    task = db.get(Task, task_id)
    if task is None:
        return False

    db.delete(task)
    db.commit()
    return True


def update_task(db: Session, task_id: int, description: str) -> Task | None:
    task = db.get(Task, task_id)
    if task is None:
        return None

    task.description = description
    db.commit()
    db.refresh(task)
    return task


def list_tasks(db: Session, status: str = "all", q: str | None = None) -> list[Task]:
    stmt = select(Task)

    if status == "pending":
        stmt = stmt.where(Task.status == "Incomplete")

    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = stmt.where(Task.description.ilike(f"%{escaped}%", escape="\\"))

    stmt = stmt.order_by(Task.id)

    tasks = list(db.execute(stmt).scalars().all())
    tasks.sort(key=lambda task: _PRIORITY_RANK.get(task.priority, len(_PRIORITY_RANK)))
    return tasks
