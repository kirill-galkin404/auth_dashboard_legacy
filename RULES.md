# Business rules

This document records the behaviour rules of the auth dashboard: the Express backend (`server/app.js`, `server/db.js`) and the React single-page app (`frontend/src`, built into `public/`) that replaced the legacy AngularJS frontend (`public/app.js`, `login.html`, `dashboard.html`; see `git show a6f099d:public/app.js`).

Every rule is one block that starts with a line `### R-000N <ruleKey>` and lists its **Parameters**, **Edge cases**, **Known defects** and **Tests**. Each claim was checked against the code or a test.

* **[preserve]** rules describe behaviour the React rewrite keeps exactly as the legacy app had it.
* **[change]** rules (R-0001, R-0004) describe behaviour the rewrite deliberately changed. They give the old (AngularJS) and the new behaviour.

**Defects that are intentionally NOT fixed.** The backend is deliberately legacy and the rewrite is frontend-only (no edits under `server/`). The backend defects below are recorded, not fixed: raw-string SQL (SQL injection), plaintext stored passwords, the hard-coded session secret `legacy-secret`, the seeded `admin` / `admin123` account, and the public credential hint on the login page. The two silent client failures of the old AngularJS app (R-0001 and R-0004) are the only defects the rewrite fixes.

Test files:

* `e2e/tests/api-contract.spec.js`: the HTTP API contract, run against the real server.
* `e2e/tests/login-dashboard.spec.js`: browser flows (Playwright) against the built SPA.
* `e2e/tests/known-defects.spec.js`: the two formerly known client defects, now pinned as fixed.
* `frontend/src/**/*.test.*`: Vitest unit tests (`api/client.test.js`, `auth/auth.test.jsx`, `pages/pages.test.jsx`, `components/components.test.jsx`).

## Authentication and session policy

### R-0006 server-auth-backend.login-credential-match

**Rule [preserve].** `POST /api/login` logs a user in only if the `users` table has a row whose `username` and `password` equal the supplied values exactly. A match stores `{id, username}` in the session and answers `200 {ok:true, username}`. No match answers `401 {ok:false, error:'bad credentials'}`. Source: `server/app.js`, `/api/login` handler.

**Parameters**
* Input: JSON body `{username, password}`, parsed by `express.json()`.
* The comparison is done by SQLite in `SELECT * FROM users WHERE username = '<u>' AND password = '<p>'`, so it is an exact string match on both columns (case-sensitive for ordinary comparisons).
* Success response `{ok:true, username:<row.username>}`. Failure response `{ok:false, error:'bad credentials'}` with status 401.

**Edge cases**
* Wrong password or unknown username: both give 401 and no session is created (`saveUninitialized:false`, so no cookie is issued either).
* A database error answers `500 {ok:false, error:'db error'}`. A quote in the input is one way to cause it, because it breaks the SQL text.
* A missing `username` or `password` is concatenated as the text `undefined` and simply matches no row, so the answer is 401.
* If several rows matched, `db.get` takes the first.

**Known defects (not fixed, out of scope)**
* SQL injection: the query is built by raw string concatenation (`"... username = '" + username + "' AND password = '" + password + "'"`), with a comment in the code saying it is intentionally injectable. For example, a username of `admin' --` logs in without the password.
* Passwords are stored and compared in plaintext (the column holds the literal password, there is no hashing or salting).
* No rate limiting or lockout.

**Tests:** `e2e/tests/api-contract.spec.js` (R-0006 cases: seeded admin logs in, wrong password 401, unknown username 401 with no session, exact case-sensitive match).

### R-0007 server-auth-backend.session-gated-access

**Rule [preserve].** `GET /api/me` and `GET /api/dashboard` answer `401 {error:'not logged in'}` unless the session holds a logged-in user (`req.session.user`). `POST /api/logout` destroys the session. Source: `server/app.js`.

**Parameters**
* `GET /api/me` with a session answers `200 {username}`.
* Session middleware: `express-session` with `secret:'legacy-secret'`, `resave:false`, `saveUninitialized:false`, and the default in-memory store.
* `POST /api/logout` calls `req.session.destroy` and then answers `200 {ok:true}`.

**Edge cases**
* After logout, `/api/me` and `/api/dashboard` are 401, and the old session id is dead on the server too (a replayed cookie does not log in again).
* Logout without any session still answers `200 {ok:true}`. Logout always returns `ok:true` and never reports an error, because the destroy callback ignores its error argument.
* The session cookie is the default `connect.sid` cookie (details in the audit section).

**Known defects (not fixed, out of scope)**
* The session secret `legacy-secret` is hard-coded in the source.
* Sessions live in the default MemoryStore: they are lost on restart and the store is not meant for production.
* No CSRF protection and no `Secure`, `SameSite` or `maxAge` cookie options.

**Tests:** `e2e/tests/api-contract.spec.js` (R-0007 cases for `/api/me`, `/api/dashboard`, logout destroying the session, dead old session id, logout without a session).

### R-0008 server-auth-backend.default-admin-seed

**Rule [preserve].** On startup, `server/db.js` creates the `users` table if it does not exist (`id INTEGER PRIMARY KEY, username TEXT, password TEXT`). If `SELECT COUNT(*)` finds it empty, it inserts one user, `admin` with password `admin123`, and logs `seeded admin user`.

**Parameters**
* Database file: `server/data.sqlite` (`path.join(__dirname, 'data.sqlite')`). It is git-ignored.
* The seed runs once per empty table, inside `db.serialize`, at module load (that is, when the server starts).

**Edge cases**
* The seed is skipped if the table already has any row. Deleting the `admin` row while other rows exist does not re-create it.
* If the count query fails, the error is only logged (`db count error`) and no seed is attempted. The server keeps running.
* A fresh checkout with no database file creates the file and seeds it, so the seeded login works with no setup.

**Known defects (not fixed, out of scope)**
* The seeded account `admin` / `admin123` is a well-known default credential in the source, stored in plaintext, and the login page publishes it (see R-0005). There is no way to change it and no forced password change.

**Tests:** `e2e/tests/api-contract.spec.js` (the R-0006 / R-0008 case: the seeded `admin` / `admin123` logs in with 200 and a session cookie).

## Client session gating and navigation

### R-0001 public-frontend.dashboard-requires-active-session

**Rule [change].** When the dashboard opens, the app first checks who the current user is (`GET /api/me`). If that check fails, the user is sent to the login page and no dashboard data is loaded.

**Old (AngularJS) behaviour.** `DashboardCtrl` called `/api/me` first. On success it stored the username and called `loadDashboard()`. On failure it redirected to `/login`. But `loadDashboard()` had no error handler: a 401 (or any error) from `/api/dashboard`, for example when the session expired between the two calls, left the dashboard shell on screen with no KPIs and no table. That was a silent failure, a known defect (silent 401 on `/api/dashboard` leaving an empty page).

**New (React) behaviour.**
* `RequireAuth` wraps the `/dashboard` route. It renders nothing while `GET /api/me` is pending, and renders the dashboard only after it succeeds. Nothing calls `/api/dashboard` before that.
* The redirect to `/login` happens on ANY `/api/me` failure (401, 500 or a network error). React keeps the old redirect-on-any-failure behaviour. The user is cleared.
* `/api/me` is re-checked on every dashboard mount. There is no cached verdict, so going away and coming back checks again.
* A `/api/dashboard` 401 sends the user to `/login` (`handleApiError`). The old silent empty page is fixed.
* Any other dashboard load error (500 or network) shows a visible message, `Something went wrong. Please try again.`, and no data.

**Parameters**
* Dashboard load runs on mount. **Refresh** re-calls `/api/dashboard` (not `/api/me`) and replaces the data. The error message is cleared at the start of each load.
* KPIs and the transactions table render only when data is loaded (`data` is truthy). Before the first successful load, or after a failed first load, neither is shown. Values are shown as the server sent them, unformatted.
* The header shows the username from `/api/me`.

**Edge cases**
* A failed Refresh with a non-401 error shows the message and keeps the previously loaded data on screen (the data state is not cleared). A 401 on Refresh redirects to `/login`.
* Opening `/dashboard` with no session redirects to `/login` and the dashboard markup never appears.

**Known defects**
* Known defect (fixed, formerly): silent 401 on `/api/dashboard` leaving an empty page. It is pinned as fixed by `e2e/tests/known-defects.spec.js`.
* Remaining: the server-side session secret and in-memory store issues of R-0007 still apply. The guard only trusts `/api/me`, and each API call is still checked server-side.

**Tests:** `e2e/tests/login-dashboard.spec.js` (R-0001 cases: unauthenticated dashboard redirects, no dashboard call when `/api/me` fails, Refresh reloads the data); `e2e/tests/known-defects.spec.js` (dashboard 401 redirects to login); unit tests `frontend/src/auth/auth.test.jsx` and `frontend/src/pages/pages.test.jsx`.

### R-0002 public-frontend.login-outcome-handling

**Rule [preserve].** A successful login sends the user to the dashboard (`navigate('/dashboard')`). Any failed login attempt shows the same generic message, `Invalid username or password`.

**Parameters**
* The message is the constant `LOGIN_ERROR_MESSAGE` in `LoginPage.jsx`. It is shown in `<p class="error">`. The old text in `public/app.js` was identical.
* The error is cleared at the start of each new submit.

**Edge cases**
* Any failure gets the same message: 401 bad credentials, a login 500 (`{error:'db error'}`) which still shows `Invalid username or password`, and network errors. The UI never tells the user the real cause.
* There is no client-side validation: empty username or password fields are sent to the server as they are, and the server's answer decides. The form keeps the typed values after an error.
* There is no auto-forward: opening `/login` while already logged in does not redirect to the dashboard (the login page never calls `/api/me`). The user stays on the form.
* A successful login lands on the dashboard route, where R-0001 then runs its own `/api/me` check.

**Known defects**
* The generic message hides real server failures (500 looks like wrong credentials). It is kept on purpose to preserve the old behaviour.
* No throttling of repeated attempts (see R-0006).

**Tests:** `e2e/tests/login-dashboard.spec.js` (R-0002 cases: failed login shows the error, successful login opens the dashboard, a non-401 login failure shows the generic error); unit tests `frontend/src/pages/pages.test.jsx` (generic message for 401, 500 and network errors; empty fields submitted; no auto-forward).

### R-0003 public-frontend.default-route-login

**Rule [preserve].** Only `/login` and `/dashboard` are valid routes. Any other path, including the empty path `/`, redirects to the login page.

**Parameters**
* Routes in `App.jsx`: `/login` (LoginPage), `/dashboard` (guarded by RequireAuth), `/` and `*` (both `<Navigate to="/login" replace />`).
* The router is a `HashRouter`, so URLs look like `/#/login`. The AngularJS baseline used `#!/login`, and old `#!/...` links therefore land on the login page.

**Edge cases**
* The redirect uses `replace`, so the unknown path is not kept in history.
* A redirect to `/login` does not check for a session (see R-0002 on no auto-forward). An unknown path for a logged-in user also lands on the login form.

**Known defects:** none known.

**Tests:** `e2e/tests/login-dashboard.spec.js` (R-0003 cases: unknown path redirects to login, empty path redirects to login).

### R-0004 public-frontend.logout-redirect

**Rule [change].** Logging out calls the server (`POST /api/logout`) and sends the user to the login page only once the server call succeeds.

**Old (AngularJS) behaviour.** `$scope.logout` redirected to `/login` only in the `.then` of the call. There was no error handler, so a failed logout did nothing visible: the user stayed on the dashboard with no message. That is a known defect (silent logout failure).

**New (React) behaviour.**
* `handleLogout` awaits `logout()`. On success it clears the user and navigates to `/login`.
* On failure it stays on the dashboard, keeps the loaded data, and shows a visible message (`Something went wrong. Please try again.`). If the failure is a 401, the user is sent to `/login` like any other 401.

**Parameters**
* Any non-2xx or network error counts as a failed call. The earlier error message is cleared before each attempt.

**Edge cases**
* The server never fails on its own logout (see R-0007: it always answers `ok:true`), so the failure path is reachable only through network or proxy errors.
* After a successful logout, going to `/dashboard` redirects to `/login` (the session is gone, R-0001).

**Known defects**
* Known defect (fixed, formerly): silent logout failure. It is pinned as fixed by `e2e/tests/known-defects.spec.js`.

**Tests:** `e2e/tests/login-dashboard.spec.js` (R-0004: logout returns to login and the session is really gone); `e2e/tests/known-defects.spec.js` (failed logout shows a message and stays on the dashboard); unit test `frontend/src/pages/pages.test.jsx`.

### R-0005 public-frontend.login-page-credential-hint

**Rule [preserve].** The login form shows a visible hint with the admin username and password: `<p class="hint">admin / admin123</p>`.

**Parameters**
* The text is hard-coded in `LoginForm.jsx` (as in the legacy `login.html`). It is always visible and does not depend on any state.

**Edge cases**
* The hint is shown even if the seeded account no longer exists (R-0008 seeds only once), so it can be wrong.

**Known defects (not fixed, out of scope)**
* The page publishes the default admin credential `admin123` to anyone who opens it. Together with R-0008 and R-0006, it exposes an admin login. The hint is required by the rule, so it was preserved.

**Tests:** `e2e/tests/login-dashboard.spec.js` (R-0005: credential hint visible); unit test `frontend/src/pages/pages.test.jsx`.

## Dashboard data generation

### R-0009 server-auth-backend.dashboard-mock-data-ranges

**Rule [preserve].** Each `GET /api/dashboard` call (with a logged-in session) generates and returns 10 random transactions and four KPIs, drawn from fixed ranges. Nothing is persisted and nothing is derived from real data.

**Parameters** (`rnd(min, max)` is a uniform random integer, inclusive on both ends)
* Response shape: `{kpis:{revenue, users, orders, conversion}, transactions:[...]}`.
* Transactions: exactly 10 transactions per call (`10 transactions`), with `id` 1..10 in order, so the ids restart at 1 on every call.
* `customer`: one of Acme, Globex, Initech, Umbrella, Soylent, Hooli, Stark, Wayne, followed by ` Inc` (`<name> Inc`, for example `Acme Inc`).
* `amount`: integer in 50-5000.
* `status`: one of paid, pending, failed.
* `date`: the UTC date, in `YYYY-MM-DD` form, of now minus a random 0-30 days (`toISOString().slice(0, 10)`).
* KPIs: `revenue` integer 10000-99999; `users` integer 100-9999; `orders` integer 50-2000.
* `conversion`: a string for a random number in 0-10 with 2 decimals (`toFixed(2)`), followed by `%` (for example `7.31%`).

**Edge cases**
* Two calls return different data. Repeated Refresh clicks show new numbers each time, and the numbers are not stable across reloads.
* Without a session the endpoint answers 401 before generating anything (R-0007).
* The dates use UTC, so the shown day can differ from the local day near midnight.
* Values are mock data: they have no relation to the users table or to each other (for example, revenue is not the sum of the amounts).

**Known defects:** none known; the fake data is by design. Note only that the data is not real, so it must not be used for decisions.

**Tests:** `e2e/tests/api-contract.spec.js` (R-0009 cases: shape, ranges and formats; fresh data on each call and no persistence); the browser flow in `e2e/tests/login-dashboard.spec.js` checks the rendered format (5-digit revenue, `\d{1,2}\.\d{2}%` conversion, 10 rows).

## Audit of unlisted rules

This pass covered `public/` (the legacy `public/app.js`, `login.html`, `dashboard.html`, `index.html`, read from git history `a6f099d`, and the React sources in `frontend/src` with their build in `public/assets`) and `server/` (`server/app.js`, `server/db.js`). Items are classified as a rule (kept as behaviour to preserve) or as not a rule, with a reason.

| Item | Where | Classification |
| --- | --- | --- |
| Listen port 3000, hard-coded, no env override; logs `listening on http://localhost:3000` | `server/app.js` (`app.listen(3000)`) | Rule (operational, preserve). The Vite dev proxy and the e2e config point at port 3000. |
| Session cookie: default `express-session` options, so the cookie is named `connect.sid`, `Path=/`, `HttpOnly`, not `Secure`, no `SameSite`, no `maxAge` (a browser-session cookie). Issued only when a session is modified, i.e. on a successful login | `server/app.js` session setup | Rule (preserve). Weak settings are recorded as defects under R-0007. |
| Logout always returns `{ok:true}` with 200, even without a session or if destroy fails | `server/app.js` `/api/logout` | Rule (preserve), documented under R-0004 and R-0007. |
| `express.json()` is the only body parser; there is no CORS, no helmet, no rate limiting | `server/app.js` | Not a rule: there is no behaviour to specify, only absent middleware. |
| Static files served from `public/` (`express.static`); `/` serves `index.html`. There is no SPA fallback, so a deep path such as `/dashboard` is a 404 from the server (the SPA is routed through `#/` hash URLs) | `server/app.js` | Rule (preserve). It is the reason the React app uses `HashRouter`. |
| Database file `server/data.sqlite`, created on first start, git-ignored | `server/db.js` | Rule (operational), recorded under R-0008. |
| Transaction ids are always 1..10 and are not stored anywhere | `server/app.js` `/api/dashboard` | Part of R-0009, not a separate rule. |
| Server API errors: 401 `{error:'not logged in'}` for gated routes, `{ok:false,error:...}` for login | `server/app.js` | Part of R-0006 and R-0007. The client does not show these texts, it uses its own messages. |
| `/api/login` accepts and ignores extra fields; a repeated login on an existing session overwrites `session.user` | `server/app.js` | Not a rule: incidental behaviour with no requirement behind it. |
| The legacy `public/app.js` routes (`/login`, `/dashboard`, otherwise redirect to `/login`) | `public/app.js` | Rule R-0003. |
| Legacy `public/app.js` did not guard `/api/dashboard` errors or logout failures | `public/app.js` | Defects of R-0001 and R-0004 (changed). |
| Legacy `public/app.js` and the React login page did not forward a logged-in user from `/login` | `public/app.js`, `LoginPage.jsx` | Rule (preserve), documented as no auto-forward in R-0002. |
| React `ApiError` mapping: network failure gives status 0; message taken from the body `error` or `Request failed with status N`; `credentials:'include'` on every call | `frontend/src/api/client.js` | Not a rule: implementation detail. Only status 401 versus other drives behaviour (R-0001, R-0004). |
| Generic client error text `Something went wrong. Please try again.` | `frontend/src/auth/AuthContext.jsx` | Part of the changed behaviour in R-0001 and R-0004. |
| Dashboard layout (header with username, Refresh and Log out buttons, 4 KPI cards, 5-column table) and styling | `frontend/src/components`, `public/dashboard.html` | Not a rule: presentation. The labels (Revenue, Users, Orders, Conversion; #, Customer, Amount, Status, Date) are kept from the legacy templates. |
| Legacy loaded AngularJS 1.8.2 from the Google CDN; the React build is self-contained in `public/assets` | `public/index.html` (git history) | Not a rule: a deployment detail that went away with the rewrite. |
