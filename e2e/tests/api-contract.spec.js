const { test, expect } = require('@playwright/test');
const { ADMIN } = require('./helpers');

const CUSTOMERS = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne'].map(
  (n) => n + ' Inc'
);
const STATUSES = ['paid', 'pending', 'failed'];

async function loggedIn(playwright, baseURL) {
  const ctx = await playwright.request.newContext({ baseURL });
  const res = await ctx.post('/api/login', { data: ADMIN });
  expect(res.status()).toBe(200);
  return ctx;
}

function expectDashboardShape(body) {
  expect(Object.keys(body).sort()).toEqual(['kpis', 'transactions']);

  const k = body.kpis;
  expect(Object.keys(k).sort()).toEqual(['conversion', 'orders', 'revenue', 'users']);
  for (const [key, min, max] of [['revenue', 10000, 99999], ['users', 100, 9999], ['orders', 50, 2000]]) {
    expect(Number.isInteger(k[key])).toBe(true);
    expect(k[key]).toBeGreaterThanOrEqual(min);
    expect(k[key]).toBeLessThanOrEqual(max);
  }
  expect(typeof k.conversion).toBe('string');
  expect(k.conversion).toMatch(/^\d{1,2}\.\d{2}%$/);
  const conv = parseFloat(k.conversion);
  expect(conv).toBeGreaterThanOrEqual(0);
  expect(conv).toBeLessThanOrEqual(10);

  expect(body.transactions).toHaveLength(10);
  const now = Date.now();
  body.transactions.forEach((t, i) => {
    expect(Object.keys(t).sort()).toEqual(['amount', 'customer', 'date', 'id', 'status']);
    expect(t.id).toBe(i + 1);
    expect(CUSTOMERS).toContain(t.customer);
    expect(Number.isInteger(t.amount)).toBe(true);
    expect(t.amount).toBeGreaterThanOrEqual(50);
    expect(t.amount).toBeLessThanOrEqual(5000);
    expect(STATUSES).toContain(t.status);
    expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const ageDays = (now - Date.parse(t.date + 'T00:00:00Z')) / 86400000;
    // date is UTC date of (now - 0..30 days); allow a day of slack for truncation
    expect(ageDays).toBeGreaterThanOrEqual(-0.01);
    expect(ageDays).toBeLessThanOrEqual(31.01);
  });
}

test.describe('POST /api/login', () => {
  test('R-0006 / R-0008 seeded admin/admin123 logs in with 200 {ok:true,username} and a session cookie', async ({ playwright, baseURL }) => {
    const ctx = await playwright.request.newContext({ baseURL });
    const res = await ctx.post('/api/login', { data: ADMIN });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true, username: 'admin' });

    const setCookie = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
    expect(setCookie).toHaveLength(1);
    expect(setCookie[0].value).toMatch(/^connect\.sid=/);
    expect(setCookie[0].value).toMatch(/;\s*HttpOnly/i);
    expect(setCookie[0].value).toMatch(/;\s*Path=\//i);

    const cookies = (await ctx.storageState()).cookies;
    const sid = cookies.find((c) => c.name === 'connect.sid');
    expect(sid).toBeTruthy();
    expect(sid.httpOnly).toBe(true);
    await ctx.dispose();
  });

  test('R-0006 wrong password is rejected with 401 {ok:false,error:"bad credentials"}', async ({ request }) => {
    const res = await request.post('/api/login', { data: { username: 'admin', password: 'wrong-password' } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: 'bad credentials' });
  });

  test('R-0006 unknown username is rejected with 401 and no session is created', async ({ request }) => {
    const res = await request.post('/api/login', { data: { username: 'nobody', password: 'admin123' } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ ok: false, error: 'bad credentials' });
    expect(res.headersArray().some((h) => h.name.toLowerCase() === 'set-cookie')).toBe(false);

    const me = await request.get('/api/me');
    expect(me.status()).toBe(401);
  });

  test('R-0006 username and password must match exactly (case-sensitive)', async ({ request }) => {
    for (const data of [
      { username: 'Admin', password: 'admin123' },
      { username: 'admin', password: 'ADMIN123' },
    ]) {
      const res = await request.post('/api/login', { data });
      expect(res.status()).toBe(401);
      expect(await res.json()).toEqual({ ok: false, error: 'bad credentials' });
    }
  });
});

test.describe('GET /api/me', () => {
  test('R-0007 returns 401 {error:"not logged in"} without a session', async ({ request }) => {
    const res = await request.get('/api/me');
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'not logged in' });
  });

  test('R-0007 returns 200 {username} once logged in', async ({ playwright, baseURL }) => {
    const ctx = await loggedIn(playwright, baseURL);
    const res = await ctx.get('/api/me');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ username: 'admin' });
    await ctx.dispose();
  });
});

test.describe('GET /api/dashboard', () => {
  test('R-0007 returns 401 {error:"not logged in"} without a session', async ({ request }) => {
    const res = await request.get('/api/dashboard');
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'not logged in' });
  });

  test('R-0009 returns 10 transactions and KPIs within the fixed ranges and formats', async ({ playwright, baseURL }) => {
    const ctx = await loggedIn(playwright, baseURL);
    const res = await ctx.get('/api/dashboard');
    expect(res.status()).toBe(200);
    expectDashboardShape(await res.json());
    await ctx.dispose();
  });

  test('R-0009 every call is freshly generated, always in range, and nothing is persisted', async ({ playwright, baseURL }) => {
    const ctx = await loggedIn(playwright, baseURL);
    const seen = new Set();
    for (let i = 0; i < 5; i++) {
      const res = await ctx.get('/api/dashboard');
      expect(res.status()).toBe(200);
      const body = await res.json();
      expectDashboardShape(body);
      seen.add(JSON.stringify(body));
    }
    // Random data: five identical payloads is practically impossible (not an exact-value assertion).
    expect(seen.size).toBeGreaterThan(1);

    // Nothing is persisted: the session still only holds the user.
    const me = await ctx.get('/api/me');
    expect(await me.json()).toEqual({ username: 'admin' });
    await ctx.dispose();
  });
});

test.describe('POST /api/logout', () => {
  test('R-0007 destroys the session: /api/me and /api/dashboard are 401 afterwards', async ({ playwright, baseURL }) => {
    const ctx = await loggedIn(playwright, baseURL);
    expect((await ctx.get('/api/me')).status()).toBe(200);

    const out = await ctx.post('/api/logout');
    expect(out.status()).toBe(200);
    expect(await out.json()).toEqual({ ok: true });

    const me = await ctx.get('/api/me');
    expect(me.status()).toBe(401);
    expect(await me.json()).toEqual({ error: 'not logged in' });

    const dash = await ctx.get('/api/dashboard');
    expect(dash.status()).toBe(401);
    expect(await dash.json()).toEqual({ error: 'not logged in' });
    await ctx.dispose();
  });

  test('R-0007 the old session id is dead server-side after logout', async ({ playwright, baseURL }) => {
    const ctx = await loggedIn(playwright, baseURL);
    const sid = (await ctx.storageState()).cookies.find((c) => c.name === 'connect.sid');
    await ctx.post('/api/logout');
    await ctx.dispose();

    const replay = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `connect.sid=${sid.value}` },
    });
    const me = await replay.get('/api/me');
    expect(me.status()).toBe(401);
    await replay.dispose();
  });

  test('R-0007 logout without a session still returns 200 {ok:true}', async ({ request }) => {
    const res = await request.post('/api/logout');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
