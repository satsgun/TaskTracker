from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Task, User

_PRIORITY_RANK = {"High": 0, "Medium": 1, "Low": 2}


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def create_user(db: Session, first_name: str, last_name: str, email: str, hashed_password: str) -> User:
    user = User(first_name=first_name, last_name=last_name, email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_task(
    db: Session, description: str, priority: str | None = None, due_date: date | None = None
) -> Task:
    task = Task(description=description, due_date=due_date)
    if priority is not None:
        task.priority = priority
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


def apply_update(
    db: Session, task_id: int, description: str | None = None, status: str | None = None
) -> Task | None:
    task = db.get(Task, task_id)
    if task is None:
        return None

    if description is not None:
        task.description = description

    if status is not None:
        task.status = status

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
