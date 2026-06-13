import os

os.environ.setdefault("COOKIE_SECURE", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def db_session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def _get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db
    yield TestingSessionLocal
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _override_db(db_session_factory):
    yield


@pytest.fixture
def db_session(db_session_factory):
    db = db_session_factory()
    try:
        yield db
    finally:
        db.close()


def create_test_user(db, *, email: str = "user@example.com"):
    from app.crud import create_user

    return create_user(db, first_name="Test", last_name="User", email=email, hashed_password="hashed")


def _signup_and_login(email: str, password: str = "super-secret") -> TestClient:
    client = TestClient(app)
    client.post(
        "/auth/signup",
        json={"first_name": "Test", "last_name": "User", "email": email, "password": password},
    )
    client.post("/auth/login", json={"email": email, "password": password})
    return client


@pytest.fixture
def auth_client(db_session_factory):
    return _signup_and_login("user-a@example.com")


@pytest.fixture
def second_auth_client(db_session_factory):
    return _signup_and_login("user-b@example.com")


@pytest.fixture
def client(db_session_factory):
    return _signup_and_login("default-user@example.com")
