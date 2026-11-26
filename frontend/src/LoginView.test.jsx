import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginView from './LoginView.jsx';
import * as api from './api.js';

vi.mock('./api.js');

function renderView() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/dashboard" element={<div>dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('LoginView', () => {
  it('renders the static markup', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toHaveFocus();
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText('admin / admin123')).toBeInTheDocument();
    expect(screen.queryByText('Invalid username or password')).not.toBeInTheDocument();
  });

  it('logs in with typed credentials and navigates to /dashboard', async () => {
    api.login.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(api.login).toHaveBeenCalledWith('admin', 'admin123');
    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
  });

  it('shows the error and stays on /login when login is rejected', async () => {
    api.login.mockRejectedValue(new Error('Request failed with status 401'));
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
