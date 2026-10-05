var os = require('os');
var fs = require('fs');
var path = require('path');
var request = require('supertest');

var tmpDir;
var dbFile;
var app;
var db;

function countUsers(conn) {
  return new Promise(function (resolve, reject) {
    conn.get('SELECT COUNT(*) AS c FROM users', function (err, row) {
      if (err) { reject(err); return; }
      resolve(row.c);
    });
  });
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function waitForSeed(conn) {
  for (var i = 0; i < 100; i++) {
    try {
      if ((await countUsers(conn)) >= 1) return;
    } catch (e) { /* table not created yet */ }
    await sleep(50);
  }
  throw new Error('admin seed did not appear');
}

beforeAll(async function () {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-dashboard-'));
  dbFile = path.join(tmpDir, 'test.sqlite');
  process.env.DB_PATH = dbFile;
  db = require('../db');
  app = require('../app');
  await waitForSeed(db);
});

afterAll(async function () {
  await new Promise(function (resolve) { db.close(resolve); });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.DB_PATH;
});

async function loggedInAgent() {
  var agent = request.agent(app);
  await agent.post('/api/login').send({ username: 'admin', password: 'admin123' }).expect(200);
  return agent;
}

describe('POST /api/login', function () {
  test('logs in the seeded admin and sets a session cookie without expiry', async function () {
    var res = await request(app).post('/api/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, username: 'admin' });
    var cookies = res.headers['set-cookie'];
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^connect\.sid=/);
    expect(cookies[0]).not.toMatch(/Max-Age/i);
    expect(cookies[0]).not.toMatch(/Expires/i);
  });

  test('rejects a wrong password with 401', async function () {
    var res = await request(app).post('/api/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'bad credentials' });
  });

  test('rejects an unknown user with 401', async function () {
    var res = await request(app).post('/api/login').send({ username: 'nobody', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'bad credentials' });
  });

  test('SQL built by concatenation: an injected comment still logs in', async function () {
    var res = await request(app).post('/api/login').send({ username: "admin' --", password: 'anything' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, username: 'admin' });
  });

  test('a lone quote breaks the concatenated SQL and returns 500', async function () {
    var res = await request(app).post('/api/login').send({ username: "'", password: 'x' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'db error' });
  });
});

describe('GET /api/me', function () {
  test('is 401 without a session', async function () {
    var res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'not logged in' });
  });

  test('returns the username with a session', async function () {
    var agent = await loggedInAgent();
    var res = await agent.get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'admin' });
  });
});

describe('GET /api/dashboard', function () {
  test('is 401 without a session', async function () {
    var res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'not logged in' });
  });

  test('returns 4 KPIs in fixed ranges and 10 transactions', async function () {
    var agent = await loggedInAgent();
    var res = await agent.get('/api/dashboard');
    expect(res.status).toBe(200);
    var kpis = res.body.kpis;
    expect(Object.keys(kpis).sort()).toEqual(['conversion', 'orders', 'revenue', 'users']);
    expect(kpis.revenue).toBeGreaterThanOrEqual(10000);
    expect(kpis.revenue).toBeLessThanOrEqual(99999);
    expect(kpis.users).toBeGreaterThanOrEqual(100);
    expect(kpis.users).toBeLessThanOrEqual(9999);
    expect(kpis.orders).toBeGreaterThanOrEqual(50);
    expect(kpis.orders).toBeLessThanOrEqual(2000);
    expect(kpis.conversion).toMatch(/^\d\.\d\d%$/);

    var txns = res.body.transactions;
    expect(txns).toHaveLength(10);
    txns.forEach(function (t, i) {
      expect(t.id).toBe(i + 1);
      expect(t.customer).toMatch(/ Inc$/);
      expect(t.amount).toBeGreaterThanOrEqual(50);
      expect(t.amount).toBeLessThanOrEqual(5000);
      expect(['paid', 'pending', 'failed']).toContain(t.status);
      expect(t.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('POST /api/logout', function () {
  test('returns ok and destroys the session', async function () {
    var agent = await loggedInAgent();
    var out = await agent.post('/api/logout');
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true });
    var me = await agent.get('/api/me');
    expect(me.status).toBe(401);
    expect(me.body).toEqual({ error: 'not logged in' });
  });
});

describe('admin seed', function () {
  test('exists exactly once as admin/admin123', function () {
    return new Promise(function (resolve, reject) {
      db.all('SELECT username, password FROM users', function (err, rows) {
        if (err) { reject(err); return; }
        try {
          expect(rows).toEqual([{ username: 'admin', password: 'admin123' }]);
          resolve();
        } catch (e) { reject(e); }
      });
    });
  });

  test('a second db load on the same file does not seed again', async function () {
    var second;
    jest.isolateModules(function () {
      second = require('../db');
    });
    await waitForSeed(second);
    await sleep(200);
    expect(await countUsers(second)).toBe(1);
    expect(await countUsers(db)).toBe(1);
    await new Promise(function (resolve) { second.close(resolve); });
  });
});

describe('default database path', function () {
  test('is server/data.sqlite when DB_PATH is unset', function () {
    var saved = process.env.DB_PATH;
    delete process.env.DB_PATH;
    var opened = [];
    try {
      jest.isolateModules(function () {
        jest.doMock('sqlite3', function () {
          function Database(file) { opened.push(file); }
          Database.prototype.serialize = function (fn) { fn(); };
          Database.prototype.run = function () {};
          Database.prototype.get = function () {};
          return { Database: Database };
        });
        require('../db');
      });
    } finally {
      jest.dontMock('sqlite3');
      process.env.DB_PATH = saved;
    }
    expect(opened).toEqual([path.join(__dirname, '..', 'data.sqlite')]);
  });
});
