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


def _complete(db, task):
    task.status = "Complete"
    db.commit()
    db.refresh(task)
    return task


class TestListTasks:
    def test_list_tasks_returns_empty_list_when_no_tasks(self):
        from app.crud import list_tasks

        db = _make_session()

        assert list_tasks(db) == []

    def test_list_tasks_includes_created_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        created = create_task(db, description="Buy milk")

        tasks = list_tasks(db)

        assert [t.id for t in tasks] == [created.id]

    def test_default_status_is_all_includes_complete_and_incomplete(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        incomplete = create_task(db, description="Write report")
        complete = _complete(db, create_task(db, description="Pay bills"))

        ids = [t.id for t in list_tasks(db)]

        assert incomplete.id in ids
        assert complete.id in ids

    def test_status_pending_excludes_complete_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        incomplete = create_task(db, description="Water plants")
        complete = _complete(db, create_task(db, description="Renew passport"))

        ids = [t.id for t in list_tasks(db, status="pending")]

        assert incomplete.id in ids
        assert complete.id not in ids

    def test_status_all_includes_complete_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        complete = _complete(db, create_task(db, description="File taxes"))

        ids = [t.id for t in list_tasks(db, status="all")]

        assert complete.id in ids

    def test_search_filters_by_description_case_insensitive(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        match = create_task(db, description="Buy groceries")
        other = create_task(db, description="Schedule dentist")

        ids = [t.id for t in list_tasks(db, q="GROCER")]

        assert match.id in ids
        assert other.id not in ids

    def test_search_with_no_matches_returns_empty_list(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        create_task(db, description="Buy groceries")

        assert list_tasks(db, q="no-such-task-zzz") == []

    def test_combined_status_and_search(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        incomplete_match = create_task(db, description="Buy stamps")
        complete_match = _complete(db, create_task(db, description="Buy a gift"))

        ids = [t.id for t in list_tasks(db, status="pending", q="buy")]

        assert incomplete_match.id in ids
        assert complete_match.id not in ids

    def test_results_are_sorted_by_priority(self):
        from app.crud import create_task, list_tasks

        db = _make_session()
        low = create_task(db, description="Low task", priority="Low")
        high = create_task(db, description="High task", priority="High")
        medium = create_task(db, description="Medium task", priority="Medium")

        ids = [t.id for t in list_tasks(db)]

        assert ids.index(high.id) < ids.index(medium.id) < ids.index(low.id)
