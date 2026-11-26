import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import * as api from './api.js';

vi.mock('./api.js');

const DATA = {
  kpis: { revenue: '$1', users: 2, orders: 3, conversion: '4%' },
  transactions: [{ id: 1, customer: 'Acme', amount: '$10.00', status: 'paid', date: '2024-01-01' }],
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('App routing', () => {
  it('renders LoginView at /login', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders DashboardView at /dashboard', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockResolvedValue(DATA);
    renderAt('/dashboard');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
  });

  it('redirects unknown routes to /login', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('redirects unauthenticated /dashboard to /login', async () => {
    api.getMe.mockRejectedValue(new Error('401'));
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(api.getDashboard).not.toHaveBeenCalled();
  });

  it('login, dashboard load, logout call api in order and end on /login', async () => {
    const calls = [];
    api.login.mockImplementation(async () => { calls.push('login'); return {}; });
    api.getMe.mockImplementation(async () => { calls.push('getMe'); return { username: 'admin' }; });
    api.getDashboard.mockImplementation(async () => { calls.push('getDashboard'); return DATA; });
    api.logout.mockImplementation(async () => { calls.push('logout'); return {}; });
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument());
    expect(calls).toEqual(['login', 'getMe', 'getDashboard', 'logout']);
  });
});
