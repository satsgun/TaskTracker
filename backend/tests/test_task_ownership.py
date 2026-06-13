from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import Task


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


class TestTaskAttribution:
    def test_add_task_without_session_creates_no_row(self, db_session):
        anon = TestClient(app)

        anon.post("/tasks/", json={"description": "Buy milk"})

        assert db_session.execute(select(Task)).scalars().all() == []

    def test_add_task_attributes_to_session_user(self, auth_client, db_session):
        response = auth_client.post("/tasks/", json={"description": "Buy milk"})
        task_id = response.json()["id"]

        me = auth_client.get("/auth/me").json()

        task = db_session.get(Task, task_id)
        assert task.user_id == me["id"]

    def test_add_task_ignores_client_supplied_user_id(self, auth_client, db_session):
        response = auth_client.post("/tasks/", json={"description": "Buy milk", "user_id": 999999})
        task_id = response.json()["id"]

        me = auth_client.get("/auth/me").json()

        task = db_session.get(Task, task_id)
        assert task.user_id == me["id"]
        assert task.user_id != 999999

    def test_task_user_id_is_non_null(self, auth_client, db_session):
        auth_client.post("/tasks/", json={"description": "Buy milk"})

        task = db_session.execute(select(Task)).scalars().one()
        assert task.user_id is not None


class TestListTasksIsolation:
    def test_list_tasks_only_returns_own_tasks(self, auth_client, second_auth_client):
        auth_client.post("/tasks/", json={"description": "User A task 1"})
        auth_client.post("/tasks/", json={"description": "User A task 2"})
        second_auth_client.post("/tasks/", json={"description": "User B task 1"})

        response = auth_client.get("/tasks/list")

        assert response.status_code == 200
        descriptions = {task["description"] for task in response.json()}
        assert descriptions == {"User A task 1", "User A task 2"}

    def test_list_tasks_for_user_with_no_tasks_returns_empty_list(self, second_auth_client):
        response = second_auth_client.get("/tasks/list")

        assert response.status_code == 200
        assert response.json() == []
