import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client.js', async () => {
  const actual = await vi.importActual('../api/client.js');
  return {
    ...actual,
    getMe: vi.fn(),
    getDashboard: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  };
});

import { ApiError, getMe, getDashboard, login, logout } from '../api/client.js';
import App from '../App.jsx';

const DASHBOARD = {
  kpis: { revenue: 12345, users: 678, orders: 90, conversion: '3.45%' },
  transactions: [
    { id: 1, customer: 'Acme Inc', amount: 4999, status: 'paid', date: '2024-01-02' },
    { id: 2, customer: 'Globex Inc', amount: 1000000, status: 'pending', date: '2024-01-03' },
  ],
};

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

async function submitLogin(username = 'admin', password = 'admin123') {
  await userEvent.type(screen.getByPlaceholderText('Username'), username);
  await userEvent.type(screen.getByPlaceholderText('Password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
}

beforeEach(() => {
  vi.resetAllMocks();
  getMe.mockResolvedValue({ username: 'admin' });
  getDashboard.mockResolvedValue(DASHBOARD);
});

describe('LoginPage', () => {
  it('login success navigates to the dashboard', async () => {
    login.mockResolvedValue({ ok: true, username: 'admin' });
    const { container } = renderApp('/login');
    expect(container.querySelector('p.hint')).toHaveTextContent('admin / admin123');

    await submitLogin();

    expect(login).toHaveBeenCalledWith('admin', 'admin123');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(container.querySelector('.dashboard')).toBeInTheDocument();
    expect(container.querySelector('.login-box')).toBeNull();
  });

  it.each([
    ['401', new ApiError('Invalid credentials', 401)],
    ['500', new ApiError('Server error', 500)],
    ['network', new ApiError('Network error', 0)],
  ])('a %s login failure shows the generic message', async (_n, err) => {
    login.mockRejectedValue(err);
    const { container } = renderApp('/login');

    await submitLogin('admin', 'nope');

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(container.querySelector('p.error')).toHaveTextContent(/^Invalid username or password$/);
    expect(container.querySelector('.login-box')).toBeInTheDocument();
    expect(container.querySelector('.dashboard')).toBeNull();
  });

  it('submits empty fields to the server without client-side validation', async () => {
    login.mockRejectedValue(new ApiError('Invalid credentials', 401));
    renderApp('/login');

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(login).toHaveBeenCalledWith('', '');
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('does not forward to the dashboard when already logged in', async () => {
    renderApp('/login');
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(getMe).not.toHaveBeenCalled();
    expect(getDashboard).not.toHaveBeenCalled();
  });
});

describe('DashboardPage', () => {
  it('checks /api/me first, then loads and shows the data unformatted', async () => {
    const { container } = renderApp('/dashboard');

    await waitFor(() => expect(container.querySelectorAll('.kpi')).toHaveLength(4));
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(getDashboard).toHaveBeenCalledTimes(1);
    expect(getMe.mock.invocationCallOrder[0]).toBeLessThan(getDashboard.mock.invocationCallOrder[0]);

    expect(container.querySelector('header span')).toHaveTextContent('admin');
    const values = [...container.querySelectorAll('.kpi-value')].map((n) => n.textContent);
    expect(values).toEqual(['12345', '678', '90', '3.45%']);
    const rows = container.querySelectorAll('.txns tbody tr');
    expect(rows).toHaveLength(2);
    expect([...rows[1].querySelectorAll('td')].map((n) => n.textContent)).toEqual([
      '2',
      'Globex Inc',
      '1000000',
      'pending',
      '2024-01-03',
    ]);
  });

  it('renders no KPIs or table until the data has loaded', async () => {
    let resolveDash;
    getDashboard.mockReturnValue(new Promise((r) => (resolveDash = r)));
    const { container } = renderApp('/dashboard');

    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(container.querySelector('.kpis')).toBeNull();
    expect(container.querySelector('.txns')).toBeNull();

    resolveDash(DASHBOARD);
    await waitFor(() => expect(container.querySelector('.txns')).toBeInTheDocument());
  });

  it('redirects to login and loads nothing when /api/me fails', async () => {
    getMe.mockRejectedValue(new ApiError('Not authenticated', 401));
    const { container } = renderApp('/dashboard');

    expect(await screen.findByPlaceholderText('Username')).toBeInTheDocument();
    expect(container.querySelector('.login-box')).toBeInTheDocument();
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it('a dashboard 401 redirects to login', async () => {
    getDashboard.mockRejectedValue(new ApiError('Not authenticated', 401));
    const { container } = renderApp('/dashboard');

    expect(await screen.findByPlaceholderText('Username')).toBeInTheDocument();
    expect(container.querySelector('.dashboard')).toBeNull();
  });

  it('another dashboard error shows a visible message and no data', async () => {
    getDashboard.mockRejectedValue(new ApiError('Server error', 500));
    const { container } = renderApp('/dashboard');

    await waitFor(() => expect(container.querySelector('p.error')).toBeInTheDocument());
    expect(container.querySelector('p.error').textContent).not.toBe('');
    expect(container.querySelector('.dashboard')).toBeInTheDocument();
    expect(container.querySelector('.kpis')).toBeNull();
    expect(container.querySelector('.txns')).toBeNull();
  });

  it('Refresh calls getDashboard again and shows the new data', async () => {
    const { container } = renderApp('/dashboard');
    await waitFor(() => expect(container.querySelectorAll('.kpi')).toHaveLength(4));
    expect(getDashboard).toHaveBeenCalledTimes(1);

    getDashboard.mockResolvedValue({ ...DASHBOARD, kpis: { ...DASHBOARD.kpis, users: 4321 } });
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(getDashboard).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect([...container.querySelectorAll('.kpi-value')].map((n) => n.textContent)[1]).toBe('4321')
    );
  });

  it('logout success goes to the login page', async () => {
    logout.mockResolvedValue({ ok: true });
    const { container } = renderApp('/dashboard');
    await waitFor(() => expect(container.querySelectorAll('.kpi')).toHaveLength(4));

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByPlaceholderText('Username')).toBeInTheDocument();
    expect(container.querySelector('.dashboard')).toBeNull();
  });

  it('logout failure shows a message and stays on the dashboard', async () => {
    logout.mockRejectedValue(new ApiError('Server error', 500));
    const { container } = renderApp('/dashboard');
    await waitFor(() => expect(container.querySelectorAll('.kpi')).toHaveLength(4));

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(container.querySelector('p.error')).toBeInTheDocument());
    expect(container.querySelector('.dashboard')).toBeInTheDocument();
    expect(container.querySelector('.login-box')).toBeNull();
    expect(container.querySelectorAll('.kpi')).toHaveLength(4);
  });
});

describe('routing', () => {
  it.each([['/nope'], ['/some/deep/path'], ['/']])('path %s ends on the login page', async (path) => {
    const { container } = renderApp(path);
    expect(await screen.findByPlaceholderText('Username')).toBeInTheDocument();
    expect(container.querySelector('.login-box')).toBeInTheDocument();
    expect(getMe).not.toHaveBeenCalled();
  });
});
