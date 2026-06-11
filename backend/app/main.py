import os
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import crud
from app.database import Base, engine, get_db
from app.schemas import TaskCreate, TaskOut, TaskUpdate

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Tracker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/tasks/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def add_task(task: TaskCreate, db: Session = Depends(get_db)) -> TaskOut:
    return crud.create_task(db, description=task.description, priority=task.priority, due_date=task.due_date)


@app.get("/tasks/list", response_model=list[TaskOut])
def list_tasks(
    status: Literal["pending", "all"] = "all", q: str | None = None, db: Session = Depends(get_db)
) -> list[TaskOut]:
    return crud.list_tasks(db, status=status, q=q)


@app.patch("/tasks/{task_id}/", status_code=status.HTTP_204_NO_CONTENT)
def update_task(task_id: int, task: TaskUpdate, db: Session = Depends(get_db)) -> None:
    if task.description is not None:
        updated = crud.update_task(db, task_id, description=task.description)
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if task.status is not None:
        updated = crud.set_status(db, task_id, task.status)
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")


_DEFAULT_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_dist = Path(os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND_DIST))

if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
