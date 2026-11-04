# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. Written deliberately in an old
style — not a role model, but material to be rewritten.

## Stack
- Frontend: React 18 with Vite (`client/`, react-router hash routing, Vitest for tests)
- Backend: Node.js + Express (old style, single app.js)
- Database: SQLite
- Auth: cookie-based sessions

## Prerequisites
Node.js 18 or newer and npm.

## Install
```
cd server && npm install
cd client && npm install
```

## Run (production)
Run `npm run build` before `npm start`: the build runs in `client/` and the start in
`server/`. Express serves the built frontend from `client/dist`.
```
cd client && npm run build
cd ../server && npm start
```
Open http://localhost:3000

## Run (development)
Start the API on port 3000, then the Vite dev server, which proxies `/api` to
`localhost:3000`:
```
cd server && npm start
cd client && npm run dev
```
Open the URL Vite prints (default http://localhost:5173).

## Tests
```
cd client && npm test
```

Login: `admin` / `admin123`

## What is intentionally "bad" here
Plain-text passwords, SQL built by string concatenation (SQL injection), all logic in a
single file, var/callbacks, no input validation. This is the material to refactor.
