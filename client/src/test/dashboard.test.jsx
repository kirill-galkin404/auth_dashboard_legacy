import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import App from '../App.jsx';
import { DASHBOARD, callsTo, jsonResponse, mockFetch } from './helpers.js';

const baseRoutes = {
  'GET /api/me': jsonResponse(200, { username: 'tester' }),
  'GET /api/dashboard': jsonResponse(200, DASHBOARD)
};

describe('dashboard page', () => {
  beforeEach(() => {
    window.location.hash = '#/dashboard';
  });

  test('renders the four KPIs and the transactions as received', async () => {
    mockFetch(baseRoutes);
    render(<App />);

    for (const [label, value] of [
      ['Revenue', '12345'],
      ['Users', '678'],
      ['Orders', '90'],
      ['Conversion', '3.21%']
    ]) {
      const card = (await screen.findByText(label)).closest('.kpi');
      expect(within(card).getByText(value)).toBeInTheDocument();
    }

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(11); // header + 10 transactions
    expect(within(rows[1]).getByText('Customer1 Inc')).toBeInTheDocument();
    expect(within(rows[1]).getByText('2024-01-01')).toBeInTheDocument();
    expect(within(rows[10]).getByText('109')).toBeInTheDocument();
  });

  test('Refresh issues a second dashboard request and shows the new values', async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      ...baseRoutes,
      'GET /api/dashboard': () => {
        calls += 1;
        return jsonResponse(200, { ...DASHBOARD, kpis: { ...DASHBOARD.kpis, revenue: calls === 1 ? 12345 : 54321 } });
      }
    });
    render(<App />);
    expect(await screen.findByText('12345')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }));

    expect(await screen.findByText('54321')).toBeInTheDocument();
    expect(callsTo(fetchMock, 'GET /api/dashboard')).toHaveLength(2);
  });

  test('shows a visible error when the dashboard data cannot be loaded', async () => {
    mockFetch({ ...baseRoutes, 'GET /api/dashboard': jsonResponse(500, { error: 'x' }) });
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load dashboard data');
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
  });

  test('logout calls the server and returns to login on success', async () => {
    const fetchMock = mockFetch({ ...baseRoutes, 'POST /api/logout': jsonResponse(200, { ok: true }) });
    render(<App />);
    await screen.findByText('Revenue');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login');
    expect(callsTo(fetchMock, 'POST /api/logout')).toHaveLength(1);
  });

  test('a failed logout keeps the user on the dashboard with a message', async () => {
    mockFetch({ ...baseRoutes, 'POST /api/logout': jsonResponse(500, { error: 'x' }) });
    render(<App />);
    await screen.findByText('Revenue');

    await userEvent.setup().click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not log out');
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/dashboard');
  });
});
