from fastapi.testclient import TestClient

from app.main import app

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
