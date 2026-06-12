import pytest


def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class TestUserModel:
    def test_user_stores_first_name_last_name_email_and_hashed_password(self):
        from app.models import User

        db = _make_session()

        user = User(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@example.com",
            hashed_password="hashed-value",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.id is not None
        assert user.first_name == "Ada"
        assert user.last_name == "Lovelace"
        assert user.email == "ada@example.com"
        assert user.hashed_password == "hashed-value"

    def test_user_sets_created_at_timestamp(self):
        from app.models import User

        db = _make_session()

        user = User(
            first_name="Ada",
            last_name="Lovelace",
            email="ada@example.com",
            hashed_password="hashed-value",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        assert user.created_at is not None

    def test_user_email_must_be_unique(self):
        from sqlalchemy.exc import IntegrityError

        from app.models import User

        db = _make_session()

        db.add(
            User(
                first_name="Ada",
                last_name="Lovelace",
                email="ada@example.com",
                hashed_password="hashed-value",
            )
        )
        db.commit()

        db.add(
            User(
                first_name="Other",
                last_name="Person",
                email="ada@example.com",
                hashed_password="another-hash",
            )
        )

        with pytest.raises(IntegrityError):
            db.commit()
