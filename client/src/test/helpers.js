import { vi } from 'vitest';

export function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

export const DASHBOARD = {
  kpis: { revenue: 12345, users: 678, orders: 90, conversion: '3.21%' },
  transactions: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    customer: 'Customer' + (i + 1) + ' Inc',
    amount: 100 + i,
    status: i % 2 ? 'paid' : 'pending',
    date: '2024-01-' + String(i + 1).padStart(2, '0')
  }))
};

// routes: { 'METHOD /path': response | Error | () => response | Error }
export function mockFetch(routes) {
  const fn = vi.fn((url, options) => {
    const key = ((options && options.method) || 'GET') + ' ' + url;
    if (!(key in routes)) return Promise.reject(new Error('unmocked request: ' + key));
    const handler = routes[key];
    const value = typeof handler === 'function' ? handler() : handler;
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
  });
  globalThis.fetch = fn;
  return fn;
}

export function callsTo(fn, key) {
  return fn.mock.calls.filter(([url, options]) => ((options && options.method) || 'GET') + ' ' + url === key);
}
