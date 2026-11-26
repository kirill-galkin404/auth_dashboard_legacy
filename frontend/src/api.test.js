import { describe, it, expect, vi, afterEach } from 'vitest';
import { login, getMe, getDashboard, logout } from './api';

function stubFetch(status, body = { ok: true }) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api', () => {
  it('login posts JSON credentials', async () => {
    const f = stubFetch(200, { success: true });
    const data = await login('alice', 'pw');
    expect(data).toEqual({ success: true });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/login');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('same-origin');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body)).toEqual({ username: 'alice', password: 'pw' });
  });

  it('getMe GETs /api/me', async () => {
    const f = stubFetch(200, { username: 'alice' });
    expect(await getMe()).toEqual({ username: 'alice' });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/me');
    expect(opts.method).toBe('GET');
    expect(opts.credentials).toBe('same-origin');
  });

  it('getDashboard GETs /api/dashboard', async () => {
    const f = stubFetch(200, { a: 1 });
    expect(await getDashboard()).toEqual({ a: 1 });
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/dashboard');
    expect(opts.method).toBe('GET');
    expect(opts.credentials).toBe('same-origin');
  });

  it('logout POSTs /api/logout with no body', async () => {
    const f = stubFetch(200);
    await logout();
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('/api/logout');
    expect(opts.method).toBe('POST');
    expect(opts.credentials).toBe('same-origin');
    expect(opts.body).toBeUndefined();
  });

  it.each([401, 500])('rejects on status %i', async (status) => {
    stubFetch(status);
    await expect(getMe()).rejects.toMatchObject({ status });
    await expect(login('a', 'b')).rejects.toMatchObject({ status });
    await expect(getDashboard()).rejects.toMatchObject({ status });
    await expect(logout()).rejects.toMatchObject({ status });
  });
});
