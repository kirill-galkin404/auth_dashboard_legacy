import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from './LoginPage';
import * as apiClient from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getMe: vi.fn().mockRejectedValue(new actual.ApiError(401, 'not logged in')),
    postLogin: vi.fn(),
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('shows the 401-specific message on bad credentials', async () => {
    vi.mocked(apiClient.postLogin).mockRejectedValue(new apiClient.ApiError(401, 'bad credentials'));

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(screen.getByText('Invalid username or password')).toBeInTheDocument(),
    );
  });

  it('shows a distinct message on a network/5xx failure', async () => {
    vi.mocked(apiClient.postLogin).mockRejectedValue(new apiClient.ApiError(500, 'db error'));

    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again later.')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Invalid username or password')).not.toBeInTheDocument();
  });
});
