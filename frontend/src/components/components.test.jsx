import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';
import Header from './Header.jsx';
import KpiCards from './KpiCards.jsx';
import TransactionsTable from './TransactionsTable.jsx';

const kpis = { revenue: 12345, users: 678, orders: 90, conversion: '3.45%' };
const transactions = [
  { id: 1, customer: 'Alice', amount: 100.5, status: 'paid', date: '2024-01-02' },
  { id: 2, customer: 'Bob', amount: 20, status: 'pending', date: '2024-01-03' },
];

describe('LoginForm', () => {
  it('renders the legacy structure and hint, no error by default', () => {
    const { container } = render(<LoginForm onSubmit={() => {}} />);
    expect(container.querySelector('.login-box')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(container.querySelector('p.hint')).toHaveTextContent('admin / admin123');
    expect(container.querySelector('.error')).toBeNull();
    expect(screen.getByPlaceholderText('Username')).toHaveAttribute('type', 'text');
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Username')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Log in' })).toHaveAttribute('type', 'submit');
  });

  it('shows the error only when non-empty', () => {
    const { container, rerender } = render(<LoginForm error="" onSubmit={() => {}} />);
    expect(container.querySelector('.error')).toBeNull();
    rerender(<LoginForm error="Invalid credentials" onSubmit={() => {}} />);
    expect(container.querySelector('p.error')).toHaveTextContent('Invalid credentials');
  });

  it('submits the typed values', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByPlaceholderText('Username'), 'admin');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(onSubmit).toHaveBeenCalledWith('admin', 'admin123');
  });
});

describe('Header', () => {
  it('shows username and wires buttons', async () => {
    const onRefresh = vi.fn();
    const onLogout = vi.fn();
    const { container } = render(<Header username="admin" onRefresh={onRefresh} onLogout={onLogout} />);
    expect(container.querySelector('header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(container.querySelector('header span')).toHaveTextContent('admin');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

describe('KpiCards', () => {
  it('renders four labelled KPIs with unformatted values', () => {
    const { container } = render(<KpiCards kpis={kpis} />);
    expect(container.querySelector('.kpis')).toBeInTheDocument();
    const blocks = container.querySelectorAll('.kpi');
    expect(blocks).toHaveLength(4);
    const labels = [...container.querySelectorAll('.kpi-label')].map((n) => n.textContent);
    expect(labels).toEqual(['Revenue', 'Users', 'Orders', 'Conversion']);
    const values = [...container.querySelectorAll('.kpi-value')].map((n) => n.textContent);
    expect(values).toEqual(['12345', '678', '90', '3.45%']);
  });
});

describe('TransactionsTable', () => {
  it('renders headers and one row per transaction as received', () => {
    const { container } = render(<TransactionsTable transactions={transactions} />);
    const table = container.querySelector('table.txns');
    expect(table).toBeInTheDocument();
    const headers = [...table.querySelectorAll('th')].map((n) => n.textContent);
    expect(headers).toEqual(['#', 'Customer', 'Amount', 'Status', 'Date']);
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    const cells = [...within(rows[0]).getAllByRole('cell')].map((n) => n.textContent);
    expect(cells).toEqual(['1', 'Alice', '100.5', 'paid', '2024-01-02']);
  });
});
