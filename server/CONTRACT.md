# API Contract

This document is the frontend/backend contract for the auth dashboard backend
(`server/`). It exists so the incoming React frontend rewrite (a separate,
not-yet-planned effort) can be built against a stable, documented surface
without re-reading the backend source.

## Static serving decision

The backend keeps a catch-all `express.static(...)` mount (see `src/app.ts`),
today pointed at `public/` (the existing AngularJS frontend). Once the React
rewrite produces a `client/dist` build, that directory is the intended target
for the same static mount — no separate reverse proxy / static host is
required for local development or single-process deployments. If a future
deployment topology instead puts a reverse proxy or CDN in front of a
statically-hosted `client/dist`, this backend's static mount becomes
redundant and can be removed; that is a deployment-time decision, not a
change to the API contract below.

## Endpoints

All request/response shapes below are exported as TypeScript types from
`src/types.ts` (`LoginResponse`, `LogoutResponse`, `MeResponse`,
`DashboardResponse`, `ErrorResponse`).

### `POST /api/login`

Request body: `{ "username": string, "password": string }`

- `200 { ok: true, username: string }` — credentials valid, session cookie set.
- `401 { ok: false, error: "bad credentials" }` — unknown user, wrong password,
  or malformed body.
- `500 { ok: false, error: "db error" }` — unexpected data-layer failure.

### `POST /api/logout`

- `200 { ok: true }` — session destroyed (always succeeds).

### `GET /api/me`

- `200 { username: string }` — session has a logged-in user.
- `401 { error: "not logged in" }` — no active session.

### `GET /api/dashboard`

Requires an active session (`isAuthenticated` middleware).

- `200 { kpis: { revenue: number, users: number, orders: number, conversion: string }, transactions: Transaction[] }`
  where `Transaction = { id: number, customer: string, amount: number, status: "paid" | "pending" | "failed", date: string (YYYY-MM-DD) }`.
  Data is synthetic/random, matching the legacy contract unchanged.
- `401 { error: "not logged in" }` — no active session.

## Session / cookie behavior

- Session cookie is `httpOnly`, `sameSite: "lax"`, and `secure` only when
  `NODE_ENV=production`.
- Sessions are stored in a persistent SQLite-backed store (`connect-sqlite3`),
  not in-memory — they survive a server restart.
- `SESSION_SECRET` is a required environment variable; the process refuses to
  start (non-zero exit, before the port opens) if it is unset.

## Running

```
cd server
npm install
SESSION_SECRET=<your-secret> npm run build && npm start
# or, for development:
SESSION_SECRET=<your-secret> npm run dev
```

Seeded credentials: `admin` / `admin123` (password stored as a bcrypt hash).
