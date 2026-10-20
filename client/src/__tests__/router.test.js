import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryHistory } from 'vue-router';

vi.mock('../api', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  dashboard: vi.fn()
}));

import * as api from '../api';
import { username } from '../auth';
import { createAppRouter } from '../router';

function makeRouter() {
  return createAppRouter(createMemoryHistory());
}

describe('router guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    username.value = null;
  });

  it('redirects unknown paths to /login', async () => {
    const router = makeRouter();
    await router.push('/nowhere/at/all');
    expect(router.currentRoute.value.path).toBe('/login');
    expect(api.me).not.toHaveBeenCalled();
  });

  it.each([401, 500])('redirects /dashboard to /login when api.me fails with %i', async (status) => {
    api.me.mockRejectedValue(Object.assign(new Error('x'), { status }));
    const router = makeRouter();
    await router.push('/dashboard');
    expect(router.currentRoute.value.path).toBe('/login');
    expect(api.dashboard).not.toHaveBeenCalled();
    expect(username.value).toBeNull();
  });

  it('allows /dashboard and sets the username when api.me resolves', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockResolvedValue({ kpis: {}, transactions: [] });
    const router = makeRouter();
    await router.push('/dashboard');
    expect(router.currentRoute.value.path).toBe('/dashboard');
    expect(username.value).toBe('admin');
  });
});
