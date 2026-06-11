import os
from pathlib import Path

from fastapi import Depends, FastAPI, status
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app import crud
from app.database import Base, engine, get_db
from app.schemas import TaskCreate, TaskOut

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Tracker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/tasks/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def add_task(task: TaskCreate, db: Session = Depends(get_db)) -> TaskOut:
    return crud.create_task(db, description=task.description, priority=task.priority, due_date=task.due_date)


_DEFAULT_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_dist = Path(os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND_DIST))

if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
