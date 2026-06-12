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
