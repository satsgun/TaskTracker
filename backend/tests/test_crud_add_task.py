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


class TestCreateTask:
    def test_create_task_with_required_fields_only_uses_defaults(self):
        from app.crud import create_task

        db = _make_session()

        task = create_task(db, description="Buy milk")

        assert task.description == "Buy milk"
        assert task.priority == "Medium"
        assert task.due_date is None
        assert task.status == "Incomplete"

    def test_create_task_with_all_fields(self):
        from datetime import date

        from app.crud import create_task

        db = _make_session()

        task = create_task(
            db, description="Submit report", priority="High", due_date=date(2026, 7, 1)
        )

        assert task.description == "Submit report"
        assert task.priority == "High"
        assert task.due_date == date(2026, 7, 1)
        assert task.status == "Incomplete"

    def test_create_task_assigns_an_id(self):
        from app.crud import create_task

        db = _make_session()

        task = create_task(db, description="Buy milk")

        assert task.id is not None

    def test_create_task_sets_created_at_timestamp(self):
        from app.crud import create_task

        db = _make_session()

        task = create_task(db, description="Buy milk")

        assert task.created_at is not None

    def test_each_created_task_gets_a_unique_id(self):
        from app.crud import create_task

        db = _make_session()

        first = create_task(db, description="First task")
        second = create_task(db, description="Second task")

        assert first.id != second.id

    def test_created_task_is_persisted_and_retrievable(self):
        from sqlalchemy import select

        from app.crud import create_task
        from app.models import Task

        db = _make_session()

        created = create_task(db, description="Buy milk")

        stored = db.execute(select(Task).where(Task.id == created.id)).scalar_one()
        assert stored.description == "Buy milk"
