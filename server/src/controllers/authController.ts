import { RequestHandler } from 'express';
import { AuthService } from '../services/authService';
import { attachSessionUser } from '../session/sessionUser';

export function createAuthController(authService: AuthService) {
  const login: RequestHandler = async (req, res) => {
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

    attachSessionUser(req, sessionUser);
    res.json({ ok: true, username: sessionUser.username });
  };

  const logout: RequestHandler = (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  };

  const me: RequestHandler = (req, res) => {
    if (req.session && req.session.user) {
      res.json({ username: req.session.user.username });
    } else {
      res.status(401).json({ error: 'not logged in' });
    }
  };

  return { login, logout, me };
}
