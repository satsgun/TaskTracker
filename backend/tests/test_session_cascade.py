def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class TestSessionCascadeDelete:
    def test_deleting_user_deletes_their_sessions(self):
        from app import crud
        from app.models import AuthSession

        db = _make_session()

        user = crud.create_user(db, first_name="Ada", last_name="Lovelace", email="ada@example.com", hashed_password="hashed")
        session = crud.create_session(db, user_id=user.id)
        session_id = session.id

        db.delete(user)
        db.commit()

        assert db.get(AuthSession, session_id) is None
