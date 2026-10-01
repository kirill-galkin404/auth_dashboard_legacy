import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, login, getMe, getDashboard, logout } from './client.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  };
}

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const calls = [
  {
    name: 'login',
    run: () => login('alice', 'pw'),
    url: '/api/login',
    method: 'POST',
    body: { username: 'alice', password: 'pw' },
    ok: { ok: true, username: 'alice' },
    err: { ok: false, error: 'bad credentials' },
  },
  {
    name: 'getMe',
    run: () => getMe(),
    url: '/api/me',
    method: 'GET',
    ok: { username: 'alice' },
    err: { error: 'not logged in' },
  },
  {
    name: 'getDashboard',
    run: () => getDashboard(),
    url: '/api/dashboard',
    method: 'GET',
    ok: { kpis: { revenue: 1, users: 2, orders: 3, conversion: 4 }, transactions: [] },
    err: { error: 'not logged in' },
  },
  {
    name: 'logout',
    run: () => logout(),
    url: '/api/logout',
    method: 'POST',
    ok: { ok: true },
    err: { error: 'not logged in' },
  },
];

describe.each(calls)('$name', (c) => {
  it('returns parsed JSON on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, c.ok));
    await expect(c.run()).resolves.toEqual(c.ok);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(c.url);
    expect(opts.method).toBe(c.method);
    expect(opts.credentials).toBe('include');
    if (c.method === 'POST') {
      expect(opts.headers['Content-Type']).toBe('application/json');
    }
    if (c.body) expect(JSON.parse(opts.body)).toEqual(c.body);
  });

  it('throws ApiError with status 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, c.err));
    const err = await c.run().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.message).toBe(c.err.error);
  });

  it('throws ApiError with status 0 on network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await c.run().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });
});

describe('ApiError', () => {
  it('handles non-JSON error bodies', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('x')) });
    const err = await getMe().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
  });
});
