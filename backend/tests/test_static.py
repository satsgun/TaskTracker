import importlib

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

import app.database as database_module
import app.main as main_module


def _use_in_memory_engine(monkeypatch):
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    monkeypatch.setattr(database_module, "engine", test_engine)


def test_serves_frontend_build_when_present(tmp_path, monkeypatch):
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text("<html><body>Task Tracker</body></html>")

    monkeypatch.setenv("FRONTEND_DIST", str(dist))
    _use_in_memory_engine(monkeypatch)
    importlib.reload(main_module)

    client = TestClient(main_module.app)
    response = client.get("/")

    assert response.status_code == 200
    assert "Task Tracker" in response.text


def test_health_check_unaffected_when_frontend_build_missing(tmp_path, monkeypatch):
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path / "does-not-exist"))
    _use_in_memory_engine(monkeypatch)
    importlib.reload(main_module)

    client = TestClient(main_module.app)

    assert client.get("/health").status_code == 200
    assert client.get("/").status_code == 404
