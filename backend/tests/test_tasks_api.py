import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

pytestmark = pytest.mark.xfail(
    strict=True, reason="POST /tasks/ not yet implemented (see Task 25+)"
)


class TestAddTask:
    def test_create_task_with_required_fields_only_returns_201(self):
        response = client.post("/tasks/", json={"description": "Buy milk"})

        assert response.status_code == 201
        body = response.json()
        assert body["description"] == "Buy milk"
        assert body["priority"] == "Medium"
        assert body["due_date"] is None
        assert body["status"] == "Incomplete"
        assert isinstance(body["id"], int)
        assert "created_at" in body

    def test_create_task_with_all_fields_returns_201(self):
        response = client.post(
            "/tasks/",
            json={"description": "Submit report", "priority": "High", "due_date": "2026-07-01"},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["description"] == "Submit report"
        assert body["priority"] == "High"
        assert body["due_date"] == "2026-07-01"
        assert body["status"] == "Incomplete"

    def test_each_created_task_gets_a_unique_id(self):
        first = client.post("/tasks/", json={"description": "First task"})
        second = client.post("/tasks/", json={"description": "Second task"})

        assert first.json()["id"] != second.json()["id"]

    def test_missing_description_returns_422(self):
        response = client.post("/tasks/", json={"priority": "High"})

        assert response.status_code == 422
        assert "detail" in response.json()

    def test_empty_description_returns_422(self):
        response = client.post("/tasks/", json={"description": ""})

        assert response.status_code == 422

    def test_whitespace_only_description_returns_422(self):
        response = client.post("/tasks/", json={"description": "   "})

        assert response.status_code == 422

    def test_invalid_priority_returns_422(self):
        response = client.post("/tasks/", json={"description": "Task", "priority": "Urgent"})

        assert response.status_code == 422

    def test_invalid_due_date_format_returns_422(self):
        response = client.post("/tasks/", json={"description": "Task", "due_date": "not-a-date"})

        assert response.status_code == 422
