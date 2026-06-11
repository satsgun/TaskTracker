from datetime import date

from sqlalchemy.orm import Session

from app.models import Task


def create_task(
    db: Session, description: str, priority: str = "Medium", due_date: date | None = None
) -> Task:
    task = Task(description=description, priority=priority, due_date=due_date)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task
