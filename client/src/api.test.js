import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from './api.js';

function mockResponse(status, data) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) };
}

describe('api', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login POSTs JSON credentials and resolves parsed body', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { ok: true }));
    const data = await api.login('alice', 'pw');
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 'pw' }),
    });
  });

  it('me GETs /api/me', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { username: 'alice' }));
    const data = await api.me();
    expect(data.username).toBe('alice');
    expect(fetchMock).toHaveBeenCalledWith('/api/me', { method: 'GET', credentials: 'same-origin' });
  });

  it('dashboard GETs /api/dashboard', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { items: [1] }));
    const data = await api.dashboard();
    expect(data).toEqual({ items: [1] });
    expect(fetchMock).toHaveBeenCalledWith('/api/dashboard', { method: 'GET', credentials: 'same-origin' });
  });

  it('logout POSTs /api/logout', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { ok: true }));
    const data = await api.logout();
    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith('/api/logout', { method: 'POST', credentials: 'same-origin' });
  });

  it.each([
    ['login', () => api.login('a', 'b')],
    ['me', () => api.me()],
    ['dashboard', () => api.dashboard()],
    ['logout', () => api.logout()],
  ])('%s rejects with status on 401', async (_name, call) => {
    fetchMock.mockResolvedValue(mockResponse(401, { error: 'nope' }));
    await expect(call()).rejects.toMatchObject({ status: 401 });
  });
});
