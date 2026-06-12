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


def _complete(db, task):
    task.status = "Complete"
    db.commit()
    db.refresh(task)
    return task


class TestListTasks:
    def test_list_tasks_returns_empty_list_when_no_tasks(self):
        from app.crud import list_tasks

        db = _make_session()

        user = _create_user(db)

        assert list_tasks(db) == []

    def test_list_tasks_includes_created_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        created = create_task(db, description="Buy milk", user_id=user.id)

        tasks = list_tasks(db)

        assert [t.id for t in tasks] == [created.id]

    def test_default_status_is_all_includes_complete_and_incomplete(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        incomplete = create_task(db, description="Write report", user_id=user.id)
        complete = _complete(db, create_task(db, description="Pay bills", user_id=user.id))

        ids = [t.id for t in list_tasks(db)]

        assert incomplete.id in ids
        assert complete.id in ids

    def test_status_pending_excludes_complete_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        incomplete = create_task(db, description="Water plants", user_id=user.id)
        complete = _complete(db, create_task(db, description="Renew passport", user_id=user.id))

        ids = [t.id for t in list_tasks(db, status="pending")]

        assert incomplete.id in ids
        assert complete.id not in ids

    def test_status_all_includes_complete_tasks(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        complete = _complete(db, create_task(db, description="File taxes", user_id=user.id))

        ids = [t.id for t in list_tasks(db, status="all")]

        assert complete.id in ids

    def test_search_filters_by_description_case_insensitive(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        match = create_task(db, description="Buy groceries", user_id=user.id)
        other = create_task(db, description="Schedule dentist", user_id=user.id)

        ids = [t.id for t in list_tasks(db, q="GROCER")]

        assert match.id in ids
        assert other.id not in ids

    def test_search_with_no_matches_returns_empty_list(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        create_task(db, description="Buy groceries", user_id=user.id)

        assert list_tasks(db, q="no-such-task-zzz") == []

    def test_search_treats_percent_and_underscore_as_literal_characters(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        match = create_task(db, description="50%_off everything", user_id=user.id)
        other = create_task(db, description="50X off everything", user_id=user.id)

        ids = [t.id for t in list_tasks(db, q="50%_off")]

        assert match.id in ids
        assert other.id not in ids

    def test_combined_status_and_search(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        incomplete_match = create_task(db, description="Buy stamps", user_id=user.id)
        complete_match = _complete(db, create_task(db, description="Buy a gift", user_id=user.id))

        ids = [t.id for t in list_tasks(db, status="pending", q="buy")]

        assert incomplete_match.id in ids
        assert complete_match.id not in ids

    def test_results_are_sorted_by_priority(self):
        from app.crud import create_task, list_tasks

        db = _make_session()

        user = _create_user(db)
        low = create_task(db, description="Low task", priority="Low", user_id=user.id)
        high = create_task(db, description="High task", priority="High", user_id=user.id)
        medium = create_task(db, description="Medium task", priority="Medium", user_id=user.id)

        ids = [t.id for t in list_tasks(db)]

        assert ids.index(high.id) < ids.index(medium.id) < ids.index(low.id)
