import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StrictMode } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from './Dashboard.jsx';
import * as api from './api.js';

vi.mock('./api.js');

const dash = {
  kpis: { revenue: 12345, users: 678, orders: 90, conversion: '3.2%' },
  transactions: [
    { id: 1, customer: 'Acme Inc', amount: 100, status: 'paid', date: '2024-01-01' },
    { id: 2, customer: 'Globex Inc', amount: 200, status: 'failed', date: '2024-01-02' },
  ],
};

function renderDashboard(wrapper = (x) => x) {
  return render(
    wrapper(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
        </Routes>
      </MemoryRouter>
    )
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Dashboard', () => {
  it('redirects to /login when /api/me fails and never loads the dashboard', async () => {
    api.me.mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    renderDashboard();
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(api.dashboard).not.toHaveBeenCalled();
  });

  it('renders username, KPI tiles and transactions after load; nothing before', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    let resolve;
    api.dashboard.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { container } = renderDashboard();

    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(container.querySelector('.kpis')).toBeNull();
    expect(container.querySelector('table.txns')).toBeNull();

    resolve(dash);
    await waitFor(() => expect(container.querySelector('.kpis')).not.toBeNull());
    const tiles = container.querySelectorAll('.kpi');
    expect(tiles).toHaveLength(4);
    expect([...tiles].map((t) => [
      t.querySelector('.kpi-value').textContent,
      t.querySelector('.kpi-label').textContent,
    ])).toEqual([
      ['12345', 'Revenue'],
      ['678', 'Users'],
      ['90', 'Orders'],
      ['3.2%', 'Conversion'],
    ]);
    expect([...container.querySelectorAll('th')].map((t) => t.textContent)).toEqual(
      ['#', 'Customer', 'Amount', 'Status', 'Date']
    );
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect([...rows[1].querySelectorAll('td')].map((t) => t.textContent)).toEqual(
      ['2', 'Globex Inc', '200', 'failed', '2024-01-02']
    );
  });

  it('calls /api/me only once under StrictMode', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockResolvedValue(dash);
    renderDashboard((x) => <StrictMode>{x}</StrictMode>);
    expect(await screen.findByText('Revenue')).toBeInTheDocument();
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('Refresh refetches the dashboard', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockResolvedValue(dash);
    renderDashboard();
    await screen.findByText('Revenue');
    expect(api.dashboard).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.dashboard).toHaveBeenCalledTimes(2));
  });

  it('Log out calls the API and navigates to /login on success', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockResolvedValue(dash);
    api.logout.mockResolvedValue({});
    renderDashboard();
    await screen.findByText('Revenue');
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when logout fails', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockResolvedValue(dash);
    api.logout.mockRejectedValue(new Error('boom'));
    renderDashboard();
    await screen.findByText('Revenue');
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('LOGIN PAGE')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('does not redirect when the dashboard request fails', async () => {
    api.me.mockResolvedValue({ username: 'admin' });
    api.dashboard.mockRejectedValue(Object.assign(new Error('x'), { status: 500 }));
    const { container } = renderDashboard();
    expect(await screen.findByText('admin')).toBeInTheDocument();
    await waitFor(() => expect(api.dashboard).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('LOGIN PAGE')).toBeNull();
    expect(container.querySelector('.kpis')).toBeNull();
    expect(container.querySelector('table.txns')).toBeNull();
  });
});
