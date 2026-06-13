def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def _create_user(db):
    from app.crud import create_user

    return create_user(db, first_name="Test", last_name="User", email="user@example.com", hashed_password="hashed")


class TestSetStatus:
    def test_set_status_to_complete_updates_status(self):
        from app.crud import create_task, set_status

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Buy milk", user_id=user.id)

        updated = set_status(db, task.id, "Complete")

        assert updated.status == "Complete"

    def test_set_status_to_incomplete_updates_status(self):
        from app.crud import create_task, set_status

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Pay bills", user_id=user.id)
        set_status(db, task.id, "Complete")

        updated = set_status(db, task.id, "Incomplete")

        assert updated.status == "Incomplete"

    def test_set_status_preserves_description(self):
        from app.crud import create_task, set_status

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Renew passport", user_id=user.id)

        updated = set_status(db, task.id, "Complete")

        assert updated.description == "Renew passport"

    def test_set_status_persists_change(self):
        from app.crud import create_task, list_tasks, set_status

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Write report", user_id=user.id)

        set_status(db, task.id, "Complete")

        listed = list_tasks(db, user_id=user.id)
        stored = next(t for t in listed if t.id == task.id)
        assert stored.status == "Complete"

    def test_set_status_for_nonexistent_task_returns_none(self):
        from app.crud import set_status

        db = _make_session()

        user = _create_user(db)

        assert set_status(db, 999999, "Complete") is None
