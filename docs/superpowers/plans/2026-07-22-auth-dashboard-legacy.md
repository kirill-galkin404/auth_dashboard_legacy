# auth_dashboard_legacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deliberately-legacy AngularJS + Express/SQLite app with cookie-session auth and a random-data dashboard, as a refactoring exercise sandbox.

**Architecture:** Express monolith serves both the API and the static AngularJS frontend from one process. Auth is server-side sessions stored in a cookie. SQLite holds users. The dashboard endpoint generates random data on each request. Code is intentionally written in an old style (single file, `var`, callbacks, raw SQL strings) — quality is a non-goal.

**Tech Stack:** Node.js, Express 4, express-session, sqlite3, AngularJS 1.x (CDN), angular-route (CDN).

## Global Constraints

- Backend must run with `cd server && npm install && npm start` on macOS.
- Server listens on port **3000** and serves `public/` as static files.
- Frontend uses **no build step** — AngularJS loaded from CDN in `index.html`.
- Passwords stored as **plain text** in SQLite (intentional legacy).
- Seed user: username `admin`, password `admin123`.
- Old-style JS on the backend: `var`, callbacks, raw SQL string concatenation, single `app.js` for routes/logic.
- Verification uses `curl` and manual browser checks — no test framework.

---

### Task 1: Backend scaffold + SQLite with seeded user

**Files:**
- Create: `server/package.json`
- Create: `server/db.js`
- Create: `server/app.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `db.js` exports a connected `sqlite3.Database` instance as `module.exports` (a `db` object with `.get(sql, params, cb)`, `.all(sql, params, cb)`, `.run(sql, params, cb)`).
  - On first run `db.js` creates table `users(id INTEGER PRIMARY KEY, username TEXT, password TEXT)` and inserts `('admin','admin123')` if the table is empty.
  - `app.js` starts an Express server on port 3000 (routes added in later tasks).

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "auth-dashboard-legacy-server",
  "version": "1.0.0",
  "description": "Deliberately legacy backend",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "sqlite3": "^5.1.6"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd server && npm install`
Expected: `node_modules/` created, no fatal errors (sqlite3 prebuilt binary downloads).

- [ ] **Step 3: Create `server/db.js`**

```js
var sqlite3 = require('sqlite3');
var path = require('path');

var db = new sqlite3.Database(path.join(__dirname, 'data.sqlite'));

db.serialize(function () {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
  db.get('SELECT COUNT(*) AS c FROM users', function (err, row) {
    if (err) { console.log('db count error', err); return; }
    if (row.c === 0) {
      db.run("INSERT INTO users (username, password) VALUES ('admin', 'admin123')");
      console.log('seeded admin user');
    }
  });
});

module.exports = db;
```

- [ ] **Step 4: Create minimal `server/app.js`**

```js
var express = require('express');
var session = require('express-session');
var path = require('path');
var db = require('./db');

var app = express();

app.use(express.json());
app.use(session({
  secret: 'legacy-secret',
  resave: false,
  saveUninitialized: false
}));

// static frontend (files added in later tasks)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(3000, function () {
  console.log('listening on http://localhost:3000');
});
```

- [ ] **Step 5: Start the server and verify it boots + seeds**

Run: `cd server && npm start`
Expected: console prints `seeded admin user` (first run) and `listening on http://localhost:3000`. Stop with Ctrl+C.

- [ ] **Step 6: Verify the seed row exists**

Run: `cd server && node -e "var db=require('./db'); setTimeout(function(){db.get('SELECT * FROM users',function(e,r){console.log(r);process.exit(0);});},300);"`
Expected: prints `{ id: 1, username: 'admin', password: 'admin123' }`.

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/db.js server/app.js
git commit -m "feat: backend scaffold with seeded SQLite user"
```

Note: add `server/node_modules/` and `server/data.sqlite` to `.gitignore` in Task 5.

---

### Task 2: Auth endpoints (login / logout / me)

**Files:**
- Modify: `server/app.js` (add routes before `app.listen`)

**Interfaces:**
- Consumes: `db` from `db.js`; `session` middleware from Task 1.
- Produces:
  - `POST /api/login` — body `{username, password}`. On match sets `req.session.user = {id, username}` and returns `200 {ok:true, username}`. On no match returns `401 {ok:false, error:'bad credentials'}`.
  - `POST /api/logout` — destroys session, returns `200 {ok:true}`.
  - `GET /api/me` — returns `200 {username}` if `req.session.user` exists, else `401 {error:'not logged in'}`.

- [ ] **Step 1: Add auth routes in `server/app.js`**

Insert these routes after the `app.use(express.static(...))` line and before `app.listen`:

```js
app.post('/api/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  // legacy: raw string SQL concatenation (intentionally injectable)
  var sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
  db.get(sql, function (err, row) {
    if (err) { res.status(500).json({ ok: false, error: 'db error' }); return; }
    if (!row) { res.status(401).json({ ok: false, error: 'bad credentials' }); return; }
    req.session.user = { id: row.id, username: row.username };
    res.json({ ok: true, username: row.username });
  });
});

app.post('/api/logout', function (req, res) {
  req.session.destroy(function () {
    res.json({ ok: true });
  });
});

app.get('/api/me', function (req, res) {
  if (req.session && req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).json({ error: 'not logged in' });
  }
});
```

- [ ] **Step 2: Start server**

Run: `cd server && npm start`
Expected: `listening on http://localhost:3000`.

- [ ] **Step 3: Verify login success sets a cookie**

Run (new terminal):
`curl -i -c /tmp/cj.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:3000/api/login`
Expected: `HTTP/1.1 200`, body `{"ok":true,"username":"admin"}`, a `Set-Cookie: connect.sid=...` header.

- [ ] **Step 4: Verify /api/me with the saved cookie**

Run: `curl -b /tmp/cj.txt http://localhost:3000/api/me`
Expected: `{"username":"admin"}`.

- [ ] **Step 5: Verify bad credentials rejected**

Run: `curl -i -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}' http://localhost:3000/api/login`
Expected: `HTTP/1.1 401`, body `{"ok":false,"error":"bad credentials"}`.

- [ ] **Step 6: Verify /api/me without cookie is 401**

Run: `curl -i http://localhost:3000/api/me`
Expected: `HTTP/1.1 401`, body `{"error":"not logged in"}`. Stop server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add server/app.js
git commit -m "feat: cookie-session auth endpoints"
```

---

### Task 3: Dashboard endpoint with random data (session-guarded)

**Files:**
- Modify: `server/app.js` (add route before `app.listen`)

**Interfaces:**
- Consumes: `session` middleware; `req.session.user` set by `/api/login`.
- Produces:
  - `GET /api/dashboard` — if not logged in returns `401 {error:'not logged in'}`. If logged in returns `200` with shape:
    `{ kpis: { revenue, users, orders, conversion }, transactions: [ { id, customer, amount, status, date } x10 ] }`.
  - `revenue` number, `users` int, `orders` int, `conversion` string like `"3.42%"`; each transaction `amount` number, `status` one of `"paid"|"pending"|"failed"`, `date` ISO string.

- [ ] **Step 1: Add the dashboard route in `server/app.js`**

Insert before `app.listen`:

```js
app.get('/api/dashboard', function (req, res) {
  if (!req.session || !req.session.user) {
    res.status(401).json({ error: 'not logged in' });
    return;
  }

  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  var names = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne'];
  var statuses = ['paid', 'pending', 'failed'];
  var txns = [];
  var i;
  for (i = 0; i < 10; i++) {
    txns.push({
      id: i + 1,
      customer: names[rnd(0, names.length - 1)] + ' Inc',
      amount: rnd(50, 5000),
      status: statuses[rnd(0, statuses.length - 1)],
      date: new Date(Date.now() - rnd(0, 30) * 86400000).toISOString().slice(0, 10)
    });
  }

  res.json({
    kpis: {
      revenue: rnd(10000, 99999),
      users: rnd(100, 9999),
      orders: rnd(50, 2000),
      conversion: (Math.random() * 10).toFixed(2) + '%'
    },
    transactions: txns
  });
});
```

- [ ] **Step 2: Start server**

Run: `cd server && npm start`
Expected: `listening on http://localhost:3000`.

- [ ] **Step 3: Verify dashboard requires auth**

Run: `curl -i http://localhost:3000/api/dashboard`
Expected: `HTTP/1.1 401`, body `{"error":"not logged in"}`.

- [ ] **Step 4: Log in, then fetch dashboard with cookie**

Run:
`curl -c /tmp/cj.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' http://localhost:3000/api/login`
then `curl -b /tmp/cj.txt http://localhost:3000/api/dashboard`
Expected: JSON with `kpis` (revenue/users/orders/conversion) and a `transactions` array of 10 objects. Stop server.

- [ ] **Step 5: Commit**

```bash
git add server/app.js
git commit -m "feat: random-data dashboard endpoint guarded by session"
```

---

### Task 4: AngularJS frontend (login + dashboard SPA)

**Files:**
- Create: `public/index.html`
- Create: `public/app.js`
- Create: `public/login.html`
- Create: `public/dashboard.html`
- Create: `public/style.css`

**Interfaces:**
- Consumes: `POST /api/login`, `POST /api/logout`, `GET /api/me`, `GET /api/dashboard` from Tasks 2-3.
- Produces: a single-page app served at `http://localhost:3000/` with routes `#/login` and `#/dashboard`.

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html ng-app="legacyApp">
<head>
  <meta charset="utf-8">
  <title>Legacy Dashboard</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
  <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular-route.min.js"></script>
  <script src="app.js"></script>
</head>
<body>
  <div ng-view></div>
</body>
</html>
```

- [ ] **Step 2: Create `public/app.js`**

```js
var app = angular.module('legacyApp', ['ngRoute']);

app.config(function ($routeProvider) {
  $routeProvider
    .when('/login', { templateUrl: 'login.html', controller: 'LoginCtrl' })
    .when('/dashboard', { templateUrl: 'dashboard.html', controller: 'DashboardCtrl' })
    .otherwise({ redirectTo: '/login' });
});

app.controller('LoginCtrl', function ($scope, $http, $location) {
  $scope.username = '';
  $scope.password = '';
  $scope.error = '';

  $scope.login = function () {
    $http.post('/api/login', { username: $scope.username, password: $scope.password })
      .then(function () {
        $location.path('/dashboard');
      })
      .catch(function () {
        $scope.error = 'Invalid username or password';
      });
  };
});

app.controller('DashboardCtrl', function ($scope, $http, $location) {
  $scope.data = null;

  $http.get('/api/me').then(function (res) {
    $scope.user = res.data.username;
    loadDashboard();
  }).catch(function () {
    $location.path('/login');
  });

  function loadDashboard() {
    $http.get('/api/dashboard').then(function (res) {
      $scope.data = res.data;
    });
  }

  $scope.refresh = loadDashboard;

  $scope.logout = function () {
    $http.post('/api/logout').then(function () {
      $location.path('/login');
    });
  };
});
```

- [ ] **Step 3: Create `public/login.html`**

```html
<div class="login-box">
  <h1>Sign in</h1>
  <form ng-submit="login()">
    <input type="text" ng-model="username" placeholder="Username" autofocus>
    <input type="password" ng-model="password" placeholder="Password">
    <button type="submit">Log in</button>
  </form>
  <p class="error" ng-if="error">{{ error }}</p>
  <p class="hint">admin / admin123</p>
</div>
```

- [ ] **Step 4: Create `public/dashboard.html`**

```html
<div class="dashboard">
  <header>
    <h1>Dashboard</h1>
    <div>
      <span>{{ user }}</span>
      <button ng-click="refresh()">Refresh</button>
      <button ng-click="logout()">Log out</button>
    </div>
  </header>

  <div class="kpis" ng-if="data">
    <div class="kpi"><div class="kpi-value">{{ data.kpis.revenue }}</div><div class="kpi-label">Revenue</div></div>
    <div class="kpi"><div class="kpi-value">{{ data.kpis.users }}</div><div class="kpi-label">Users</div></div>
    <div class="kpi"><div class="kpi-value">{{ data.kpis.orders }}</div><div class="kpi-label">Orders</div></div>
    <div class="kpi"><div class="kpi-value">{{ data.kpis.conversion }}</div><div class="kpi-label">Conversion</div></div>
  </div>

  <table class="txns" ng-if="data">
    <thead>
      <tr><th>#</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
    </thead>
    <tbody>
      <tr ng-repeat="t in data.transactions">
        <td>{{ t.id }}</td>
        <td>{{ t.customer }}</td>
        <td>{{ t.amount }}</td>
        <td>{{ t.status }}</td>
        <td>{{ t.date }}</td>
      </tr>
    </tbody>
  </table>
</div>
```

- [ ] **Step 5: Create `public/style.css`**

```css
body { font-family: Arial, sans-serif; margin: 0; background: #f0f2f5; color: #222; }

.login-box { max-width: 320px; margin: 100px auto; background: #fff; padding: 30px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }
.login-box h1 { margin-top: 0; }
.login-box input { display: block; width: 100%; box-sizing: border-box; margin-bottom: 12px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.login-box button { width: 100%; padding: 10px; background: #3b5998; color: #fff; border: 0; border-radius: 4px; cursor: pointer; }
.error { color: #c00; }
.hint { color: #888; font-size: 12px; text-align: center; }

.dashboard { max-width: 900px; margin: 20px auto; padding: 0 16px; }
.dashboard header { display: flex; justify-content: space-between; align-items: center; }
.dashboard header button { margin-left: 8px; padding: 6px 12px; cursor: pointer; }

.kpis { display: flex; gap: 16px; margin: 20px 0; }
.kpi { flex: 1; background: #fff; padding: 20px; border-radius: 6px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.kpi-value { font-size: 26px; font-weight: bold; }
.kpi-label { color: #888; font-size: 13px; margin-top: 6px; }

.txns { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.txns th, .txns td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
.txns th { background: #fafafa; }
```

- [ ] **Step 6: Start server and verify frontend loads**

Run: `cd server && npm start`, then open `http://localhost:3000` in a browser.
Expected: redirect to `#/login`, login form visible.

- [ ] **Step 7: Manual end-to-end check**

In the browser: log in with `admin` / `admin123`.
Expected: redirect to `#/dashboard`, 4 KPI cards populated, 10-row table. Click "Refresh" → numbers change. Click "Log out" → back to login. Reload on `#/dashboard` while logged out → redirect to login.

- [ ] **Step 8: Commit**

```bash
git add public/
git commit -m "feat: AngularJS frontend with login and dashboard"
```

---

### Task 5: README + gitignore

**Files:**
- Create: `.gitignore`
- Create: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: run instructions and ignore rules. No runtime code.

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
server/data.sqlite
```

- [ ] **Step 2: Remove any tracked artifacts (in case they slipped in)**

Run: `git rm -r --cached server/node_modules server/data.sqlite 2>/dev/null; true`
Expected: either removes them from the index or does nothing. Harmless if already untracked.

- [ ] **Step 3: Create `README.md`**

```markdown
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
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md
git commit -m "docs: add README and gitignore"
```

---

## Self-Review Notes

- **Spec coverage:** stack (Task 1/4), auth cookie-session (Task 2), me/guard (Tasks 2-4), random dashboard (Task 3), KPI cards + table frontend (Task 4), intentional legacy anti-patterns (Tasks 1-3), run instructions (Task 5). All covered.
- **No placeholders:** every code step contains full code.
- **Type consistency:** dashboard JSON shape produced in Task 3 (`kpis.{revenue,users,orders,conversion}`, `transactions[].{id,customer,amount,status,date}`) matches consumption in Task 4's `dashboard.html` bindings.
