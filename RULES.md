# Business Rules

This document catalogues the auth/session/dashboard business rules implemented
by this system, each explicitly marked as **Preserved** (same behavior as the
legacy Express/SQLite/AngularJS app) or **Changed** (deliberately different
from — and fixing a defect in — the legacy app).

## 1. Authentication & credential handling

**Status: Changed**

`POST /api/login` (`backend/routes/auth.py`) validates that `username` and
`password` are present and non-empty and returns `400` *before* any database
access if they are not. It then looks up the user with a parameterized
SQLAlchemy query (`SELECT id, username, password_hash FROM users WHERE
username = :username`) and verifies the submitted password with
`bcrypt.checkpw` against the stored bcrypt hash. Whether the username does
not exist or the password is wrong, the response is the same generic `401
{"ok": false, "error": "bad credentials"}` — the API never discloses which of
the two was incorrect (no username-enumeration signal). On success, the
user's `id` and `username` are stored in the server-side session.

- Legacy behavior: the Express handler built its SQL query by concatenating
  the raw `username`/`password` request fields directly into the query
  string (a SQL-injection vector), and compared the submitted password
  against the stored value with plaintext string equality inside that same
  SQL (no hashing).
- What changed: parameterized queries (no injection), bcrypt hashing +
  constant-time verification (no plaintext), pre-DB payload validation, and a
  single generic 401 for both failure cases (the no-enumeration behavior is
  itself an improvement over the legacy app, which is folded into this
  "changed" entry rather than listed separately).

## 2. Default admin provisioning

**Status: Changed**

`backend/migrations/0001_create_users.py` is a tracked, standalone migration
file that creates the `users` table (`CREATE TABLE IF NOT EXISTS`, applied
once and reviewable/versioned like any other migration). `backend/seed.py`
then seeds exactly one `admin` row — but only if the `users` table is
currently empty (`SELECT COUNT(*) FROM users`), making the seed idempotent
and safe to re-run. The seeded password is bcrypt-hashed before being stored,
and its plaintext value is taken from the `SEED_ADMIN_PASSWORD` environment
variable if set; if unset, a random secure password is generated with
`secrets.token_urlsafe` and printed once so it can be captured and rotated.
No plaintext password literal is hardcoded anywhere in the seeding code.

- Legacy behavior: `server/db.js` ran an ad hoc `CREATE TABLE IF NOT EXISTS`
  inline on every server boot (no tracked migration file) and inserted a
  default admin account with the hardcoded plaintext password `admin123`
  directly in source.
- What changed: tracked migration + idempotent seeding, bcrypt-hashed
  password, configurable/rotatable via `SEED_ADMIN_PASSWORD` (or a
  one-time generated password) instead of a hardcoded plaintext literal.

## 3. Routing & access-control policy

**Status: Preserved**

`frontend/src/routes.jsx` defines exactly two application routes — `/login`
and `/dashboard` — plus a catch-all `"*"` route that redirects any unmatched
path to `/login`. This mirrors the legacy AngularJS `$routeProvider`'s
`.when('/login', ...)`, `.when('/dashboard', ...)`, and
`.otherwise({redirectTo: '/login'})` table exactly, just re-implemented with
`react-router-dom`'s `<Routes>`/`<Route>`/`<Navigate>`.

`frontend/src/routes/DashboardGuard.jsx` performs a pre-render check against
`GET /api/me` before rendering the `/dashboard` route's contents. This guard
is UX-only: its purpose is to avoid flashing protected dashboard markup
before redirecting an unauthenticated visitor to `/login`. It is **not** the
real authorization boundary — `GET /api/dashboard`'s own server-side session
check (see rule 4) is, and remains so regardless of whether this
client-side guard is bypassed, misconfigured, or removed. This split between
a UX-only client guard and a server-enforced boundary reflects the legacy
design intent (the legacy AngularJS `DashboardCtrl` behaved the same way),
just reimplemented in React — hence this nuance is itself preserved, not new.

## 4. Session lifecycle & authorization

**Status: Preserved** (lifecycle rule) — with a preserved-entry implementation note below

`GET /api/me` (`backend/routes/me.py`) and `GET /api/dashboard`
(`backend/routes/dashboard.py`) both require an active logged-in session via
the shared `login_required` decorator defined in `backend/app.py`. Without a
valid, logged-in session, both endpoints return `401 {"error": "not logged
in"}` — matching the legacy Express behavior exactly. On successful login,
`backend/routes/auth.py` stores `{"id": ..., "username": ...}` in the
session. On logout, `backend/routes/auth.py`'s `/api/logout` handler clears
the Flask session and calls the session store's `destroy()` on the persisted
record, immediately revoking access for that session id.

- Legacy behavior: the guard-then-401, store-on-login, destroy-on-logout
  lifecycle rule is unchanged from the legacy Express app.
- Implementation note (changed, but does not alter the rule above): the
  legacy app used Express's default in-memory `MemoryStore`, so all sessions
  were lost whenever the process restarted. This rewrite's
  `backend/session_store.py` implements a `FileSystemSessionStore` that
  persists each session as a JSON file on disk, so sessions now survive
  process restarts. The lifecycle rule itself (guard + destroy-on-logout) is
  preserved; only its durability/backing store improved.

## 5. Mock KPI/transaction generation

**Status: Preserved**

`GET /api/dashboard` (`backend/routes/dashboard.py`) fabricates fake data on
every request — it never reads real business data. Each response contains:

- `kpis.revenue`: random integer in `[10000, 99999]`
- `kpis.users`: random integer in `[100, 9999]`
- `kpis.orders`: random integer in `[50, 2000]`
- `kpis.conversion`: random value in `0.00%`–`10.00%`, formatted as a percent string
- `transactions`: exactly 10 entries, each with:
  - `amount`: random integer in `[50, 5000]`
  - `status`: one of `paid` / `pending` / `failed`
  - `customer`: drawn from a fixed pool of 8 company names (Acme, Globex,
    Initech, Umbrella, Soylent, Hooli, Stark, Wayne)
  - `date`: within the last 30 days of the current date

These are the exact same fixed ranges, counts, status set, and company-name
pool as the legacy Express `/api/dashboard` handler, just generated with
Python's `random`/`datetime` instead of `Math.random()`/`Date`. No ranges,
counts, or pools changed.

## 6. Dashboard refresh behavior

**Status: Preserved**

`frontend/src/pages/Dashboard.jsx` loads dashboard data once on mount (via
`useEffect` calling `loadDashboard()`) and reloads it again *only* when the
user explicitly clicks the "Refresh" button (`handleRefresh` →
`loadDashboard()`). There is no polling, no `setInterval`/`setTimeout`-based
refresh, and no refetch-on-focus or other automatic revalidation — matching
the legacy app's load-once-plus-manual-refresh behavior exactly.
