# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. Both the frontend and
backend have been re-platformed:

- The backend went from a single-file legacy Express app to a layered
  TypeScript backend (routes → controllers → services → repositories); see
  `server/CONTRACT.md` for the API contract.
- The frontend went from AngularJS 1.8 (CDN, no build step) to a
  Vite + React 18 + TypeScript SPA (`client/`), built to `client/dist` and
  served by the backend.

## Stack
- Frontend: Vite + React 18 + TypeScript (`client/`), built to `client/dist`
  and served by Express
- Backend: Node.js + Express + TypeScript (`server/`, layered: routes →
  controllers → services → repositories)
- Database: SQLite
- Auth: cookie-based sessions, persisted (not in-memory), bcrypt-hashed
  passwords

## Run
```
cd client
npm install --include=dev
npm run build

cd ../server
npm install --include=dev
npm run build
SESSION_SECRET=<your-secret> npm start
```
(`--include=dev` is only needed when `NODE_ENV=production` is set in the
shell/environment doing the install, since npm otherwise skips
`devDependencies` — both `client` and `server` need their devDependencies,
which include the build tooling like `typescript` and `vite`, present at
build time.)
Open http://localhost:3000

For development: `SESSION_SECRET=<your-secret> npm run dev` (uses `tsx`) in
`server/`, and `npm run dev` in `client/` (proxies `/api/*` to the backend on
port 3000) for frontend hot reload.

Login: `admin` / `admin123`

## Tests
```
cd server
npm test

cd ../client
npm test
```

## What was fixed here
The legacy backend (removed) built SQL by string concatenation (SQL
injection in `POST /api/login`), stored passwords in plain text, hardcoded
the session secret, and used the default in-memory session store. The
current backend uses parameterized queries, bcrypt password hashes, an
env-required session secret, and a persistent (SQLite-backed) session store.
The legacy AngularJS frontend (removed) has been replaced by a Vite + React +
TypeScript SPA.
