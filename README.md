# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. Written deliberately in an old
style — not a role model, but material to be rewritten.

## Stack
- Frontend: Vite + React 18 + TypeScript (`client/`), built to `client/dist` and served by Express
- Backend: Node.js + Express (old style, single app.js) — still the original legacy code, not yet rewritten
- Database: SQLite
- Auth: cookie-based sessions

## Run
```
cd client
npm install
npm run build

cd ../server
npm install
npm start
```
Open http://localhost:3000

Login: `admin` / `admin123`

For frontend development with hot reload, run `npm run dev` in `client/`
instead of `npm run build` (it proxies `/api/*` to the backend on port 3000)
alongside `npm start` in `server/`.

## What is intentionally "bad" here
Plain-text passwords, SQL built by string concatenation (SQL injection), all logic in a
single file, var/callbacks, no input validation. This is the material to refactor. The
frontend has been re-platformed off AngularJS; the backend has not.
