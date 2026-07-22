import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { createAuthRoutes } from '../src/routes/authRoutes';
import { AuthService } from '../src/services/authService';

function buildApp(authService: AuthService) {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
  app.use('/api', createAuthRoutes(authService));
  return app;
}

describe('authController error handling', () => {
  it('POST /api/login returns 500 { ok: false, error: "db error" } when the auth service throws', async () => {
    const brokenAuthService = {
      login: vi.fn().mockRejectedValue(new Error('simulated db failure')),
    } as unknown as AuthService;

    const app = buildApp(brokenAuthService);

    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'db error' });
  });
});
