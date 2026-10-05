# auth_dashboard_legacy

A small login + dashboard app, used as a sandbox for a legacy refactoring experiment.

## Stack
- Frontend: React 18 with react-router (HashRouter), built with Vite (`client/`)
- Backend: Node.js + Express, split into `config`, `createApp`, `middleware/` and `routes/` modules (`server/`)
- Database: SQLite (`server/data.sqlite`, created on first start)
- Auth: cookie-based sessions (`express-session`)
- Theme: light and dark, following the OS `prefers-color-scheme` by default; the toggle in the corner of the page saves your choice in `localStorage`
- Tests: Jest + supertest (API contract), Vitest + React Testing Library (client)

## Install
```
npm run install:all
```

## Develop
Run the API and the Vite dev server in two terminals; the dev server proxies `/api` to the API.
```
npm start                  # API on http://localhost:3000
npm --prefix client run dev  # client on http://localhost:5173
```

## Build and start
```
npm run build   # builds the client into public/ (git-ignored)
npm start       # serves public/ and the API on http://localhost:3000
```

## Environment variables
| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the Express server listens on |
| `SESSION_SECRET` | a fixed development value | Secret used to sign session cookies. Always set it outside local development. |
| `DB_PATH` | `server/data.sqlite` | SQLite file location (used by the tests to run on a temporary file) |

## Sign in
On the first start with an empty database the server seeds one `admin` account. It exists for
local development only; look it up in `server/db.js` and do not use it anywhere else.

## Tests
```
npm test                       # server and client suites
npm --prefix server test       # API contract tests only
npm --prefix client test       # client tests only
```

## Known limitations
This project is deliberately legacy and these are not fixed yet (tracked as follow-ups):
- Passwords are stored and compared in plain text.
- `POST /api/login` builds its SQL by string concatenation (SQL injection); the contract tests pin this behavior.
- There is no input validation.
- Sessions use the in-memory store, keep default cookie options and the session id is not regenerated on login.
- Without `SESSION_SECRET` a fixed development secret is used.
