'use strict';

var test = require('node:test');
var assert = require('node:assert');
var fs = require('node:fs');
var os = require('node:os');
var path = require('node:path');
var spawn = require('node:child_process').spawn;

var SERVER_DIR = path.join(__dirname, '..');
var BASE = 'http://localhost:3000';

function startServer(env) {
  return new Promise(function (resolve, reject) {
    var child = spawn(process.execPath, ['app.js'], {
      cwd: SERVER_DIR,
      env: Object.assign({}, process.env, env),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    var out = '';
    var done = false;
    function finish(err) {
      if (done) { return; }
      done = true;
      clearTimeout(timer);
      if (err) { child.kill(); reject(err); } else { resolve(child); }
    }
    var timer = setTimeout(function () {
      finish(new Error('server did not start: ' + out));
    }, 15000);
    child.stdout.on('data', function (d) {
      out += d;
      if (out.indexOf('listening on') !== -1) { finish(); }
    });
    child.stderr.on('data', function (d) { out += d; });
    child.on('exit', function () { finish(new Error('server exited early: ' + out)); });
  });
}

function stopServer(child) {
  return new Promise(function (resolve) {
    if (child.exitCode !== null || child.signalCode !== null) { resolve(); return; }
    child.once('exit', function () { resolve(); });
    child.kill();
  });
}

async function waitForSeed() {
  for (var i = 0; i < 50; i++) {
    var res = await fetch(BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    if (res.status === 200) { return res; }
    await new Promise(function (r) { setTimeout(r, 100); });
  }
  throw new Error('seeded admin never became available');
}

test('serves the React build by default and runs the cookie login-to-logout sequence', async function () {
  var child = await startServer({ FRONTEND_DIR: '' });
  try {
    var page = await fetch(BASE + '/');
    assert.strictEqual(page.status, 200);
    var html = await page.text();
    var dist = fs.readFileSync(path.join(SERVER_DIR, '..', 'frontend', 'dist', 'index.html'), 'utf8');
    assert.strictEqual(html, dist);
    assert.match(html, /id="root"/);
    assert.match(html, /<script[^>]+src="[^"]+\.js"/);

    var login = await waitForSeed();
    var body = await login.json();
    assert.deepStrictEqual(body, { ok: true, username: 'admin' });
    var cookie = login.headers.get('set-cookie').split(';')[0];
    var headers = { Cookie: cookie };

    var me = await fetch(BASE + '/api/me', { headers: headers });
    assert.strictEqual(me.status, 200);
    assert.deepStrictEqual(await me.json(), { username: 'admin' });

    var dash = await fetch(BASE + '/api/dashboard', { headers: headers });
    assert.strictEqual(dash.status, 200);
    var data = await dash.json();
    assert.ok(data.kpis && Array.isArray(data.transactions));
    assert.strictEqual(data.transactions.length, 10);

    var logout = await fetch(BASE + '/api/logout', { method: 'POST', headers: headers });
    assert.strictEqual(logout.status, 200);
    assert.deepStrictEqual(await logout.json(), { ok: true });

    var after = await fetch(BASE + '/api/me', { headers: headers });
    assert.strictEqual(after.status, 401);
  } finally {
    await stopServer(child);
  }
});

test('FRONTEND_DIR overrides the static root', async function () {
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-dir-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<html><body>override-marker</body></html>');
  var child;
  try {
    child = await startServer({ FRONTEND_DIR: dir });
    var page = await fetch(BASE + '/');
    assert.strictEqual(page.status, 200);
    assert.match(await page.text(), /override-marker/);
  } finally {
    if (child) { await stopServer(child); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
