# auth_dashboard_legacy

A sandbox project for a legacy refactoring experiment. Written deliberately in an old
style — not a role model, but material to be rewritten.

## Stack
- Frontend: AngularJS 1.8 (from CDN, no build step)
- Backend: Node.js + Express (old style, single app.js)
- Database: SQLite
- Auth: cookie-based sessions

## Run
```
cd server
npm install
npm start
```
Open http://localhost:3000

Login: `admin` / `admin123`

## What is intentionally "bad" here
Plain-text passwords, SQL built by string concatenation (SQL injection), all logic in a
single file, var/callbacks, no input validation. This is the material to refactor.
