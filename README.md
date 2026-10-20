# auth_dashboard_legacy

A small login + dashboard app: a Vue 3 single-page client (built with Vite) served by an
Express + SQLite backend with cookie-based sessions.

## Stack
- Frontend: Vue 3 + Vue Router (hash history), built with Vite; tests with Vitest + Vue Test Utils
- Backend: Node.js + Express, `express-session`, SQLite (`sqlite3`); tests with Jest + supertest

## Prerequisites
- Node.js and npm (a version supported by Vite 5, i.e. Node 18+)
- A C/C++ toolchain only if `sqlite3` has no prebuilt binary for your platform

## Install
```
cd client && npm install
cd ../server && npm install
```

## Environment variables
Read by the server (`server/config.js`):

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. |
| `SESSION_SECRET` | random per process | If unset, a random secret is generated and a warning is logged, so sessions do not survive a restart. Set it explicitly outside of local use. |
| `DB_PATH` | `server/data.sqlite` | SQLite file. Use `:memory:` for tests. |

The directory the server serves static files from is fixed in `config.js` as `PUBLIC_DIR`
(`public/` at the repository root); it is not an environment variable.

## Run in production mode
Build the client into `public/`, then start the server, which serves `public/` and the API:
```
cd client && npm install && npm run build
cd ../server && npm install && npm start
```
Open http://localhost:3000. The SPA uses hash URLs (e.g. `http://localhost:3000/#/dashboard`),
so the server has no catch-all route.

Seeded login: `admin` / `admin123` (created on first start when the `users` table is empty).

## Run in development mode
Run the API and the Vite dev server in two terminals:
```
cd server && npm start          # API on http://localhost:3000
cd client && npm run dev        # Vite dev server, proxies /api to http://localhost:3000
```
Open the URL Vite prints (by default http://localhost:5173).

## Tests
```
cd server && npm test    # Jest + supertest
cd client && npm test    # Vitest + Vue Test Utils (jsdom)
```

## Project layout
```
client/            Vue 3 app (Vite)
  src/views/       LoginView.vue, DashboardView.vue
  src/router.js    routes (hash history): /login, /dashboard
  src/api.js       fetch wrappers for the API
  src/auth.js      client-side auth state
  src/__tests__/   Vitest tests
server/            Express backend
  app.js           app wiring; listens only when run directly
  config.js        environment configuration
  db.js            SQLite connection, schema and admin seed
  session.js       express-session setup
  routes/auth.js   /api/login, /api/logout, /api/me
  routes/dashboard.js  /api/dashboard
  test/            Jest tests
public/            generated client build output (gitignored; do not edit)
```

## API
All endpoints are under `/api`, use JSON, and rely on the session cookie.

| Method & path | Success | Failure |
| --- | --- | --- |
| `POST /api/login` with `{username, password}` | `200 {ok: true, username}` and a session is started | `401 {ok: false, error: 'bad credentials'}`; `500 {ok: false, error: 'db error'}` |
| `POST /api/logout` | `200 {ok: true}` (session destroyed) | – |
| `GET /api/me` | `200 {username}` | `401 {error: 'not logged in'}` |
| `GET /api/dashboard` | `200 {kpis: {revenue, users, orders, conversion}, transactions: [{id, customer, amount, status, date}]}` (randomly generated demo data, 10 transactions) | `401 {error: 'not logged in'}` |

## Known issues (separate hardening work, intentionally not addressed here)
- `/api/login` builds its SQL by string concatenation (SQL injection).
- Passwords are stored in plain text, and a default `admin` / `admin123` account is seeded.
- The login page displays a credentials hint.
- The session cookie has no hardening flags (e.g. `httpOnly`, `secure`, `sameSite` are not configured).
- Sessions use the in-memory `MemoryStore`, which is not suitable for production.
