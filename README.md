# auth_dashboard_legacy

A small auth + dashboard app, rewritten from a deliberately old-style
Node.js/Express + AngularJS stack into a **Python/Flask backend** and a
**React + Vite frontend**, behind a frozen 4-endpoint API contract (see
`docs/api-contract.md`). The legacy Express/AngularJS code under
`server/` and `public/` is kept in the repo for reference/contract-testing
only; it is not what's described below.

## Stack

- **Backend**: Python 3.11+, Flask, SQLAlchemy, SQLite, `bcrypt` for
  password hashing, a custom filesystem-backed session store.
- **Frontend**: React 18 + Vite 5 + React Router 6 (replaces the legacy
  CDN-loaded AngularJS 1.8 single-page app — there is now a real build
  step and no framework loaded from a CDN).
- **Database**: SQLite (single `users` table).

## Prerequisites

- Python 3.11+ with `pip`
- Node.js 18+ (Node 22 also verified) with `npm`

## Environment variables

All backend configuration comes from environment variables (`backend/config.py`).
There are no hardcoded secrets or credentials anywhere in the backend.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SESSION_SECRET` | **Yes** | *(none — app refuses to start)* | Flask's `SECRET_KEY`, required by Flask's own internals. `backend/config.py` raises `RuntimeError` at import time if this is unset, so the app fails fast instead of silently falling back to an insecure default. It does not sign the session cookie (see "Sessions" below). |
| `DB_PATH` | No | `backend/data.sqlite` | Path to the SQLite database file. |
| `ALLOWED_ORIGINS` | No | *(empty — no cross-origin requests allowed)* | Comma-separated list of origins allowed to make credentialed cross-origin requests (e.g. `http://localhost:5173` for the Vite dev server). Only used when the frontend and backend are served from different origins (development mode); not needed in the production-style same-origin flow. |
| `SESSION_FILE_DIR` | No | `backend/.flask_session` | Directory where session data is persisted as JSON files on disk (see "Sessions" below). |
| `SESSION_COOKIE_SECURE` | No | `false` | Set to `true` once the app is served over HTTPS, to require the `Secure` attribute on the session cookie. Leave `false` for local/dev HTTP. |
| `PORT` | No | `3000` | Port the Flask app listens on (`backend/app.py`). |
| `SEED_ADMIN_PASSWORD` | No | *(none — a random password is generated)* | Used only by `backend/seed.py`; see "Default admin account" below. |

## Running the backend (Python/Flask)

From the repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # on Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1. Create the `users` table (idempotent — safe to re-run).
python migrations/0001_create_users.py

# 2. Seed the default admin account (idempotent — no-op if users already exist).
python seed.py

# 3. Start the server.
export SESSION_SECRET="some-long-random-string"   # required, no default
python app.py
```

The server listens on `http://localhost:3000` by default (override with
`PORT`). It exposes the four API endpoints under `/api/...` and also
serves a static frontend from the same origin — see "Serving the frontend"
below.

Both `migrations/0001_create_users.py` and `seed.py` accept an optional
positional `db_path` argument, and otherwise honor the `DB_PATH`
environment variable, e.g.:

```bash
python migrations/0001_create_users.py /tmp/some-other.sqlite
DB_PATH=/tmp/some-other.sqlite python seed.py
```

## Default admin account

`backend/seed.py` seeds a single `admin` account into the `users` table,
but **only if the table is currently empty** — it's idempotent and safe to
re-run.

- No plaintext password is ever hardcoded in the source.
- If the `SEED_ADMIN_PASSWORD` environment variable is set, that value is
  used as the admin account's password (hashed with `bcrypt` before being
  stored). This is the recommended way to choose a known password for
  local development or CI, e.g.:

  ```bash
  SEED_ADMIN_PASSWORD=choose-your-own-dev-password python seed.py
  ```

- If `SEED_ADMIN_PASSWORD` is **not** set, `seed.py` generates a random,
  secure password (`secrets.token_urlsafe(16)`), hashes it with `bcrypt`,
  and prints the plaintext value to stdout **once**, at seed time, so it
  can be captured and stored securely. Rotate the admin password at any
  time by clearing the `users` table (or the whole database file) and
  re-running `seed.py`, or by adding your own password-update script.

## Serving the frontend

### Development: Vite dev server + Flask API, separate origins

Run the two servers side by side:

```bash
# terminal 1 — backend, as above
cd backend && python app.py

# terminal 2 — frontend dev server with hot reload
cd frontend
npm install
npm run dev
```

The Vite dev server (`http://localhost:5173` by default) proxies any
request under `/api` to `http://localhost:3000` (see the `server.proxy`
block in `frontend/vite.config.js`), so frontend code can call relative
paths like `/api/login` without hardcoding the backend's host/port, and
without needing `ALLOWED_ORIGINS`/CORS configured for that path.

If you instead open the frontend at its own origin without going through
the Vite proxy (or serve it from anywhere else cross-origin), set
`ALLOWED_ORIGINS` on the backend to include that origin, e.g.:

```bash
ALLOWED_ORIGINS=http://localhost:5173 SESSION_SECRET=... python app.py
```

### Production-style: single origin, Flask serves the built frontend

Build the frontend once:

```bash
cd frontend
npm install
npm run build          # outputs static assets to frontend/dist/
```

`backend/app.py` checks whether `frontend/dist/` exists at startup: if it
does, that directory is served as the static site (`index.html` plus
assets) from the same Flask process and origin as the API; if it doesn't
(e.g. before the frontend has ever been built), Flask falls back to
serving the legacy `public/` AngularJS app instead, so the server never
serves a missing directory. In this mode there's a single origin for
both the API and the frontend, so no `ALLOWED_ORIGINS`/CORS configuration
is needed — just start the backend:

```bash
cd backend
SESSION_SECRET=... python app.py
```

and open `http://localhost:3000/` (or whatever `PORT` you configured).

## Sessions

Sessions are cookie-based, matching the legacy contract (`docs/api-contract.md`),
but backed by a real persistent store instead of an in-memory one: each
session is written to its own JSON file under `SESSION_FILE_DIR`
(`backend/session_store.py`), so logged-in sessions survive an app
restart. The session cookie is named `connect.sid` (matching the legacy
contract) and carries an opaque, unguessable random session id (a 128-bit
`uuid4`) — unlike the legacy cookie, it is not HMAC-signed; the id itself
is the lookup key into the server-side session store, so its value carries
no meaning outside that store. `SESSION_SECRET` is used as Flask's
`SECRET_KEY` (required for Flask's own internals) and to fail the app
fast at startup if unset; it does not sign this cookie.

## API contract

The backend implements exactly four endpoints. Full byte-for-byte details
(cookie attributes, edge cases) are recorded in `docs/api-contract.md`;
the shapes below reflect what's actually implemented in
`backend/routes/auth.py`, `backend/routes/me.py`, and
`backend/routes/dashboard.py`.

### `POST /api/login`

Request:
```json
{ "username": "admin", "password": "correct-password" }
```

Responses:

- Missing/empty username or password — `400`:
  ```json
  { "ok": false, "error": "username and password are required" }
  ```
- Unknown username or wrong password — `401`:
  ```json
  { "ok": false, "error": "bad credentials" }
  ```
  (The same message is returned for a missing user and a wrong password,
  so the response never discloses which one was incorrect.)
- Success — `200`, and sets the session cookie:
  ```json
  { "ok": true, "username": "admin" }
  ```

### `GET /api/me`

No request body.

- Not logged in — `401`:
  ```json
  { "error": "not logged in" }
  ```
- Logged in — `200`:
  ```json
  { "username": "admin" }
  ```

### `GET /api/dashboard`

No request body. Requires a logged-in session.

- Not logged in — `401`:
  ```json
  { "error": "not logged in" }
  ```
- Logged in — `200`, with freshly randomized data on every call (not
  persisted):
  ```json
  {
    "kpis": {
      "revenue": 42017,
      "users": 3821,
      "orders": 764,
      "conversion": "4.37%"
    },
    "transactions": [
      {
        "id": 1,
        "customer": "Acme Inc",
        "amount": 1899,
        "status": "paid",
        "date": "2024-05-01"
      }
    ]
  }
  ```
  `transactions` always contains exactly 10 entries. See
  `docs/api-contract.md` for the exact value ranges/enums.

### `POST /api/logout`

No request body required.

- Always — `200`, and clears the session (both the cookie and its
  persisted file are removed):
  ```json
  { "ok": true }
  ```

## Contract tests

`tests/contract/` contains a Node.js test suite (`node:test` + `fetch`)
that exercises the four endpoints above end-to-end, including the
session-cookie flow (login → me → dashboard → logout → me). It's written
to run **unmodified** against either backend implementation:

```bash
cd tests/contract
npm install

# against the legacy Express server (self-contained: starts/stops it for you)
npm test

# against a server you've already started yourself (e.g. the Python backend)
BASE_URL=http://localhost:3000 npm test
```

## What changed from the legacy version

The legacy stack (`server/`, `public/`) had several defects that this
rewrite fixes, while preserving the same API contract:

- **SQL injection** — the legacy login handler built its SQL query by
  string-concatenating the submitted username/password directly into the
  query text. The new backend uses parameterized SQLAlchemy queries
  everywhere.
- **Plaintext passwords** — the legacy `users` table stored passwords in
  plaintext and compared them with string equality. The new backend
  stores only `bcrypt` password hashes and verifies with
  `bcrypt.checkpw` (a constant-time comparison).
- **Hardcoded session secret** — the legacy server had a session secret
  (`'legacy-secret'`) hardcoded directly in source. The new backend
  requires `SESSION_SECRET` from the environment and refuses to start
  without it — no default secret exists anywhere in the code.
- **In-memory-only sessions** — the legacy server used `express-session`'s
  default `MemoryStore`, so every login was lost on server restart. The
  new backend persists sessions to disk (`backend/session_store.py`), so
  they survive restarts.
- **Disclosed credential hint** — the legacy README documented the seeded
  admin password in plaintext. The new seed script (`backend/seed.py`)
  never hardcodes a plaintext password: it either uses an operator-chosen
  `SEED_ADMIN_PASSWORD` or generates and prints a random one once, at
  seed time.

## Repository layout

```
backend/        Python/Flask backend (app.py, config.py, routes/, migrations/, seed.py)
frontend/       React + Vite frontend (src/pages, src/routes, routes.jsx, App.jsx)
docs/           Frozen API contract documentation
tests/contract/ Shared Node.js contract test suite (runs against either backend)
server/, public/  Legacy Express + AngularJS implementation, kept for contract-test reference
```
