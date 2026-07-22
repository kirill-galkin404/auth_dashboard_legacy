import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import * as apiClient from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getMe: vi.fn(),
  };
});

function Probe() {
  const { username, status, setAuthenticated } = useAuth();
  return (
    <div>
      <span>{status}:{username ?? 'none'}</span>
      <button onClick={() => setAuthenticated('admin')}>Log in</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('does not let a late-resolving initial rehydration overwrite an explicit login that happened first', async () => {
    let resolveGetMe: (value: { username: string }) => void;
    vi.mocked(apiClient.getMe).mockReturnValue(
      new Promise((resolve) => {
        resolveGetMe = resolve;
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Initial getMe() is still pending ('loading'), then an explicit login
    // happens (e.g. the user submitted the login form) before it resolves.
    await waitFor(() => expect(screen.getByText('loading:none')).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(screen.getByText('authenticated:admin')).toBeInTheDocument());

    // The stale initial getMe() now resolves as if the user had never been
    // logged in (e.g. it was issued while unauthenticated). It must not
    // stomp the explicit authenticated state that was set afterwards.
    resolveGetMe!({ username: 'someone-else' });
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByText('authenticated:admin')).toBeInTheDocument();
  });
});
