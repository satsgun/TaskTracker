from tests.conftest import create_test_user as _create_user


def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class TestUpdateTaskDescription:
    def test_update_description_changes_description(self):
        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Buy milk", user_id=user.id)

        updated = apply_update(db, task.id, user_id=user.id, description="Buy oat milk")

        assert updated.description == "Buy oat milk"

    def test_update_description_preserves_status(self):
        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Pay bills", user_id=user.id)
        apply_update(db, task.id, user_id=user.id, status="Complete")

        updated = apply_update(db, task.id, user_id=user.id, description="Pay rent and bills")

        assert updated.status == "Complete"

    def test_update_description_preserves_priority_and_due_date(self):
        from datetime import date

        from app.crud import apply_update, create_task

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Submit report", priority="High", due_date=date(2026, 7, 1), user_id=user.id)

        updated = apply_update(db, task.id, user_id=user.id, description="Submit final report")

        assert updated.priority == "High"
        assert updated.due_date == date(2026, 7, 1)

    def test_update_description_persists(self):
        from app.crud import apply_update, create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        task = create_task(db, description="Write report", user_id=user.id)

        apply_update(db, task.id, user_id=user.id, description="Write quarterly report")

        listed = list_tasks(db, user_id=user.id)
        stored = next(t for t in listed if t.id == task.id)
        assert stored.description == "Write quarterly report"

    def test_update_description_for_nonexistent_task_returns_none(self):
        from app.crud import apply_update

        db = _make_session()

        user = _create_user(db)

        assert apply_update(db, 999999, user_id=user.id, description="Anything") is None
