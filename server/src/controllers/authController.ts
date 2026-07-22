import { RequestHandler, Response } from 'express';
import { AuthService } from '../services/authService';
import { establishSession } from '../session/sessionUser';
import { ErrorResponse, LoginResponse, LogoutResponse, MeResponse } from '../types';

export function createAuthController(authService: AuthService) {
  const login: RequestHandler = async (req, res: Response<LoginResponse | ErrorResponse>) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(401).json({ ok: false, error: 'bad credentials' });
      return;
    }

    let sessionUser;
    try {
      sessionUser = await authService.login(username, password);
    } catch (err) {
      res.status(500).json({ ok: false, error: 'db error' });
      return;
    }

    if (!sessionUser) {
      res.status(401).json({ ok: false, error: 'bad credentials' });
      return;
    }

    try {
      await establishSession(req, sessionUser);
    } catch (err) {
      res.status(500).json({ ok: false, error: 'db error' });
      return;
    }

    res.json({ ok: true, username: sessionUser.username });
  };

  const logout: RequestHandler = (req, res: Response<LogoutResponse>) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  };

  const me: RequestHandler = (req, res: Response<MeResponse | ErrorResponse>) => {
    if (req.session && req.session.user) {
      res.json({ username: req.session.user.username });
    } else {
      res.status(401).json({ error: 'not logged in' });
    }
  };

  return { login, logout, me };
}
