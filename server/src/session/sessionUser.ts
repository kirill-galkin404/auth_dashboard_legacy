import { Request } from 'express';
import { SessionUser } from '../types';

/**
 * The one place that writes to the session object, so controllers only ever
 * delegate to this helper instead of mutating req.session directly.
 */
export function attachSessionUser(req: Request, user: SessionUser): void {
  req.session.user = user;
}
