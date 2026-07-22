import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import * as apiClient from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    getMe: vi.fn(),
  };
});

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login without ever mounting dashboard content when there is no session', async () => {
    vi.mocked(apiClient.getMe).mockRejectedValue(new apiClient.ApiError(401, 'not logged in'));

    renderApp();

    // Dashboard content must never appear, even transiently, while unauthenticated.
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument();
  });

  it('renders dashboard content when a valid session exists', async () => {
    vi.mocked(apiClient.getMe).mockResolvedValue({ username: 'admin' });

    renderApp();

    await waitFor(() => expect(screen.getByText('Dashboard content')).toBeInTheDocument());
  });
});
