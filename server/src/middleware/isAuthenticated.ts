import { RequestHandler, Response } from 'express';
import { ErrorResponse } from '../types';

export const isAuthenticated: RequestHandler = (req, res: Response<ErrorResponse>, next) => {
  if (req.session && req.session.user) {
    next();
    return;
  }
  res.status(401).json({ error: 'not logged in' });
};
