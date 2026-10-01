# auth_dashboard_legacy

A small auth dashboard: an Express + SQLite backend and a React single-page app
(login page and dashboard).

## Stack

- Frontend: React 18, React Router (hash routes), built with Vite
- Backend: Node.js + Express, SQLite, cookie-based sessions
- Tests: Vitest (frontend unit tests), Playwright (end-to-end)

## Layout

| Path | Contents |
| --- | --- |
| `server/` | Express backend (`app.js`, `db.js`); serves `../public` on port 3000 |
| `frontend/` | React + Vite source (`src/`), Vitest tests, theme tokens in `src/styles/tokens.css` |
| `public/` | Built frontend output. Committed, so a fresh clone runs without building |
| `e2e/` | Playwright end-to-end tests |
| `RULES.md` | Business rules, known defects and test mapping |

## Prerequisites

- Node.js and npm

## Install

```
npm install --prefix server
npm install --prefix frontend
npm install --prefix e2e
npx playwright install chromium   # one-time, for the E2E tests
```

## Run

```
npm start --prefix server
```

Open http://localhost:3000. The server serves the committed `public/` build.

## Development

Start the backend, then the Vite dev server in a second terminal:

```
npm start --prefix server
npm run dev --prefix frontend
```

The Vite dev server proxies `/api` to the backend on port 3000.

## Build

```
npm run build --prefix frontend
```

This writes the production bundle into the repo-root `public/`. Commit the result
so the server keeps working from a fresh clone.

## Tests

Frontend unit tests (Vitest):

```
npm test --prefix frontend
```

End-to-end tests (Playwright), run from `e2e/`:

```
cd e2e
npx playwright test
```

The Playwright config starts the Express server itself, so stop any server
already listening on port 3000 first.

## Theme

Styling uses CSS custom properties defined in `frontend/src/styles/tokens.css`,
with a light and a dark theme. The theme follows the operating system through the
`prefers-color-scheme` media query. There is no toggle and no stored preference:
change your OS appearance setting and the app follows it.

## Business rules and known defects

Behaviour rules, edge cases and the test that covers each one are recorded in
[RULES.md](RULES.md). It also lists the known backend defects. They are recorded
there, not fixed: the backend is intentionally left as it is, and the frontend
work made no changes under `server/`.
