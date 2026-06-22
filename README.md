# Task Tracker

![Backend coverage](badges/backend-coverage.svg)
![Frontend coverage](badges/frontend-coverage.svg)

A web application for tracking tasks: a FastAPI + SQLite backend and a
TypeScript/HTML/CSS frontend built with Vite. The backend serves the built
frontend as static files and exposes a REST API under `/tasks/`.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         Browser                               │
│                                                               │
│   index.html ── src/main.ts                                   │
│                     │  fetch()                                │
│                     ├─ src/render.ts  (DOM rendering)         │
│                     └─ src/tasks.ts   (filtering, row state)  │
└──────────────────────────────│────────────────────────────────┘
                               │ HTTP (JSON)
                               │
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                    FastAPI app (backend/app)                  │
│                                                               │
│   main.py        routes: /health, /tasks/...                  │
│      │                                                        │
│   schemas.py     request/response validation (Pydantic)       │
│      │                                                        │
│   crud.py        business logic (create/list/update/delete)   │
│      │                                                        │
│   models.py      SQLAlchemy ORM model (Task)                  │
│      │                                                        │
│   database.py    engine / session / Base                      │
│      ▼                                                        │
│   SQLite (tasktracker.db)                                     │
│                                                               │
│   StaticFiles mount at "/" serves frontend/dist (built UI)    │
└───────────────────────────────────────────────────────────────┘
```

- **Frontend** (`frontend/src`): `main.ts` wires up the DOM (`index.html`) to
  the API, `render.ts` produces the task list/row markup, and `tasks.ts`
  holds pure data logic (sorting, filtering, overdue/complete/incomplete row
  state). The frontend has no client-side framework — it's vanilla
  TypeScript + DOM APIs.
- **Backend** (`backend/app`): a FastAPI app backed by SQLAlchemy + SQLite.
  `main.py` defines the HTTP routes, `schemas.py` validates requests and
  shapes responses, `crud.py` contains the database operations, and
  `models.py`/`database.py` define the ORM model and DB session setup.
- In production, the backend builds the frontend and serves
  `frontend/dist` as static files at `/` (see `render.yaml`), so the whole
  app runs as a single FastAPI/uvicorn service.

## Running locally

### Backend

```
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API is served at `http://localhost:8000`. SQLite data is stored in
`backend/tasktracker.db` (configurable via the `DATABASE_URL` env var).

The session cookie is set with `Secure` by default (`COOKIE_SECURE=true`),
so it's only sent back over HTTPS. If you're running the app over plain HTTP
(e.g. local development without TLS, or a non-TLS deployment), set
`COOKIE_SECURE=false` — otherwise login will appear to succeed but
`/auth/me` and `/tasks/*` will return 401.

### Frontend

```
cd frontend
npm ci
npm run dev
```

For a fully working UI (frontend talking to the real backend), build the
frontend and let the backend serve it:

```
cd frontend && npm run build
cd ../backend && uvicorn app.main:app --reload
```

then open `http://localhost:8000`.

## Testing

```
# Backend
cd backend
pytest                  # all tests
pytest --cov            # with coverage

# Frontend
cd frontend
npm test                 # all tests (vitest run)
npm run coverage          # with coverage
npx tsc --noEmit          # typecheck
```

## REST API

All endpoints are under `/tasks/`. Request and response bodies are JSON.

### `POST /tasks/` — create a task

Request body:

```json
{
  "description": "Buy milk",
  "priority": "High",
  "due_date": "2026-06-15"
}
```

- `description` is required and must not be blank.
- `priority` is optional, one of `High` | `Medium` | `Low`, defaults to `Medium`.
- `due_date` is optional (ISO `YYYY-MM-DD`), defaults to `null`.

Success response — `201 Created`:

```json
{
  "id": 1,
  "description": "Buy milk",
  "priority": "High",
  "due_date": "2026-06-15",
  "status": "Incomplete",
  "created_at": "2026-06-11T12:00:00"
}
```

Error response — `422 Unprocessable Entity` (e.g. blank description, invalid
priority, or invalid date format):

```json
{ "detail": [...] }
```

### `GET /tasks/list` — list tasks

Query parameters (both optional):

- `status` — `all` (default) or `pending` (only `Incomplete` tasks).
- `q` — case-insensitive substring search on `description`.

Example: `GET /tasks/list?status=pending&q=milk`

Success response — `200 OK`:

```json
[
  {
    "id": 1,
    "description": "Buy milk",
    "priority": "High",
    "due_date": "2026-06-15",
    "status": "Incomplete",
    "created_at": "2026-06-11T12:00:00"
  }
]
```

Tasks are sorted by priority: `High` > `Medium` > `Low`.

### `PATCH /tasks/{id}/` — update a task

Request body (at least one of `description` or `status` is required):

```json
{ "description": "Buy oat milk" }
```

```json
{ "status": "Complete" }
```

Success response — `204 No Content` (empty body).

Error responses:

- `404 Not Found` if the task doesn't exist:
  ```json
  { "detail": "Task 999 not found" }
  ```
- `422 Unprocessable Entity` if neither field is provided, the description
  is blank, or `status` is not `Complete`/`Incomplete`.

### `DELETE /tasks/{id}/` — delete a task

Success response — `204 No Content` (empty body).

Error response — `404 Not Found` if the task doesn't exist:

```json
{ "detail": "Task 999 not found" }
```

## Frontend behavior

- Tasks are color-coded by row state, computed client-side from `status`
  and `due_date`:
  - **Red** — incomplete and overdue.
  - **Green** — complete (regardless of due date — completion takes
    precedence over overdue).
  - **Blue** — incomplete and not yet due (or no due date).
- The status filter (`Pending` / `All`) and search box re-fetch
  `/tasks/list` with the corresponding `status`/`q` query parameters.
- If the initial load fails (network error or non-2xx response), an error
  panel with a "Retry" button is shown instead of the task list.
- If a list is empty, an empty-state message is shown — with a "Clear
  search" action when the result is due to active filters/search.
- Mark-complete, delete, and edit actions call the corresponding API
  endpoint; on failure, a dismissible banner explains the error and the row
  is left unchanged.

## Deployment

`render.yaml` defines a single Render web service that builds the frontend,
installs the backend, and runs it with uvicorn (the backend serves the
built frontend as described above). CI (`.github/workflows/ci.yml`) runs
backend and frontend tests, updates coverage badges on `main`, and triggers
a Render deploy after both test jobs pass.

[![CI](https://github.com/satsgun/TaskTracker/actions/workflows/ci.yml/badge.svg)](https://github.com/satsgun/TaskTracker/actions/workflows/ci.yml)
![Backend coverage](badges/backend-coverage.svg)
![Frontend coverage](badges/frontend-coverage.svg)

## Live demo

**▶ Try it: [<https://tasktracker-backend-ubrr.onrender.com>](https://tasktracker-backend-ubrr.onrender.com/)**

> **Note:** hosted on Render's free tier, so the first request may take **~30–60 seconds or more** to wake the service. If you see a blank page or spinner, give it a moment and refresh — it's cold-starting, not broken.

**Demo account** (so you can skip signup):

| Email | Password |
| --- | --- |
| `demo@example.com` | `demotest123` |

Or create your own account — note the demo database is for evaluation only and is reset periodically, so don't store anything you want to keep.