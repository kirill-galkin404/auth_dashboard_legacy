import express, { Express } from 'express';
import path from 'path';
import { createConnection } from './db/connection';
import { UserRepository } from './repositories/userRepository';
import { AuthService } from './services/authService';
import { DashboardService } from './services/dashboardService';
import { createAuthRoutes } from './routes/authRoutes';
import { createDashboardRoutes } from './routes/dashboardRoutes';
import { createSessionMiddleware } from './config/session';

export interface CreateAppOptions {
  /** Override the sqlite db file (tests use an isolated path). */
  dbPath?: string;
  /** Override the static assets directory served at "/". */
  staticDir?: string;
  /** Override the directory the session store's sqlite file lives in. */
  sessionStoreDir?: string;
}

// Backend serves the frontend build directly: this catch-all points at the
// Vite + React build output in client/dist. See CONTRACT.md for the full
// static-serving decision.
export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  const db = createConnection(options.dbPath);
  const userRepository = new UserRepository(db);
  await userRepository.init();

  const authService = new AuthService(userRepository);
  const dashboardService = new DashboardService();

  const app = express();
  app.use(express.json());
  app.use(createSessionMiddleware({ storeDir: options.sessionStoreDir }));

  app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const staticDir = options.staticDir ?? path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(staticDir));

  app.use('/api', createAuthRoutes(authService));
  app.use('/api', createDashboardRoutes(dashboardService));

  // client-side routing fallback: serve the SPA shell for any non-API GET
  // that doesn't match a built static asset (e.g. a direct visit/refresh
  // on /dashboard or /login).
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  return app;
}
