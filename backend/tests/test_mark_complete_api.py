import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

pytestmark = pytest.mark.xfail(
    strict=True, reason="PATCH /tasks/<id>/ not yet implemented (see Task 25+)"
)


def _create_task(**overrides):
    payload = {"description": "Task"}
    payload.update(overrides)
    response = client.post("/tasks/", json=payload)
    return response.json()


class TestMarkAsComplete:
    def test_mark_task_complete_returns_204(self):
        task = _create_task(description="Buy milk")

        response = client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        assert response.status_code == 204
        assert response.content == b""

    def test_mark_task_complete_updates_status(self):
        task = _create_task(description="Write report")

        client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        listed = client.get("/tasks/list").json()
        updated = next(t for t in listed if t["id"] == task["id"])
        assert updated["status"] == "Complete"

    def test_mark_task_incomplete_returns_204_and_updates_status(self):
        task = _create_task(description="Pay bills")
        client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        response = client.patch(f"/tasks/{task['id']}/", json={"status": "Incomplete"})

        assert response.status_code == 204
        listed = client.get("/tasks/list").json()
        updated = next(t for t in listed if t["id"] == task["id"])
        assert updated["status"] == "Incomplete"

    def test_marking_complete_does_not_change_description(self):
        task = _create_task(description="Renew passport")

        response = client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        assert response.status_code == 204
        listed = client.get("/tasks/list").json()
        updated = next(t for t in listed if t["id"] == task["id"])
        assert updated["description"] == "Renew passport"

    def test_mark_nonexistent_task_returns_404(self):
        response = client.patch("/tasks/999999/", json={"status": "Complete"})

        assert response.status_code == 404
        assert "999999" in response.json()["detail"]

    def test_invalid_status_value_returns_422(self):
        task = _create_task(description="Schedule dentist")

        response = client.patch(f"/tasks/{task['id']}/", json={"status": "Done"})

        assert response.status_code == 422
        assert "detail" in response.json()

    def test_empty_body_returns_422(self):
        task = _create_task(description="Water plants")

        response = client.patch(f"/tasks/{task['id']}/", json={})

        assert response.status_code == 422
