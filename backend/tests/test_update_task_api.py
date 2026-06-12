def _create_task(client, **overrides):
    payload = {"description": "Task"}
    payload.update(overrides)
    response = client.post("/tasks/", json=payload)
    return response.json()


def _get(client, task_id):
    listed = client.get("/tasks/list").json()
    return next(t for t in listed if t["id"] == task_id)


class TestUpdateTask:
    def test_update_description_only_returns_204(self, client):
        task = _create_task(client, description="Buy milk")

        response = client.patch(f"/tasks/{task['id']}/", json={"description": "Buy oat milk"})

        assert response.status_code == 204
        assert response.content == b""

    def test_update_description_only_changes_description_and_preserves_status(self, client):
        task = _create_task(client, description="Buy milk")
        client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        client.patch(f"/tasks/{task['id']}/", json={"description": "Buy oat milk"})

        updated = _get(client, task["id"])
        assert updated["description"] == "Buy oat milk"
        assert updated["status"] == "Complete"

    def test_update_status_only_preserves_description(self, client):
        task = _create_task(client, description="Write report")

        client.patch(f"/tasks/{task['id']}/", json={"status": "Complete"})

        updated = _get(client, task["id"])
        assert updated["description"] == "Write report"
        assert updated["status"] == "Complete"

    def test_update_description_and_status_together(self, client):
        task = _create_task(client, description="Pay bills")

        response = client.patch(
            f"/tasks/{task['id']}/",
            json={"description": "Pay rent and bills", "status": "Complete"},
        )

        assert response.status_code == 204
        updated = _get(client, task["id"])
        assert updated["description"] == "Pay rent and bills"
        assert updated["status"] == "Complete"

    def test_update_nonexistent_task_returns_404(self, client):
        response = client.patch("/tasks/999999/", json={"description": "Anything"})

        assert response.status_code == 404
        assert "999999" in response.json()["detail"]

    def test_update_with_empty_description_returns_422(self, client):
        task = _create_task(client, description="Renew passport")

        response = client.patch(f"/tasks/{task['id']}/", json={"description": ""})

        assert response.status_code == 422

    def test_update_with_whitespace_only_description_returns_422(self, client):
        task = _create_task(client, description="Schedule dentist")

        response = client.patch(f"/tasks/{task['id']}/", json={"description": "   "})

        assert response.status_code == 422

    def test_update_with_invalid_status_returns_422(self, client):
        task = _create_task(client, description="Water plants")

        response = client.patch(f"/tasks/{task['id']}/", json={"status": "Done"})

        assert response.status_code == 422

    def test_update_with_empty_body_returns_422(self, client):
        task = _create_task(client, description="File taxes")

        response = client.patch(f"/tasks/{task['id']}/", json={})

        assert response.status_code == 422
