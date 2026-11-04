import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

const dash = {
  kpis: { revenue: 12345, users: 678, orders: 90, conversion: '3.2%' },
  transactions: [
    { id: 1, customer: 'Acme Inc', amount: 100, status: 'paid', date: '2024-01-01' },
    { id: 2, customer: 'Globex Inc', amount: 200, status: 'failed', date: '2024-01-02' },
  ],
};

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

const calls = () => fetch.mock.calls.map(([url, opts]) => `${(opts && opts.method) || 'GET'} ${url}`);

describe('App routing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deep-link to /dashboard without a session lands on login and never fetches dashboard', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve(url === '/api/me' ? res(401, { error: 'unauthorized' }) : res(500, {}))
    );
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(calls()).toContain('GET /api/me');
    expect(calls()).not.toContain('GET /api/dashboard');
  });

  it('redirects unknown paths to login', async () => {
    renderApp('/nope');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('full flow: login -> dashboard -> logout -> login', async () => {
    fetch.mockImplementation((url, opts = {}) => {
      const key = `${opts.method || 'GET'} ${url}`;
      switch (key) {
        case 'POST /api/login':
          return Promise.resolve(res(200, { username: 'admin' }));
        case 'GET /api/me':
          return Promise.resolve(res(200, { username: 'admin' }));
        case 'GET /api/dashboard':
          return Promise.resolve(res(200, dash));
        case 'POST /api/logout':
          return Promise.resolve(res(200, { ok: true }));
        default:
          return Promise.resolve(res(404, {}));
      }
    });
    const user = userEvent.setup();
    renderApp('/login');

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(await screen.findByText('12345')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Globex Inc')).toBeInTheDocument();

    const login = fetch.mock.calls.find(([url]) => url === '/api/login');
    expect(JSON.parse(login[1].body)).toEqual({ username: 'admin', password: 'admin123' });

    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(calls()).toContain('POST /api/logout'));
  });
});
