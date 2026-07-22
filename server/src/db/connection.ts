import sqlite3 from 'sqlite3';
import path from 'path';

export type Database = sqlite3.Database;

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data.sqlite');

export function createConnection(dbPath: string = DEFAULT_DB_PATH): Database {
  return new sqlite3.Database(dbPath);
}
