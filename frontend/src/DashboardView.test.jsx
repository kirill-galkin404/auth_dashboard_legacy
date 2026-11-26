import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DashboardView from './DashboardView.jsx';
import * as api from './api.js';

vi.mock('./api.js');

const DATA = {
  kpis: { revenue: '$12,345', users: 321, orders: 45, conversion: '3.2%' },
  transactions: [
    { id: 1, customer: 'Acme', amount: '$10.00', status: 'paid', date: '2024-01-01' },
    { id: 2, customer: 'Globex', amount: '$20.00', status: 'pending', date: '2024-01-02' },
  ],
};

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('DashboardView', () => {
  it('calls getMe then getDashboard and renders tiles and rows', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockResolvedValue(DATA);
    renderView();
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(api.getMe.mock.invocationCallOrder[0]).toBeLessThan(
      api.getDashboard.mock.invocationCallOrder[0],
    );
    expect(screen.getByText('admin')).toBeInTheDocument();
    for (const label of ['Revenue', 'Users', 'Orders', 'Conversion']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText('$12,345')).toBeInTheDocument();
    expect(screen.getByText('3.2%')).toBeInTheDocument();
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['#', 'Customer', 'Amount', 'Status', 'Date']);
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(within(screen.getAllByRole('row')[2]).getByText('pending')).toBeInTheDocument();
  });

  it('redirects to /login when getMe fails and never loads the dashboard', async () => {
    api.getMe.mockRejectedValue(new Error('Request failed with status 401'));
    renderView();
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(api.getDashboard).not.toHaveBeenCalled();
  });

  it('renders only the header and buttons before data loads', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockReturnValue(new Promise(() => {}));
    renderView();
    expect(await screen.findByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('Refresh reloads; a failed refresh keeps data and does not redirect', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockResolvedValueOnce(DATA).mockRejectedValueOnce(new Error('401'));
    const user = userEvent.setup();
    renderView();
    await screen.findByText('Acme');
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(api.getDashboard).toHaveBeenCalledTimes(2));
    expect(api.getMe).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('Log out navigates to /login on success', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockResolvedValue(DATA);
    api.logout.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderView();
    await screen.findByText('Acme');
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalledTimes(1);
  });

  it('Log out failure stays on the dashboard', async () => {
    api.getMe.mockResolvedValue({ username: 'admin' });
    api.getDashboard.mockResolvedValue(DATA);
    api.logout.mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    renderView();
    await screen.findByText('Acme');
    await user.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
  });
});
