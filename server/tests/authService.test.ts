import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createConnection } from '../src/db/connection';
import { UserRepository } from '../src/repositories/userRepository';
import { AuthService } from '../src/services/authService';

describe('AuthService', () => {
  const dbPath = path.join(os.tmpdir(), `auth-service-test-${Date.now()}.sqlite`);
  let authService: AuthService;

  beforeAll(async () => {
    const db = createConnection(dbPath);
    const repository = new UserRepository(db);
    await repository.init();
    authService = new AuthService(repository);
  });

  afterAll(() => {
    fs.rmSync(dbPath, { force: true });
  });

  it('resolves a SessionUser for correct admin credentials', async () => {
    const sessionUser = await authService.login('admin', 'admin123');
    expect(sessionUser).toEqual({ id: expect.any(Number), username: 'admin' });
  });

  it('resolves null for a wrong password', async () => {
    const sessionUser = await authService.login('admin', 'wrong-password');
    expect(sessionUser).toBeNull();
  });

  it('resolves null for an unknown username', async () => {
    const sessionUser = await authService.login('nobody', 'admin123');
    expect(sessionUser).toBeNull();
  });
});
