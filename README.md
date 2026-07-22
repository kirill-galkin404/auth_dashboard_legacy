# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. The backend has been
re-platformed from a single-file legacy Express app into a layered TypeScript
backend (routes → controllers → services → repositories); see
`server/CONTRACT.md` for the API contract.

## Stack
- Frontend: AngularJS 1.8 (from CDN, no build step)
- Backend: Node.js + Express + TypeScript (`server/`, layered: routes →
  controllers → services → repositories)
- Database: SQLite
- Auth: cookie-based sessions, persisted (not in-memory), bcrypt-hashed
  passwords

## Run
```
cd server
npm install
npm run build
SESSION_SECRET=<your-secret> npm start
```
Open http://localhost:3000

For development: `SESSION_SECRET=<your-secret> npm run dev` (uses `tsx`).

Login: `admin` / `admin123`

## Tests
```
cd server
npm test
```

## What was fixed here
The legacy backend (removed) built SQL by string concatenation (SQL
injection in `POST /api/login`), stored passwords in plain text, hardcoded
the session secret, and used the default in-memory session store. The
current backend uses parameterized queries, bcrypt password hashes, an
env-required session secret, and a persistent (SQLite-backed) session store.
