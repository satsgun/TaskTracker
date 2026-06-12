def _create_task(client, **overrides):
    payload = {"description": "Task"}
    payload.update(overrides)
    response = client.post("/tasks/", json=payload)
    return response.json()


class TestDeleteTask:
    def test_delete_existing_task_returns_204(self, client):
        task = _create_task(client, description="Buy milk")

        response = client.delete(f"/tasks/{task['id']}/")

        assert response.status_code == 204
        assert response.content == b""

    def test_deleted_task_no_longer_in_list(self, client):
        task = _create_task(client, description="Write report")

        client.delete(f"/tasks/{task['id']}/")

        listed = client.get("/tasks/list").json()
        ids = [t["id"] for t in listed]
        assert task["id"] not in ids

    def test_delete_nonexistent_task_returns_404(self, client):
        response = client.delete("/tasks/999999/")

        assert response.status_code == 404
        assert "999999" in response.json()["detail"]

    def test_delete_already_deleted_task_returns_404(self, client):
        task = _create_task(client, description="Pay bills")
        client.delete(f"/tasks/{task['id']}/")

        response = client.delete(f"/tasks/{task['id']}/")

        assert response.status_code == 404
        assert str(task["id"]) in response.json()["detail"]

    def test_deleting_one_task_does_not_affect_others(self, client):
        keep = _create_task(client, description="Renew passport")
        remove = _create_task(client, description="Schedule dentist")

        client.delete(f"/tasks/{remove['id']}/")

        listed = client.get("/tasks/list").json()
        ids = [t["id"] for t in listed]
        assert keep["id"] in ids
        assert remove["id"] not in ids
