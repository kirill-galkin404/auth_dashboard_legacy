import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createConnection } from '../src/db/connection';
import { UserRepository } from '../src/repositories/userRepository';

describe('UserRepository', () => {
  const dbPath = path.join(os.tmpdir(), `user-repo-test-${Date.now()}.sqlite`);
  let repository: UserRepository;

  beforeAll(async () => {
    const db = createConnection(dbPath);
    repository = new UserRepository(db);
    await repository.init();
  });

  afterAll(() => {
    fs.rmSync(dbPath, { force: true });
  });

  it('resolves the seeded admin user by username', async () => {
    const user = await repository.findByUsername('admin');
    expect(user).toBeDefined();
    expect(user?.username).toBe('admin');
  });

  it('stores the seeded password as a bcrypt hash, not plain text', async () => {
    const user = await repository.findByUsername('admin');
    expect(user?.password).toMatch(/^\$2[aby]\$/);
    expect(user?.password).not.toBe('admin123');
  });

  it('treats an injection-shaped username as a literal string (parameterized query)', async () => {
    const user = await repository.findByUsername("' OR '1'='1");
    expect(user).toBeUndefined();
  });

  it('resolves undefined for an unknown username', async () => {
    const user = await repository.findByUsername('nobody');
    expect(user).toBeUndefined();
  });
});
