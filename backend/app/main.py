import os
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import crud
from app.auth import get_current_user
from app.config import COOKIE_SECURE, SESSION_COOKIE_NAME
from app.database import Base, engine, get_db
from app.models import User
from app.schemas import TaskCreate, TaskOut, TaskUpdate, UserCreate, UserLogin, UserOut
from app.security import hash_password, verify_password

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Tracker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)) -> UserOut:
    if crud.get_user_by_email(db, user.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    return crud.create_user(
        db,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        hashed_password=hash_password(user.password),
    )


@app.post("/auth/login", response_model=UserOut)
def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)) -> UserOut:
    user = crud.get_user_by_email(db, credentials.email)
    if user is None or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    session = crud.create_session(db, user_id=user.id)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session.id,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )

    return user


@app.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return user


@app.post("/tasks/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def add_task(task: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> TaskOut:
    return crud.create_task(
        db, description=task.description, priority=task.priority, due_date=task.due_date, user_id=user.id
    )


@app.get("/tasks/list", response_model=list[TaskOut])
def list_tasks(
    task_status: Literal["pending", "all"] = Query("all", alias="status"),
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TaskOut]:
    return crud.list_tasks(db, status=task_status, q=q, user_id=user.id)


@app.patch("/tasks/{task_id}/", status_code=status.HTTP_204_NO_CONTENT)
def update_task(
    task_id: int, task: TaskUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    updated = crud.apply_update(db, task_id, user_id=user.id, description=task.description, status=task.status)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


@app.delete("/tasks/{task_id}/", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    if not crud.delete_task(db, task_id, user_id=user.id):
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


_DEFAULT_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_dist = Path(os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND_DIST))

if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
