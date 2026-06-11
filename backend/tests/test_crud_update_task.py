import pytest

pytestmark = pytest.mark.xfail(
    strict=True, reason="DB layer (app.database/app.models/app.crud) not yet implemented (see Task 25/26)"
)


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
        from app.crud import create_task, update_task

        db = _make_session()
        task = create_task(db, description="Buy milk")

        updated = update_task(db, task.id, description="Buy oat milk")

        assert updated.description == "Buy oat milk"

    def test_update_description_preserves_status(self):
        from app.crud import create_task, set_status, update_task

        db = _make_session()
        task = create_task(db, description="Pay bills")
        set_status(db, task.id, "Complete")

        updated = update_task(db, task.id, description="Pay rent and bills")

        assert updated.status == "Complete"

    def test_update_description_preserves_priority_and_due_date(self):
        from datetime import date

        from app.crud import create_task, update_task

        db = _make_session()
        task = create_task(db, description="Submit report", priority="High", due_date=date(2026, 7, 1))

        updated = update_task(db, task.id, description="Submit final report")

        assert updated.priority == "High"
        assert updated.due_date == date(2026, 7, 1)

    def test_update_description_persists(self):
        from app.crud import create_task, list_tasks, update_task

        db = _make_session()
        task = create_task(db, description="Write report")

        update_task(db, task.id, description="Write quarterly report")

        listed = list_tasks(db)
        stored = next(t for t in listed if t.id == task.id)
        assert stored.description == "Write quarterly report"

    def test_update_description_for_nonexistent_task_returns_none(self):
        from app.crud import update_task

        db = _make_session()

        assert update_task(db, 999999, description="Anything") is None
