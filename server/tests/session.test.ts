import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('createSessionMiddleware', () => {
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = originalSecret;
    }
  });

  it('throws when SESSION_SECRET is not set, so the server never opens the port', async () => {
    const { createSessionMiddleware } = await import('../src/config/session');
    expect(() => createSessionMiddleware()).toThrow(/SESSION_SECRET/);
  });
});
