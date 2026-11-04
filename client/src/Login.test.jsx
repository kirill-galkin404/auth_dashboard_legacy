import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from './Login.jsx';
import * as api from './api.js';

vi.mock('./api.js', () => ({ login: vi.fn() }));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<div>dashboard-marker</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function submit(user) {
  await user.type(screen.getByPlaceholderText('Username'), 'admin');
  await user.type(screen.getByPlaceholderText('Password'), 'secret');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('Login', () => {
  beforeEach(() => {
    api.login.mockReset();
  });

  it('shows no error initially and always shows the hint', () => {
    const { container } = renderLogin();
    expect(container.querySelector('p.error')).toBeNull();
    expect(container.querySelector('p.hint')).toHaveTextContent('admin / admin123');
  });

  it('calls api.login with entered values and navigates to /dashboard on success', async () => {
    api.login.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderLogin();
    await submit(user);
    expect(api.login).toHaveBeenCalledWith('admin', 'secret');
    expect(await screen.findByText('dashboard-marker')).toBeInTheDocument();
  });

  it('shows the error on 401 and stays on login', async () => {
    api.login.mockRejectedValue(Object.assign(new Error('Unauthorized'), { status: 401 }));
    const user = userEvent.setup();
    const { container } = renderLogin();
    await submit(user);
    const err = await screen.findByText('Invalid username or password');
    expect(err).toBe(container.querySelector('p.error'));
    expect(screen.queryByText('dashboard-marker')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  it.each([
    ['network TypeError', new TypeError('Failed to fetch')],
    ['500 error', Object.assign(new Error('Server Error'), { status: 500 })],
  ])('shows the same generic error on %s', async (_name, rejection) => {
    api.login.mockRejectedValue(rejection);
    const user = userEvent.setup();
    const { container } = renderLogin();
    await submit(user);
    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(container.querySelector('p.error')).not.toBeNull();
    expect(screen.queryByText('dashboard-marker')).toBeNull();
    expect(container.querySelector('p.hint')).toBeInTheDocument();
  });
});
