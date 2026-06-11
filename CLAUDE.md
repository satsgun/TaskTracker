# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Task Tracker is a web app for tracking tasks: a FastAPI backend (with a SQLite
database, not yet implemented) and a TypeScript/HTML/CSS frontend built with
Vite. The backend serves the built frontend as static files and exposes a
REST API under `/tasks/`.

Development follows TDD: tests are written before implementation. Tests for
endpoints/features that don't exist yet are marked with
`pytestmark = pytest.mark.xfail(strict=True, reason="...")` at the module
level. `strict=True` means the test suite fails if such a test unexpectedly
passes — this is the signal to remove the xfail marker once the feature is
implemented.

## Commands

### Backend (`backend/`)

```
cd backend
pip install -e ".[dev]"        # install backend + dev deps (pytest, pytest-cov, httpx, genbadge)
pytest                          # run all tests
pytest --cov                    # run with coverage
pytest tests/test_tasks_api.py::TestAddTask::test_create_task_with_all_fields_returns_201  # single test
pytest -k test_health           # run tests matching a name pattern
```

### Frontend (`frontend/`)

```
cd frontend
npm ci                          # install deps
npm test                        # run all tests (vitest run)
npm test -- tests/tasks.test.ts # run a single test file
npm run test:watch              # watch mode
npm run coverage                # run tests with coverage (v8, writes coverage/coverage-summary.json)
npm run build                   # tsc typecheck + vite build (outputs to frontend/dist)
npx tsc --noEmit                # typecheck only
```

## Architecture

### Backend serving the frontend

`backend/app/main.py` mounts the built frontend (`frontend/dist`) as static
files at `/` via `StaticFiles(html=True)`. The path is overridable via the
`FRONTEND_DIST` env var, which is how `backend/tests/test_static.py` tests
both the "frontend build present" and "frontend build missing" cases by
`importlib.reload`-ing `app.main` after `monkeypatch.setenv`. Because of this
mount, any backend route added under `/` must be registered as a FastAPI
route (e.g. `/health`, `/tasks/...`) — unmatched paths fall through to the
static handler, which returns 404 for unknown files or 405 for
non-GET/HEAD methods on `/`.

### Frontend structure

The frontend is currently driven by in-memory mock data
(`frontend/src/tasks.ts:createMockTasks`) pending the real backend API
(Tasks 25+). Modules are split by concern:

- `src/types.ts` — shared `Task`, `Priority`, `Status`, `StatusFilter`, `RowState` types.
- `src/tasks.ts` — pure data logic: date helpers, overdue/row-state computation
  (a completed task is never shown as overdue — completion takes precedence),
  priority sorting, and status/search filtering.
- `src/render.ts` — pure DOM-string rendering: task list/rows, counter text,
  display vs. edit-mode row markup, HTML escaping helpers.
- `src/main.ts` — wires DOM elements from `index.html` to the above: form
  submission/validation, status filter toggles, search, and per-row actions
  (complete, delete, edit, save, cancel) via event delegation on the task list.

Color/state conventions (overdue/complete/incomplete) are defined as CSS
custom properties in `src/style.css` and applied via `rowState` from `tasks.ts`.

### CI/CD (`.github/workflows/ci.yml`)

- `backend-tests` and `frontend-tests` run independently and upload coverage
  artifacts (`coverage.xml` / `coverage-summary.json`).
- `update-badges` (main branch pushes only) regenerates
  `badges/backend-coverage.svg` and `badges/frontend-coverage.svg` via
  genbadge and make-coverage-badge, committing only if they changed, with
  `[skip ci]` to avoid retriggering CI.
- `deploy` (main branch pushes only) curls `RENDER_DEPLOY_HOOK_URL` to trigger
  a Render deploy after both test jobs pass.
- `render.yaml` defines the single Render web service: it builds the frontend,
  installs the backend, and runs it with uvicorn, with the backend serving the
  frontend build as described above.

## Conventions

- Commit messages reference the relevant GitHub Project (#2, "Task Tracker")
  task ID, e.g. `Task 11: Add test cases for List Tasks REST API`.
