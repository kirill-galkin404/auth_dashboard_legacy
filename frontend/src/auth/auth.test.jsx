import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
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

import { ApiError, getMe, getDashboard } from '../api/client.js';
import { AuthProvider, useAuth, GENERIC_ERROR_MESSAGE } from './AuthContext.jsx';
import RequireAuth from './RequireAuth.jsx';

function Protected() {
  const { user } = useAuth();
  return <div data-testid="protected">secret for {user}</div>;
}

function renderGuard(initial = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Protected />
              </RequireAuth>
            }
          />
          <Route path="/elsewhere" element={<Link to="/dashboard">back to dashboard</Link>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('RequireAuth', () => {
  it('renders children only after /api/me succeeds', async () => {
    let resolveMe;
    getMe.mockReturnValue(new Promise((r) => (resolveMe = r)));
    renderGuard();

    expect(screen.queryByTestId('protected')).toBeNull();
    expect(screen.queryByText('login page')).toBeNull();

    await act(async () => resolveMe({ username: 'admin' }));
    expect(await screen.findByTestId('protected')).toHaveTextContent('secret for admin');
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['401', new ApiError('Not authenticated', 401)],
    ['500', new ApiError('Server error', 500)],
    ['network', new ApiError('Network error', 0)],
  ])('redirects to /login on a %s failure without any dashboard call', async (_name, err) => {
    getMe.mockRejectedValue(err);
    renderGuard();

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).toBeNull();
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it('re-checks /api/me on every mount, even when a user is already known', async () => {
    getMe.mockResolvedValue({ username: 'admin' });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Protected />
                  <Link to="/elsewhere">leave</Link>
                </RequireAuth>
              }
            />
            <Route path="/elsewhere" element={<Link to="/dashboard">back to dashboard</Link>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await screen.findByTestId('protected');
    expect(getMe).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText('leave'));
    await userEvent.click(await screen.findByText('back to dashboard'));
    await screen.findByTestId('protected');
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it('after the session ends, remounting the guarded route calls getMe again and redirects', async () => {
    getMe.mockResolvedValueOnce({ username: 'admin' }).mockRejectedValueOnce(new ApiError('Not authenticated', 401));
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Link to="/elsewhere">leave</Link>
                </RequireAuth>
              }
            />
            <Route path="/elsewhere" element={<Link to="/dashboard">back to dashboard</Link>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByText('leave'));
    await userEvent.click(await screen.findByText('back to dashboard'));

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(getMe).toHaveBeenCalledTimes(2);
    expect(getDashboard).not.toHaveBeenCalled();
  });

  it('clears the user when the check fails', async () => {
    getMe.mockResolvedValueOnce({ username: 'admin' }).mockRejectedValueOnce(new ApiError('x', 500));
    let seen;
    function Spy() {
      seen = useAuth();
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Spy />
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Link to="/elsewhere">leave</Link>
                </RequireAuth>
              }
            />
            <Route path="/elsewhere" element={<Link to="/dashboard">back</Link>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    await userEvent.click(await screen.findByText('leave'));
    expect(seen.user).toBe('admin');
    await userEvent.click(await screen.findByText('back'));
    await screen.findByText('login page');
    expect(seen.user).toBeNull();
  });
});

describe('AuthProvider.handleApiError', () => {
  function Harness({ err }) {
    const { user, setUser, error, clearError, handleApiError } = useAuth();
    return (
      <div>
        <span data-testid="user">{user ?? 'none'}</span>
        <span data-testid="error">{error}</span>
        <button onClick={() => setUser('admin')}>set user</button>
        <button onClick={() => handleApiError(err)}>handle</button>
        <button onClick={clearError}>clear</button>
      </div>
    );
  }

  function renderHarness(err) {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>login page</div>} />
            <Route path="/dashboard" element={<Harness err={err} />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  }

  it('401 navigates to /login and clears the user', async () => {
    renderHarness(new ApiError('Not authenticated', 401));
    await userEvent.click(screen.getByText('set user'));
    expect(screen.getByTestId('user')).toHaveTextContent('admin');
    await userEvent.click(screen.getByText('handle'));
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('any other status exposes a message, stays put, and the message can be cleared', async () => {
    renderHarness(new ApiError('Server error', 500));
    await userEvent.click(screen.getByText('set user'));
    await userEvent.click(screen.getByText('handle'));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent(GENERIC_ERROR_MESSAGE));
    expect(screen.queryByText('login page')).toBeNull();
    expect(screen.getByTestId('user')).toHaveTextContent('admin');

    await userEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('treats network errors (status 0) as a message, not a redirect', async () => {
    renderHarness(new ApiError('Network error', 0));
    await userEvent.click(screen.getByText('handle'));
    expect(screen.getByTestId('error')).toHaveTextContent(GENERIC_ERROR_MESSAGE);
    expect(screen.queryByText('login page')).toBeNull();
  });
});
