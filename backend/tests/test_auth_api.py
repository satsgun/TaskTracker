from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import AuthSession

client = TestClient(app)


class TestSignup:
    def test_signup_with_valid_fields_returns_201(self):
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": "ada@example.com",
                "password": "super-secret",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["first_name"] == "Ada"
        assert body["last_name"] == "Lovelace"
        assert body["email"] == "ada@example.com"
        assert "id" in body
        assert "created_at" in body

    def test_signup_response_never_contains_password(self):
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": "ada2@example.com",
                "password": "super-secret",
            },
        )

        assert response.status_code == 201
        assert "password" not in response.json()
        assert "hashed_password" not in response.json()
        assert "super-secret" not in response.text

    def test_signup_with_duplicate_email_returns_409(self):
        payload = {
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "duplicate@example.com",
            "password": "super-secret",
        }

        first = client.post("/auth/signup", json=payload)
        assert first.status_code == 201

        second = client.post("/auth/signup", json=payload)
        assert second.status_code == 409

    def test_signup_with_invalid_email_returns_422(self):
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": "not-an-email",
                "password": "super-secret",
            },
        )

        assert response.status_code == 422

    def test_signup_with_short_password_returns_422(self):
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": "ada3@example.com",
                "password": "short",
            },
        )

        assert response.status_code == 422

    def test_signup_with_blank_first_name_returns_422(self):
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "  ",
                "last_name": "Lovelace",
                "email": "ada4@example.com",
                "password": "super-secret",
            },
        )

        assert response.status_code == 422


class TestLogin:
    def _signup(self, email: str, password: str = "super-secret") -> None:
        response = client.post(
            "/auth/signup",
            json={
                "first_name": "Ada",
                "last_name": "Lovelace",
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == 201

    def test_login_with_correct_credentials_returns_200(self):
        self._signup("login-ok@example.com", "correct-password")

        response = client.post(
            "/auth/login", json={"email": "login-ok@example.com", "password": "correct-password"}
        )

        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "login-ok@example.com"
        assert "password" not in body
        assert "hashed_password" not in body

    def test_login_with_wrong_password_returns_401_with_uniform_message(self):
        self._signup("login-wrong-pw@example.com", "correct-password")

        response = client.post(
            "/auth/login", json={"email": "login-wrong-pw@example.com", "password": "wrong-password"}
        )

        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid email or password"}

    def test_login_with_unregistered_email_returns_401_with_identical_body(self):
        wrong_password_response = client.post(
            "/auth/login", json={"email": "login-no-such-user@example.com", "password": "anything"}
        )

        self._signup("login-identical-check@example.com", "correct-password")
        unregistered_response = client.post(
            "/auth/login", json={"email": "login-does-not-exist@example.com", "password": "anything"}
        )
        wrong_password_for_real_user = client.post(
            "/auth/login",
            json={"email": "login-identical-check@example.com", "password": "incorrect"},
        )

        assert wrong_password_response.status_code == 401
        assert unregistered_response.status_code == 401
        assert wrong_password_for_real_user.status_code == 401
        assert unregistered_response.json() == wrong_password_for_real_user.json()
        assert unregistered_response.json() == {"detail": "Invalid email or password"}


class TestLoginSession:
    def test_login_sets_session_cookie(self):
        signup = client.post(
            "/auth/signup",
            json={
                "first_name": "Grace",
                "last_name": "Hopper",
                "email": "session-cookie@example.com",
                "password": "super-secret",
            },
        )
        assert signup.status_code == 201

        response = client.post(
            "/auth/login", json={"email": "session-cookie@example.com", "password": "super-secret"}
        )

        assert response.status_code == 200
        assert "session_id" in response.cookies
        assert "HttpOnly" in response.headers["set-cookie"]


class TestMe:
    def test_me_without_cookie_returns_401(self):
        anon = TestClient(app)

        response = anon.get("/auth/me")

        assert response.status_code == 401

    def test_me_with_valid_cookie_returns_current_user(self):
        logged_in = TestClient(app)
        logged_in.post(
            "/auth/signup",
            json={
                "first_name": "Grace",
                "last_name": "Hopper",
                "email": "me-valid@example.com",
                "password": "super-secret",
            },
        )
        logged_in.post("/auth/login", json={"email": "me-valid@example.com", "password": "super-secret"})

        response = logged_in.get("/auth/me")

        assert response.status_code == 200
        assert response.json()["email"] == "me-valid@example.com"

    def test_me_after_idle_timeout_returns_401(self, db_session):
        idle_client = TestClient(app)
        idle_client.post(
            "/auth/signup",
            json={
                "first_name": "Grace",
                "last_name": "Hopper",
                "email": "me-idle@example.com",
                "password": "super-secret",
            },
        )
        idle_client.post("/auth/login", json={"email": "me-idle@example.com", "password": "super-secret"})

        session = db_session.execute(select(AuthSession)).scalars().one()
        session.last_seen_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=31)
        db_session.commit()

        response = idle_client.get("/auth/me")

        assert response.status_code == 401


class TestLogout:
    def test_logout_returns_204(self, auth_client):
        response = auth_client.post("/auth/logout")

        assert response.status_code == 204

    def test_me_after_logout_returns_401(self, auth_client):
        auth_client.post("/auth/logout")

        response = auth_client.get("/auth/me")

        assert response.status_code == 401

    def test_list_tasks_after_logout_returns_401(self, auth_client):
        auth_client.post("/auth/logout")

        response = auth_client.get("/tasks/list")

        assert response.status_code == 401
