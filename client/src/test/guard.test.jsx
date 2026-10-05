import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import App from '../App.jsx';
import { DASHBOARD, callsTo, jsonResponse, mockFetch } from './helpers.js';

describe('session guard', () => {
  test('shows the dashboard when /api/me succeeds, checking me before loading data', async () => {
    window.location.hash = '#/dashboard';
    const fetchMock = mockFetch({
      'GET /api/me': jsonResponse(200, { username: 'tester' }),
      'GET /api/dashboard': jsonResponse(200, DASHBOARD)
    });
    render(<App />);

    expect(await screen.findByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('tester')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual(['/api/me', '/api/dashboard']);
  });

  test('redirects to login on 401 and never requests dashboard data', async () => {
    window.location.hash = '#/dashboard';
    const fetchMock = mockFetch({ 'GET /api/me': jsonResponse(401, { error: 'not logged in' }) });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/login');
    expect(callsTo(fetchMock, 'GET /api/dashboard')).toHaveLength(0);
  });

  test('shows an error instead of redirecting on a 5xx', async () => {
    window.location.hash = '#/dashboard';
    const fetchMock = mockFetch({ 'GET /api/me': jsonResponse(500, { error: 'boom' }) });
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify your session');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/dashboard');
    expect(callsTo(fetchMock, 'GET /api/dashboard')).toHaveLength(0);
  });

  test('shows an error instead of redirecting on a network failure', async () => {
    window.location.hash = '#/dashboard';
    const fetchMock = mockFetch({ 'GET /api/me': new TypeError('network down') });
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify your session');
    expect(window.location.hash).toBe('#/dashboard');
    expect(callsTo(fetchMock, 'GET /api/dashboard')).toHaveLength(0);
  });

  test.each(['#/nowhere', '#/dashboard/extra', '#/', ''])('unknown route %j lands on the login screen', async (hash) => {
    window.location.hash = hash;
    mockFetch({});
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe('#/login'));
  });
});
