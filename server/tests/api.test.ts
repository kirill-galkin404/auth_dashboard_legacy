import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../src/app';

describe('API contract (login / me / dashboard / logout)', () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-test-'));
  const dbPath = path.join(workDir, 'data.sqlite');

  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-secret';
  });

  afterAll(() => {
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('GET /api/me returns 401 when not logged in', async () => {
    const app = await createApp({ dbPath, sessionStoreDir: workDir });
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'not logged in' });
  });

  it('GET /api/dashboard returns 401 when not logged in', async () => {
    const app = await createApp({ dbPath, sessionStoreDir: workDir });
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'not logged in' });
  });

  it('POST /api/login returns 401 with bad credentials', async () => {
    const app = await createApp({ dbPath, sessionStoreDir: workDir });
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'bad credentials' });
  });

  it('POST /api/login rejects a SQL-injection-shaped username', async () => {
    const app = await createApp({ dbPath, sessionStoreDir: workDir });
    const res = await request(app)
      .post('/api/login')
      .send({ username: "' OR '1'='1", password: "' OR '1'='1" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: 'bad credentials' });
  });

  it('runs the full login -> me -> dashboard -> logout flow with a persisted cookie', async () => {
    const app = await createApp({ dbPath, sessionStoreDir: workDir });

    const loginRes = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toEqual({ ok: true, username: 'admin' });

    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const meRes = await request(app).get('/api/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ username: 'admin' });

    const dashboardRes = await request(app).get('/api/dashboard').set('Cookie', cookie);
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.kpis).toEqual({
      revenue: expect.any(Number),
      users: expect.any(Number),
      orders: expect.any(Number),
      conversion: expect.stringMatching(/^\d+\.\d{2}%$/),
    });
    expect(dashboardRes.body.transactions).toHaveLength(10);
    expect(dashboardRes.body.transactions[0]).toEqual({
      id: expect.any(Number),
      customer: expect.any(String),
      amount: expect.any(Number),
      status: expect.stringMatching(/^(paid|pending|failed)$/),
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    const logoutRes = await request(app).post('/api/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({ ok: true });

    const meAfterLogout = await request(app).get('/api/me').set('Cookie', cookie);
    expect(meAfterLogout.status).toBe(401);
  });

  it('persists the session across a simulated server restart (new app instance, same store file)', async () => {
    const appA = await createApp({ dbPath, sessionStoreDir: workDir });
    const loginRes = await request(appA)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' });
    const cookie = loginRes.headers['set-cookie'];

    // Simulate a process restart: brand-new app/session-store instance,
    // pointed at the same persistent sqlite session store file.
    const appB = await createApp({ dbPath, sessionStoreDir: workDir });
    const meRes = await request(appB).get('/api/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body).toEqual({ username: 'admin' });
  });
});
