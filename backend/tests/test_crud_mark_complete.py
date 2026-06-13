from tests.conftest import create_test_user as _create_user


def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class TestSetStatus:
    def test_set_status_to_complete_updates_status(self):
        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Buy milk", user_id=user.id)

        updated = apply_update(db, task.id, user_id=user.id, status="Complete")

        assert updated.status == "Complete"

    def test_set_status_to_incomplete_updates_status(self):
        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Pay bills", user_id=user.id)
        apply_update(db, task.id, user_id=user.id, status="Complete")

        updated = apply_update(db, task.id, user_id=user.id, status="Incomplete")

        assert updated.status == "Incomplete"

    def test_set_status_preserves_description(self):
        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Renew passport", user_id=user.id)

        updated = apply_update(db, task.id, user_id=user.id, status="Complete")

        assert updated.description == "Renew passport"

    def test_set_status_persists_change(self):
        from app.crud import apply_update, create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Write report", user_id=user.id)

        apply_update(db, task.id, user_id=user.id, status="Complete")

        listed = list_tasks(db, user_id=user.id)
        stored = next(t for t in listed if t.id == task.id)
        assert stored.status == "Complete"

    def test_set_status_for_nonexistent_task_returns_none(self):
        from app.crud import apply_update

        db = _make_session()

        user = _create_user(db)

        assert apply_update(db, 999999, user_id=user.id, status="Complete") is None
