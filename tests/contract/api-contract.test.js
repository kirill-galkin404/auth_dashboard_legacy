'use strict';

/**
 * Contract test suite for the frozen 4-endpoint session-cookie API.
 *
 * Endpoints under test:
 *   POST /api/login    -> 200 {ok:true,username} | 401 {ok:false,error:'bad credentials'}
 *   POST /api/logout   -> 200 {ok:true}
 *   GET  /api/me        -> 200 {username} | 401 {error:'not logged in'}
 *   GET  /api/dashboard -> 200 {kpis:{...}, transactions:[...]} | 401 {error:'not logged in'}
 *
 * Designed to run UNCHANGED against any server implementing this contract
 * (the legacy Express server today, the future Python server later) --
 * point it at a different implementation via the BASE_URL env var.
 *
 * Session handling is done with minimal manual cookie-jar logic: capture
 * the Set-Cookie header from the login response and forward it as the
 * Cookie header on subsequent requests.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin123';

/** Extracts "name=value" cookie pairs from a fetch Response, ignoring
 * attributes like Path/HttpOnly/SameSite, for use as a Cookie header. */
function extractCookieHeader(response) {
  let rawCookies;
  if (typeof response.headers.getSetCookie === 'function') {
    rawCookies = response.headers.getSetCookie();
  } else {
    const single = response.headers.get('set-cookie');
    rawCookies = single ? [single] : [];
  }
  const pairs = rawCookies.map((cookieStr) => cookieStr.split(';')[0].trim());
  return pairs.join('; ');
}

async function login(username, password) {
  const response = await fetch(BASE_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json();
  const cookie = extractCookieHeader(response);
  return { response, body, cookie };
}

async function me(cookie) {
  const response = await fetch(BASE_URL + '/api/me', {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const body = await response.json();
  return { response, body };
}

async function dashboard(cookie) {
  const response = await fetch(BASE_URL + '/api/dashboard', {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const body = await response.json();
  return { response, body };
}

async function logout(cookie) {
  const response = await fetch(BASE_URL + '/api/logout', {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
  });
  const body = await response.json();
  return { response, body };
}

test('POST /api/login with bad credentials returns 401', async () => {
  const { response, body } = await login(VALID_USERNAME, 'not-the-right-password');
  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.error, 'bad credentials');
});

test('GET /api/me without a session returns 401', async () => {
  const { response, body } = await me();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'not logged in');
});

test('GET /api/dashboard without a session returns 401', async () => {
  const { response, body } = await dashboard();
  assert.equal(response.status, 401);
  assert.equal(body.error, 'not logged in');
});

test('full session lifecycle: login -> me -> dashboard -> logout -> me', async () => {
  // 1. Successful login returns ok:true + username, and sets a session cookie.
  const loginResult = await login(VALID_USERNAME, VALID_PASSWORD);
  assert.equal(loginResult.response.status, 200);
  assert.equal(loginResult.body.ok, true);
  assert.equal(loginResult.body.username, VALID_USERNAME);
  assert.ok(loginResult.cookie, 'expected a session cookie to be set on login');

  const cookie = loginResult.cookie;

  // 2. Authenticated /api/me returns the username.
  const meResult = await me(cookie);
  assert.equal(meResult.response.status, 200);
  assert.equal(meResult.body.username, VALID_USERNAME);

  // 3. Authenticated /api/dashboard returns the expected shape.
  const dashboardResult = await dashboard(cookie);
  assert.equal(dashboardResult.response.status, 200);
  const { kpis, transactions } = dashboardResult.body;

  assert.ok(kpis, 'expected a kpis object');
  assert.equal(typeof kpis.revenue, 'number');
  assert.ok(kpis.revenue >= 10000 && kpis.revenue <= 99999);
  assert.equal(typeof kpis.users, 'number');
  assert.ok(kpis.users >= 100 && kpis.users <= 9999);
  assert.equal(typeof kpis.orders, 'number');
  assert.ok(kpis.orders >= 50 && kpis.orders <= 2000);
  assert.equal(typeof kpis.conversion, 'string');
  assert.match(kpis.conversion, /^\d+(\.\d+)?%$/);

  assert.ok(Array.isArray(transactions));
  assert.equal(transactions.length, 10);
  for (const txn of transactions) {
    assert.equal(typeof txn.id, 'number');
    assert.equal(typeof txn.customer, 'string');
    assert.equal(typeof txn.amount, 'number');
    assert.ok(txn.amount >= 50 && txn.amount <= 5000);
    assert.equal(typeof txn.status, 'string');
    assert.equal(typeof txn.date, 'string');
  }

  // 4. Logout returns ok:true.
  const logoutResult = await logout(cookie);
  assert.equal(logoutResult.response.status, 200);
  assert.equal(logoutResult.body.ok, true);

  // 5. After logout, the session is gone: /api/me is unauthenticated again.
  const meAfterLogout = await me(cookie);
  assert.equal(meAfterLogout.response.status, 401);
  assert.equal(meAfterLogout.body.error, 'not logged in');
});
