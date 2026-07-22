import { Request } from 'express';
import { SessionUser } from '../types';

/**
 * Regenerates the session (rotating its id, closing the session-fixation gap
 * on the anonymous -> authenticated transition) and then attaches the
 * authenticated user. This is the one place that writes to the session
 * object, so controllers only ever delegate to this helper instead of
 * mutating req.session directly.
 */
export function establishSession(req: Request, user: SessionUser): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        reject(regenerateErr);
        return;
      }
      req.session.user = user;
      req.session.save((saveErr) => {
        if (saveErr) reject(saveErr);
        else resolve();
      });
    });
  });
}
