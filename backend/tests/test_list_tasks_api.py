import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

pytestmark = pytest.mark.xfail(
    strict=True, reason="GET /tasks/ not yet implemented (see Task 25+)"
)


def _create_task(**overrides):
    payload = {"description": "Task"}
    payload.update(overrides)
    response = client.post("/tasks/", json=payload)
    return response.json()


class TestListTasks:
    def test_list_tasks_returns_200_and_a_list(self):
        response = client.get("/tasks/")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_tasks_includes_created_tasks(self):
        created = _create_task(description="Buy milk")

        response = client.get("/tasks/")

        ids = [task["id"] for task in response.json()]
        assert created["id"] in ids

    def test_default_status_is_all_includes_complete_and_incomplete(self):
        incomplete = _create_task(description="Write report")
        complete = _create_task(description="Pay bills")
        client.patch(f"/tasks/{complete['id']}/complete")

        response = client.get("/tasks/")

        ids = [task["id"] for task in response.json()]
        assert incomplete["id"] in ids
        assert complete["id"] in ids

    def test_status_pending_excludes_complete_tasks(self):
        incomplete = _create_task(description="Water plants")
        complete = _create_task(description="Renew passport")
        client.patch(f"/tasks/{complete['id']}/complete")

        response = client.get("/tasks/", params={"status": "pending"})

        ids = [task["id"] for task in response.json()]
        assert incomplete["id"] in ids
        assert complete["id"] not in ids

    def test_status_all_includes_complete_tasks(self):
        complete = _create_task(description="File taxes")
        client.patch(f"/tasks/{complete['id']}/complete")

        response = client.get("/tasks/", params={"status": "all"})

        ids = [task["id"] for task in response.json()]
        assert complete["id"] in ids

    def test_invalid_status_returns_422(self):
        response = client.get("/tasks/", params={"status": "bogus"})

        assert response.status_code == 422
        assert "detail" in response.json()

    def test_search_filters_by_description_case_insensitive(self):
        match = _create_task(description="Buy groceries")
        other = _create_task(description="Schedule dentist")

        response = client.get("/tasks/", params={"q": "GROCER"})

        ids = [task["id"] for task in response.json()]
        assert match["id"] in ids
        assert other["id"] not in ids

    def test_search_with_no_matches_returns_empty_list(self):
        response = client.get("/tasks/", params={"q": "no-such-task-zzz"})

        assert response.json() == []

    def test_combined_status_and_search(self):
        incomplete_match = _create_task(description="Buy stamps")
        complete_match = _create_task(description="Buy a gift")
        client.patch(f"/tasks/{complete_match['id']}/complete")

        response = client.get("/tasks/", params={"status": "pending", "q": "buy"})

        ids = [task["id"] for task in response.json()]
        assert incomplete_match["id"] in ids
        assert complete_match["id"] not in ids
