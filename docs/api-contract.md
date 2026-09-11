# Frozen API Contract — auth_dashboard_legacy

This document records the **exact** current behavior of the legacy Express
server (`server/app.js`, `server/db.js`) as of commit `a6f099d38c705d752e400a55c603f1050596091e`.
It is a factual snapshot of existing behavior, not a design proposal. Any
rewrite (new backend language/framework, new frontend) MUST preserve this
contract byte-for-byte: the same 4 endpoints, the same request/response JSON
shapes, the same HTTP status codes, and the same session-cookie attributes.

Source of truth: `server/app.js`, `server/package.json` (dependency
versions), `server/db.js`.

## Server basics

- The server listens on port `3000` (`app.listen(3000, ...)`).
- The server serves the `public/` directory as static files from the same
  origin as the API (`app.use(express.static(path.join(__dirname, '..', 'public')))`),
  mounted before the API routes. There is no separate frontend origin/port —
  the frontend and the API are served same-origin, so cookies set by the API
  are usable by same-origin frontend `fetch`/`XHR` calls without CORS
  configuration.
- Request bodies are parsed as JSON via `express.json()`.
- Dependency versions (from `server/package.json`): `express` `^4.18.2`,
  `express-session` `^1.17.3`, `sqlite3` `^5.1.6`.

## Session cookie

Configured via:

```js
app.use(session({
  secret: 'legacy-secret',
  resave: false,
  saveUninitialized: false
}));
```

No `cookie` option is passed, so `express-session` (v1.17.3) applies its
documented defaults for the session cookie:

| Attribute  | Value                                    | Source |
|------------|-------------------------------------------|--------|
| Name       | `connect.sid`                              | express-session default cookie name (not overridden) |
| Path       | `/`                                         | express-session default `cookie.path` |
| HttpOnly   | `true`                                      | express-session default `cookie.httpOnly` |
| Secure     | `false` (attribute omitted from Set-Cookie) | express-session default `cookie.secure` is `false`; no HTTPS in dev, not overridden |
| SameSite   | Not explicitly set by the server            | express-session does not set `cookie.sameSite` unless configured, so no `SameSite` attribute is emitted in `Set-Cookie`; the browser applies its own default (modern browsers, e.g. Chrome, default un-annotated cookies to `Lax`) |
| Expires / Max-Age | Not set (session cookie)             | `cookie.maxAge` defaults to `null` → `expires: undefined`, i.e. a session-only cookie that is discarded when the browser is closed, not on a fixed TTL |
| Signed     | Yes (HMAC signed with secret `'legacy-secret'`) | `express-session` signs the session ID cookie value using the configured `secret` |

Session store: the in-memory `MemoryStore` (the default `express-session`
store when no `store` option is provided). This is not persistent across
server restarts and is not suitable for multi-process/production
deployment, but that is existing, frozen behavior being documented here, not
a defect to fix in this lane.

## Endpoints

All 4 endpoints below are the complete set of API routes defined in
`server/app.js`. No other API routes exist.

### `POST /api/login`

Request body (JSON):
```json
{ "username": "string", "password": "string" }
```

Behavior: looks up the user by username/password against the `users` SQLite
table (via `server/db.js`) and, on match, sets `req.session.user = { id, username }`.

Responses:

| Condition | Status | Body |
|---|---|---|
| Database error during lookup | `500` | `{ "ok": false, "error": "db error" }` |
| No matching user row (bad credentials) | `401` | `{ "ok": false, "error": "bad credentials" }` |
| Matching user row found | `200` | `{ "ok": true, "username": "<row.username>" }` |

On success, the response also sets the session cookie (`Set-Cookie:
connect.sid=...`) per the "Session cookie" section above.

### `POST /api/logout`

Request body: none required/used.

Behavior: destroys the current session (`req.session.destroy(...)`).

Responses:

| Condition | Status | Body |
|---|---|---|
| Always (destroy callback invoked) | `200` | `{ "ok": true }` |

### `GET /api/me`

Request body: none.

Behavior: checks whether `req.session.user` is set.

Responses:

| Condition | Status | Body |
|---|---|---|
| Session has a logged-in user | `200` | `{ "username": "<session.user.username>" }` |
| No session / no logged-in user | `401` | `{ "error": "not logged in" }` |

### `GET /api/dashboard`

Request body: none.

Behavior: requires a logged-in session; if authenticated, generates and
returns randomized dashboard data on every call (KPIs + a fixed-size list of
10 transactions). Values are randomly generated per-request, not persisted.

Responses:

| Condition | Status | Body |
|---|---|---|
| No session / no logged-in user | `401` | `{ "error": "not logged in" }` |
| Logged-in user | `200` | see shape below |

`200` response body shape:

```json
{
  "kpis": {
    "revenue": 10000,
    "users": 100,
    "orders": 50,
    "conversion": "3.42%"
  },
  "transactions": [
    {
      "id": 1,
      "customer": "Acme Inc",
      "amount": 50,
      "status": "paid",
      "date": "2024-01-01"
    }
  ]
}
```

Field constraints (matching `server/app.js` generation logic exactly):

- `kpis.revenue`: integer in `[10000, 99999]`.
- `kpis.users`: integer in `[100, 9999]`.
- `kpis.orders`: integer in `[50, 2000]`.
- `kpis.conversion`: string formatted as a number with exactly 2 decimal
  places followed by a literal `%`, in the range `"0.00%"`–`"10.00%"`
  (e.g. `"3.42%"`).
- `transactions`: array of **exactly 10** objects, each with:
  - `id`: integer, `1`–`10` (position in the array, `i + 1`).
  - `customer`: one of the 8 company names — `Acme`, `Globex`, `Initech`,
    `Umbrella`, `Soylent`, `Hooli`, `Stark`, `Wayne` — each with the literal
    suffix `" Inc"` appended (e.g. `"Acme Inc"`, `"Stark Inc"`).
  - `amount`: integer in `[50, 5000]`.
  - `status`: one of `"paid"`, `"pending"`, `"failed"`.
  - `date`: string in `YYYY-MM-DD` format, within the last 30 days
    (inclusive) from the time of the request.

## Non-goals of this document

This document only records existing behavior for `server/app.js` as it
stands. It intentionally does not:

- Propose changes to the endpoint set, request/response shapes, status
  codes, or session-cookie attributes described above (these are frozen).
- Cover the new Python backend or React frontend being built in other
  lanes/stages of this rewrite — those must conform to this contract, not
  redefine it.
