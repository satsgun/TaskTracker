from fastapi.testclient import TestClient

from app.main import app


class TestRouteProtection:
    def test_add_task_without_session_returns_401(self):
        anon = TestClient(app)

        response = anon.post("/tasks/", json={"description": "Buy milk"})

        assert response.status_code == 401

    def test_list_tasks_without_session_returns_401(self):
        anon = TestClient(app)

        response = anon.get("/tasks/list")

        assert response.status_code == 401

    def test_update_task_without_session_returns_401(self):
        anon = TestClient(app)

        response = anon.patch("/tasks/1/", json={"description": "Anything"})

        assert response.status_code == 401

    def test_delete_task_without_session_returns_401(self):
        anon = TestClient(app)

        response = anon.delete("/tasks/1/")

        assert response.status_code == 401
