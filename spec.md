# Multi-user authentication (Issue #26 + sub-issues #27-36)

## Context

Issue #26 ("Support user logins and make Task Tracker a multi-user
application") is broken into 10 sub-issues (#27-36) that each describe one
slice of the work with their own acceptance criteria. This plan consolidates
those sub-issues into a sequence of implementation tasks (Tasks 43-52,
continuing the project's "Task N: ..." convention from Task 42), each
following TDD per CLAUDE.md (xfail tests written first, then implementation,
then xfail removed).

Mapping: Task 43→#27, 44→#28, 45→#29, 46→#30, 47→#31, 48→#32, 49→#33,
50→#34, 51→#35, 52→#36.

## Design decisions (carried over / refined)

- **Auth mechanism**: HttpOnly session cookie (`session_id`), `SameSite=Lax`,
  `Path=/`, `Secure` via `COOKIE_SECURE` env var (default `true`), following
  the `os.environ.get` pattern in `database.py`. Server-side session table.
- **Password hashing**: `passlib[bcrypt]` (added to `backend/pyproject.toml`).
- **Idle timeout**: sliding 30-minute expiry (#30) — `AuthSession` stores
  `last_seen_at`; `get_current_user` checks `now - last_seen_at < 30min` and,
  on success, bumps `last_seen_at = now()`. Expired/missing/invalid session →
  401.
- **Cross-user access** (#35): 404 — matches existing "not found" pattern in
  `apply_update`/`delete_task`, and avoids confirming the task exists.
- **Duplicate signup** (#28): 409 Conflict.
- **Email validation** (#28): simple `field_validator` (`"@" in value` +
  non-empty), consistent with existing lightweight validators in
  `schemas.py` — no new dependency.
- **Routes**: `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`,
  added directly in `main.py` (no router modules, consistent with current
  style).
- **"Read" ownership (#35)**: there is no single-task `GET /tasks/{id}/`
  endpoint today. Per-task visibility is enforced via the list endpoint
  (#34/Task 50); update and delete get explicit ownership checks (Task 51)
  with the cross-user test issue #35 asks for.
- **Frontend pages** (#28/#29 call these "pages"): this is a single-page app
  with no routing, so "page" = a view section toggled via `hidden`, matching
  the existing `.add-task`/`.filter-bar` section pattern.

---

## Task 43 (Issue #27): Users table and schema

Schema/infrastructure only — no API changes, no changes to `Task`.

- `backend/pyproject.toml`: add `"passlib[bcrypt]"`.
- `backend/app/security.py` (new): `hash_password`, `verify_password` via
  `passlib.context.CryptContext(schemes=["bcrypt"], deprecated="auto")`, and
  `generate_session_token()` via `secrets.token_urlsafe(32)`.
- `backend/app/models.py`: add `User` model — `id`, `first_name`,
  `last_name`, `email` (unique, indexed), `hashed_password`, `created_at`.

### TDD
1. `backend/tests/test_security.py` (new, `pytestmark =
   pytest.mark.xfail(strict=True, reason="security helpers not yet
   implemented (Task 43)")`): hashing differs from input; `verify_password`
   correct/incorrect; `generate_session_token` unique.
2. `backend/tests/test_models.py` (new, same xfail style): duplicate email
   raises `IntegrityError`; `User` row stores `first_name`/`last_name`/
   `hashed_password` (no plaintext column).
3. Implement `security.py` + `User` model, run `pytest`, remove xfails.

---

## Task 44 (Issue #28): Sign-up page & endpoint

- `backend/app/schemas.py`: `UserCreate` (`first_name`, `last_name`, `email`,
  `password`) with validators: non-blank names, email contains `"@"`,
  password min length (e.g. 8). `UserOut` (`id`, `first_name`, `last_name`,
  `email`, `created_at` — never `hashed_password`).
- `backend/app/crud.py`: `get_user_by_email`, `create_user`.
- `backend/app/main.py`: `POST /auth/signup` → 201 `UserOut`; 409 if email
  already registered; 422 on validation errors (handled by Pydantic).
- `frontend/index.html`: `<section id="auth-view" hidden>` containing
  `#signup-form` (first name, last name, email, password fields using
  `.form-field`/`.field-error`) and `#login-form` (placeholder until Task
  45), with a toggle between them.
- `frontend/src/auth.ts` (new): `signup(firstName, lastName, email,
  password)` → posts to `/auth/signup` with `credentials: "same-origin"`,
  returns `{ok, error?}`.
- `frontend/src/main.ts`: wire `#signup-form` submit → `signup()`; show
  duplicate-email/validation errors in `#signup-error`.

### TDD
1. `backend/tests/test_auth_api.py` (new, xfail `reason="signup not yet
   implemented (Task 44)"`): valid signup → 201 with no password fields;
   duplicate email → 409; short password → 422; password substring never in
   response body.
2. `frontend/tests/auth.test.ts` (new): `signup()` request shape/return for
   201 and 409.
3. `frontend/tests/auth-ui.test.ts` (new): submitting signup form shows
   success/duplicate-email error.
4. Implement backend + frontend, remove xfails, run both suites.

---

## Task 45 (Issue #29): Sign-in page & endpoint

- `backend/app/schemas.py`: `UserLogin` (`email`, `password` only).
- `backend/app/main.py`: `POST /auth/login` → verifies password via
  `security.verify_password` against stored hash; on success returns
  `UserOut` (session creation deferred to Task 46, but stub a session row
  now since #29 says "starts a session" — implement minimally here and
  extend in Task 46). Wrong password and unknown email both → 401 with
  **identical** body `{"detail": "Invalid email or password"}`.
- `frontend/src/auth.ts`: `login(email, password)`.
- `frontend/src/main.ts`: wire `#login-form` submit → `login()`; on success
  switch to `#task-view`; show uniform error in `#login-error`.

### TDD
1. Extend `test_auth_api.py`: login with correct credentials → 200 `UserOut`;
   wrong password → 401 uniform message; unknown email → 401 **byte-identical**
   body to wrong-password case.
2. `frontend/tests`: `login()` request/response handling; login form
   success/error UI paths.
3. Implement, remove xfails.

---

## Task 46 (Issue #30): Session creation & idle timeout

- `backend/app/config.py` (new): `SESSION_COOKIE_NAME = "session_id"`,
  `IDLE_TIMEOUT = timedelta(minutes=30)`, `COOKIE_SECURE` env flag.
- `backend/app/models.py`: `AuthSession` (`__tablename__ = "sessions"`) —
  `id: str` (PK, opaque token), `user_id` (FK → `users.id`), `created_at`,
  `last_seen_at`.
- `backend/app/crud.py`: `create_session`, `get_session`, `touch_session`
  (update `last_seen_at`), `delete_session`.
- `backend/app/auth.py` (new): `get_current_user` dependency — reads
  `session_id` cookie via `Cookie()`, loads `AuthSession`+`User`; if missing,
  unknown, or `now - last_seen_at >= IDLE_TIMEOUT` → delete session (if
  present) and raise `HTTPException(401, "Not authenticated")`; otherwise
  `touch_session` and return `User`.
- `backend/app/main.py`: `POST /auth/login` now calls `crud.create_session`
  and sets the `session_id` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` per
  `COOKIE_SECURE`). Add `GET /auth/me` → 200 `UserOut` via
  `get_current_user`, 401 otherwise.
- `frontend/src/auth.ts`: `getCurrentUser()` → calls `/auth/me`, returns
  `null` on 401.
- `frontend/src/main.ts`: on `init()`, call `getCurrentUser()` to decide
  `#auth-view` vs `#task-view` before wiring the rest of the app.

### TDD
1. Extend `test_auth_api.py`: login sets `session_id` cookie with `HttpOnly`;
   `/auth/me` without cookie → 401; with valid cookie → 200 correct user;
   session idle > 30 min (simulate by manipulating `last_seen_at` in DB) →
   `/auth/me` returns 401.
2. `backend/tests/conftest.py`: add `auth_client`/`second_auth_client`
   fixtures (signup+login a `TestClient`; cookie persists on the instance) —
   for reuse from Task 47 onward.
3. `frontend/tests`: view switches to `#task-view`/`#auth-view` based on
   `/auth/me` 200/401.
4. Implement, remove xfails.

---

## Task 47 (Issue #31): Route protection

- `backend/app/main.py`: add `user: User = Depends(get_current_user)` to all
  four `/tasks/*` endpoints (`POST /tasks/`, `GET /tasks/list`, `PATCH
  /tasks/{id}/`, `DELETE /tasks/{id}/`). No DB/crud changes yet — `user` is
  unused until Tasks 49-51 wire it through.
- `frontend/src/main.ts`: add `credentials: "same-origin"` to existing
  `/tasks/*` fetches; if any task fetch returns 401, switch to `#auth-view`
  instead of the generic `#error-state`.

### TDD
1. `backend/tests/test_task_ownership.py` (new, xfail `reason="route
   protection not yet implemented (Task 47)"`): each of POST/GET-list/PATCH/
   DELETE without session cookie → 401.
2. Existing task test files (`test_tasks_api.py`, `test_list_tasks_api.py`,
   `test_update_task_api.py`, `test_delete_task_api.py`,
   `test_mark_complete_api.py`) switch their `TestClient` calls to the
   `auth_client` fixture so they keep passing once auth is required.
3. `frontend/tests`: a 401 from a task fetch returns the app to `#auth-view`.
4. Implement, remove xfail from `test_task_ownership.py`, confirm existing
   suites green via `auth_client`.

---

## Task 48 (Issue #32) + Task 49 (Issue #33): `user_id` FK + attribute new tasks to the session user

These two are implemented together (a `nullable=False` FK requires
`create_task` to always receive a `user_id`, so they can't land
independently without a broken intermediate state) but map to two issues /
two acceptance-criteria sets:

- `backend/app/models.py`: `Task.user_id: Mapped[int] =
  mapped_column(ForeignKey("users.id"), nullable=False)` (#32).
- `backend/app/crud.py`: `create_task(db, description, priority=None,
  due_date=None, *, user_id: int)` — `user_id` always comes from the
  dependency-injected `User`, never request body (#33).
- `backend/app/main.py`: `POST /tasks/` passes `user_id=user.id` from
  `get_current_user`; `TaskCreate` schema does **not** accept a `user_id`
  field (so client-supplied owner IDs are impossible, not just ignored).

### TDD
1. `backend/tests/test_task_ownership.py`: add — creating a task without a
   session → 401, no row created (#33); creating a task with a session
   stores `user_id` matching the session user, even if extra `user_id` is
   sent in the JSON body (ignored, #33); `tasks.user_id` is non-null at the
   DB level (#32).
2. Update remaining crud-level tests (`test_crud_add_task.py`, etc.) to pass
   `user_id`.
3. Implement, remove xfails.

---

## Task 50 (Issue #34): List only the current user's tasks

- `backend/app/crud.py`: `list_tasks(db, user_id, status="all", q=None)` —
  add `Task.user_id == user_id` to the `select(Task)` filter.
- `backend/app/main.py`: `GET /tasks/list` passes `user_id=user.id`.

### TDD
1. `backend/tests/test_task_ownership.py`: user A creates 2 tasks, user B
   creates 1; A's list returns only A's 2 tasks; a fresh user with no tasks
   gets `[]`.
2. Implement, remove xfail.

---

## Task 51 (Issue #35): Ownership checks on update/delete (IDOR protection)

- `backend/app/crud.py`: `apply_update(db, task_id, user_id, description=None,
  status=None)` and `delete_task(db, task_id, user_id)` filter by both
  `Task.id == task_id` and `Task.user_id == user_id` (e.g. via
  `select(Task).where(...)` instead of bare `db.get`). Not found *or* not
  owned → `None`/`False`, which `main.py` already turns into 404.
- `backend/app/main.py`: pass `user_id=user.id` to `apply_update`/
  `delete_task`.

### TDD
1. `backend/tests/test_task_ownership.py`: the explicit cross-user test from
   #35 — log in as user A, create a task; log in as user B; `PATCH` and
   `DELETE` that task ID as B both → 404, and a follow-up request as A shows
   the task is unchanged/still present.
2. Implement, remove xfail — all of `test_task_ownership.py` should now be
   un-xfailed and passing.

---

## Task 52 (Issue #36): Implement logout

- `backend/app/crud.py`: `delete_session` (already added in Task 46, used
  here).
- `backend/app/main.py`: `POST /auth/logout` → reads `session_id` cookie,
  deletes the `AuthSession` row if present, clears the cookie
  (`response.delete_cookie`), returns 204.
- `frontend/index.html`: add `#logout-btn` inside `.header-controls`.
- `frontend/src/auth.ts`: `logout()` → posts to `/auth/logout`.
- `frontend/src/main.ts`: wire `#logout-btn` → `logout()` → show
  `#auth-view`, hide `#task-view`, clear in-memory task state.

### TDD
1. `backend/tests/test_auth_api.py`: logout → 204; subsequent `/auth/me` →
   401; subsequent `/tasks/list` → 401.
2. `frontend/tests`: clicking logout calls `/auth/logout` and returns the UI
   to `#auth-view`.
3. Implement, remove xfails.

---

## Verification (end-to-end, after Task 52)

- `cd backend && pytest --cov` — all tests pass, no xfail remaining from
  Tasks 43-52.
- `cd frontend && npm test && npm run build` — all tests pass, typecheck
  clean.
- Manual smoke test: run backend with built frontend; sign up two users,
  confirm each only sees their own tasks; confirm PATCH/DELETE on the other
  user's task ID returns 404; confirm logout returns to the login screen and
  `/tasks/list` then returns 401; confirm a session idle >30 min is rejected.

## Commit convention

One commit per task: `Task 43: Users table and schema`, `Task 44: Sign-up
page & endpoint`, ... `Task 52: Implement logout` — each referencing its
corresponding issue (#27-36) under issue #26 on GitHub Project #2.
