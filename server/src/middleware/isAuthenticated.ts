import { RequestHandler } from 'express';

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
    return;
  }
  res.status(401).json({ error: 'not logged in' });
};
