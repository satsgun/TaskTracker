def _create_task(client, **overrides):
    payload = {"description": "Task"}
    payload.update(overrides)
    response = client.post("/tasks/", json=payload)
    return response.json()


def _mark_complete(client, task_id):
    client.patch(f"/tasks/{task_id}/", json={"status": "Complete"})


class TestListTasks:
    def test_list_tasks_returns_200_and_a_list(self, client):
        response = client.get("/tasks/list")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_tasks_includes_created_tasks(self, client):
        created = _create_task(client, description="Buy milk")

        response = client.get("/tasks/list")

        ids = [task["id"] for task in response.json()]
        assert created["id"] in ids

    def test_default_status_is_all_includes_complete_and_incomplete(self, client):
        incomplete = _create_task(client, description="Write report")
        complete = _create_task(client, description="Pay bills")
        _mark_complete(client, complete["id"])

        response = client.get("/tasks/list")

        ids = [task["id"] for task in response.json()]
        assert incomplete["id"] in ids
        assert complete["id"] in ids

    def test_status_pending_excludes_complete_tasks(self, client):
        incomplete = _create_task(client, description="Water plants")
        complete = _create_task(client, description="Renew passport")
        _mark_complete(client, complete["id"])

        response = client.get("/tasks/list", params={"status": "pending"})

        ids = [task["id"] for task in response.json()]
        assert incomplete["id"] in ids
        assert complete["id"] not in ids

    def test_status_all_includes_complete_tasks(self, client):
        complete = _create_task(client, description="File taxes")
        _mark_complete(client, complete["id"])

        response = client.get("/tasks/list", params={"status": "all"})

        ids = [task["id"] for task in response.json()]
        assert complete["id"] in ids

    def test_invalid_status_returns_422(self, client):
        response = client.get("/tasks/list", params={"status": "bogus"})

        assert response.status_code == 422
        assert "detail" in response.json()

    def test_search_filters_by_description_case_insensitive(self, client):
        match = _create_task(client, description="Buy groceries")
        other = _create_task(client, description="Schedule dentist")

        response = client.get("/tasks/list", params={"q": "GROCER"})

        ids = [task["id"] for task in response.json()]
        assert match["id"] in ids
        assert other["id"] not in ids

    def test_search_with_no_matches_returns_empty_list(self, client):
        response = client.get("/tasks/list", params={"q": "no-such-task-zzz"})

        assert response.json() == []

    def test_combined_status_and_search(self, client):
        incomplete_match = _create_task(client, description="Buy stamps")
        complete_match = _create_task(client, description="Buy a gift")
        _mark_complete(client, complete_match["id"])

        response = client.get("/tasks/list", params={"status": "pending", "q": "buy"})

        ids = [task["id"] for task in response.json()]
        assert incomplete_match["id"] in ids
        assert complete_match["id"] not in ids

    def test_results_are_sorted_by_priority(self, client):
        low = _create_task(client, description="Low priority sort marker", priority="Low")
        high = _create_task(client, description="High priority sort marker", priority="High")
        medium = _create_task(client, description="Medium priority sort marker", priority="Medium")

        response = client.get("/tasks/list", params={"q": "sort marker"})

        ids = [task["id"] for task in response.json()]
        assert ids.index(high["id"]) < ids.index(medium["id"]) < ids.index(low["id"])
