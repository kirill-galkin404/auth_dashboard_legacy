import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { DashboardPage } from './DashboardPage';
import * as apiClient from '../api/client';
import type { DashboardData } from '../api/types';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getMe: vi.fn().mockResolvedValue({ username: 'admin' }),
    getDashboard: vi.fn(),
    postLogout: vi.fn().mockResolvedValue({ ok: true }),
  };
});

const sampleData: DashboardData = {
  kpis: { revenue: 12345, users: 678, orders: 90, conversion: '3.21%' },
  transactions: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    customer: `Acme ${i} Inc`,
    amount: 100 + i,
    status: 'paid',
    date: '2024-01-01',
  })),
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <DashboardPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  it('renders 4 KPIs and a 10-row transactions table', async () => {
    vi.mocked(apiClient.getDashboard).mockResolvedValue(sampleData);

    renderPage();

    await waitFor(() => expect(screen.getByText('12345')).toBeInTheDocument());
    expect(screen.getByText('678')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('3.21%')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11); // 1 header + 10 data rows
  });

  it('refresh triggers another getDashboard call', async () => {
    vi.mocked(apiClient.getDashboard).mockResolvedValue(sampleData);

    renderPage();
    await waitFor(() => expect(apiClient.getDashboard).toHaveBeenCalledTimes(1));

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => expect(apiClient.getDashboard).toHaveBeenCalledTimes(2));
  });

  it('logout calls postLogout and clears auth', async () => {
    vi.mocked(apiClient.getDashboard).mockResolvedValue(sampleData);

    renderPage();
    await waitFor(() => expect(screen.getByText('12345')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(apiClient.postLogout).toHaveBeenCalledTimes(1));
  });
});
