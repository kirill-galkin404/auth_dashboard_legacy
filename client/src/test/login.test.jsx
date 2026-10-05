import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import App from '../App.jsx';
import { DASHBOARD, callsTo, jsonResponse, mockFetch } from './helpers.js';

async function submitCredentials() {
  const user = userEvent.setup();
  await user.type(screen.getByPlaceholderText('Username'), 'tester');
  await user.type(screen.getByPlaceholderText('Password'), 'not-a-real-pass');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
}

describe('login page', () => {
  beforeEach(() => {
    window.location.hash = '#/login';
  });

  test('posts the credentials and goes to the dashboard on success', async () => {
    const fetchMock = mockFetch({
      'POST /api/login': jsonResponse(200, { ok: true, username: 'tester' }),
      'GET /api/me': jsonResponse(200, { username: 'tester' }),
      'GET /api/dashboard': jsonResponse(200, DASHBOARD)
    });
    render(<App />);
    await submitCredentials();

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/dashboard');
    const [, options] = callsTo(fetchMock, 'POST /api/login')[0];
    expect(JSON.parse(options.body)).toEqual({ username: 'tester', password: 'not-a-real-pass' });
    expect(options.credentials).toBe('same-origin');
  });

  test('shows the generic message when the server answers 401', async () => {
    mockFetch({ 'POST /api/login': jsonResponse(401, { ok: false, error: 'bad credentials' }) });
    render(<App />);
    await submitCredentials();

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login');
  });

  test('shows the same generic message when the request fails', async () => {
    mockFetch({ 'POST /api/login': new TypeError('network down') });
    render(<App />);
    await submitCredentials();

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  test('does not render a credential hint', () => {
    mockFetch({});
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    expect(document.querySelector('.hint')).toBeNull();
  });
});
