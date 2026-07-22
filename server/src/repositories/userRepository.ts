import bcrypt from 'bcrypt';
import { Database } from '../db/connection';
import { User } from '../types';

const SALT_ROUNDS = 10;
const SEED_USERNAME = 'admin';
const SEED_PASSWORD = 'admin123';

export class UserRepository {
  constructor(private readonly db: Database) {}

  /**
   * Creates the users table if missing and seeds the default admin user
   * (bcrypt-hashed, never plain text) when the table is empty.
   */
  async init(): Promise<void> {
    await this.run(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)'
    );
    const row = await this.get<{ c: number }>('SELECT COUNT(*) AS c FROM users');
    if (row && row.c === 0) {
      const hash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
      await this.run('INSERT INTO users (username, password) VALUES (?, ?)', [
        SEED_USERNAME,
        hash,
      ]);
    }
  }

  findByUsername(username: string): Promise<User | undefined> {
    return this.get<User>('SELECT * FROM users WHERE username = ?', [username]);
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T | undefined);
      });
    });
  }
}
