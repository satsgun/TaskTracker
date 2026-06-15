from fastapi.testclient import TestClient

from app.config import DEMO_USER_EMAIL, DEMO_USER_PASSWORD
from app.main import _seed_demo_user, app


class TestDemoUserSeed:
    def test_demo_user_can_log_in_after_seeding(self, db_session_factory):
        _seed_demo_user(db_session_factory)

        client = TestClient(app)
        response = client.post(
            "/auth/login", json={"email": DEMO_USER_EMAIL, "password": DEMO_USER_PASSWORD}
        )

        assert response.status_code == 200
        assert response.json()["email"] == DEMO_USER_EMAIL

    def test_seeding_twice_does_not_duplicate_or_break_login(self, db_session_factory):
        _seed_demo_user(db_session_factory)
        _seed_demo_user(db_session_factory)

        client = TestClient(app)
        response = client.post(
            "/auth/login", json={"email": DEMO_USER_EMAIL, "password": DEMO_USER_PASSWORD}
        )

        assert response.status_code == 200
