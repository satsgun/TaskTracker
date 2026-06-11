import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Task Tracker")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


_DEFAULT_FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
_frontend_dist = Path(os.environ.get("FRONTEND_DIST", _DEFAULT_FRONTEND_DIST))

if _frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=_frontend_dist, html=True), name="frontend")
