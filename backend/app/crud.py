from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthSession, Task, User
from app.security import generate_session_token

_PRIORITY_RANK = {"High": 0, "Medium": 1, "Low": 2}


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def create_user(db: Session, first_name: str, last_name: str, email: str, hashed_password: str) -> User:
    user = User(first_name=first_name, last_name=last_name, email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_session(db: Session, user_id: int) -> AuthSession:
    session = AuthSession(id=generate_session_token(), user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_session_with_user(db: Session, session_id: str) -> tuple[AuthSession, User] | None:
    return db.execute(
        select(AuthSession, User).join(User, AuthSession.user_id == User.id).where(AuthSession.id == session_id)
    ).first()


def touch_session(db: Session, session: AuthSession) -> None:
    session.last_seen_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()


def delete_session(db: Session, session_id: str) -> None:
    session = db.get(AuthSession, session_id)
    if session is not None:
        db.delete(session)
        db.commit()


def create_task(
    db: Session,
    description: str,
    priority: str | None = None,
    due_date: date | None = None,
    *,
    user_id: int,
) -> Task:
    task = Task(description=description, due_date=due_date, user_id=user_id)
    if priority is not None:
        task.priority = priority
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def _get_owned_task(db: Session, task_id: int, user_id: int) -> Task | None:
    return db.execute(select(Task).where(Task.id == task_id, Task.user_id == user_id)).scalar_one_or_none()


def delete_task(db: Session, task_id: int, user_id: int) -> bool:
    task = _get_owned_task(db, task_id, user_id)
    if task is None:
        return False

    db.delete(task)
    db.commit()
    return True


def apply_update(
    db: Session, task_id: int, user_id: int, description: str | None = None, status: str | None = None
) -> Task | None:
    task = _get_owned_task(db, task_id, user_id)
    if task is None:
        return None

    if description is not None:
        task.description = description

    if status is not None:
        task.status = status

    db.commit()
    db.refresh(task)
    return task


def list_tasks(db: Session, status: str = "all", q: str | None = None, *, user_id: int) -> list[Task]:
    stmt = select(Task).where(Task.user_id == user_id)

    if status == "pending":
        stmt = stmt.where(Task.status == "Incomplete")

    if q:
        escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = stmt.where(Task.description.ilike(f"%{escaped}%", escape="\\"))

    stmt = stmt.order_by(Task.id)

    tasks = list(db.execute(stmt).scalars().all())
    tasks.sort(key=lambda task: _PRIORITY_RANK.get(task.priority, len(_PRIORITY_RANK)))
    return tasks
