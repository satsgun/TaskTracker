def _make_session():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


class TestDeleteTask:
    def test_delete_existing_task_returns_true(self):
        from app.crud import create_task, delete_task

        db = _make_session()
        task = create_task(db, description="Buy milk")

        assert delete_task(db, task.id) is True

    def test_deleted_task_no_longer_in_list(self):
        from app.crud import create_task, delete_task, list_tasks

        db = _make_session()
        task = create_task(db, description="Write report")

        delete_task(db, task.id)

        ids = [t.id for t in list_tasks(db)]
        assert task.id not in ids

    def test_delete_nonexistent_task_returns_false(self):
        from app.crud import delete_task

        db = _make_session()

        assert delete_task(db, 999999) is False

    def test_delete_already_deleted_task_returns_false(self):
        from app.crud import create_task, delete_task

        db = _make_session()
        task = create_task(db, description="Pay bills")
        delete_task(db, task.id)

        assert delete_task(db, task.id) is False

    def test_deleting_one_task_does_not_affect_others(self):
        from app.crud import create_task, delete_task, list_tasks

        db = _make_session()
        keep = create_task(db, description="Renew passport")
        remove = create_task(db, description="Schedule dentist")

        delete_task(db, remove.id)

        ids = [t.id for t in list_tasks(db)]
        assert keep.id in ids
        assert remove.id not in ids
