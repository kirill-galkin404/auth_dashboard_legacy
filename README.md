# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. Written deliberately in an old
style — not a role model, but material to be rewritten.

## Stack
- Frontend: React 18 + Vite (single-page app in `frontend/`, built to `frontend/dist`)
- Backend: Node.js + Express (old style, single app.js)
- Database: SQLite
- Auth: cookie-based sessions

## Prerequisites
Node.js 18 or newer (and npm).

## Run
```
cd frontend
npm install
npm run build
cd ../server
npm install
npm start
```
Open http://localhost:3000

The server serves the built frontend from `frontend/dist`. Set the `FRONTEND_DIR`
environment variable to serve a different directory instead; use an absolute path, since a
relative one resolves against the server's working directory.

Login: `admin` / `admin123`

## What is intentionally "bad" here
Plain-text passwords, SQL built by string concatenation (SQL injection), all logic in a
single file, var/callbacks, no input validation. This is the material to refactor.
