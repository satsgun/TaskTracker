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


class TestCreateTask:
    def test_create_task_with_required_fields_only_uses_defaults(self):
        from app.crud import create_task

        db = _make_session()

        user = _create_user(db)

        task = create_task(db, description="Buy milk", user_id=user.id)

        assert task.description == "Buy milk"
        assert task.priority == "Medium"
        assert task.due_date is None
        assert task.status == "Incomplete"

    def test_create_task_with_all_fields(self):
        from datetime import date

        from app.crud import create_task

        db = _make_session()

        user = _create_user(db)

        task = create_task(
            db, description="Submit report", priority="High", due_date=date(2026, 7, 1), user_id=user.id
        )

        assert task.description == "Submit report"
        assert task.priority == "High"
        assert task.due_date == date(2026, 7, 1)
        assert task.status == "Incomplete"

    def test_create_task_assigns_an_id(self):
        from app.crud import create_task

        db = _make_session()

        user = _create_user(db)

        task = create_task(db, description="Buy milk", user_id=user.id)

        assert task.id is not None

    def test_create_task_sets_created_at_timestamp(self):
        from app.crud import create_task

        db = _make_session()

        user = _create_user(db)

        task = create_task(db, description="Buy milk", user_id=user.id)

        assert task.created_at is not None

    def test_each_created_task_gets_a_unique_id(self):
        from app.crud import create_task

        db = _make_session()

        user = _create_user(db)

        first = create_task(db, description="First task", user_id=user.id)
        second = create_task(db, description="Second task", user_id=user.id)

        assert first.id != second.id

    def test_created_task_is_persisted_and_retrievable(self):
        from sqlalchemy import select

        from app.crud import create_task
        from app.models import Task

        db = _make_session()

        user = _create_user(db)

        created = create_task(db, description="Buy milk", user_id=user.id)

        stored = db.execute(select(Task).where(Task.id == created.id)).scalar_one()
        assert stored.description == "Buy milk"
