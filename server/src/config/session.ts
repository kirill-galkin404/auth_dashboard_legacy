import session, { SessionOptions } from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import sqlite3 from 'sqlite3';
import path from 'path';
import { RequestHandler } from 'express';

export interface SessionConfigOptions {
  storeDir?: string;
}

/**
 * Builds the session middleware. Throws (rather than exiting directly) so the
 * caller controls the process lifecycle; server.ts turns this into a
 * non-zero exit before app.listen() is reached.
 */
export function createSessionMiddleware(options: SessionConfigOptions = {}): RequestHandler {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable must be set');
  }

  const SQLiteStore = connectSqlite3(session);
  const storeDir = options.storeDir ?? path.join(__dirname, '..', '..');
  // connect-sqlite3 0.9.x needs an already-open sqlite3 connection, not a
  // filename (its own README documents this despite the older @types shape).
  const storeDb = new sqlite3.Database(path.join(storeDir, 'sessions.sqlite'));

  const sessionOptions: SessionOptions = {
    secret,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: storeDb as never }) as unknown as session.Store,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  };

  return session(sessionOptions);
}
