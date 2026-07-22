import { Router } from 'express';
import { AuthService } from '../services/authService';
import { createAuthController } from '../controllers/authController';

export function createAuthRoutes(authService: AuthService): Router {
  const router = Router();
  const controller = createAuthController(authService);

  router.post('/login', controller.login);
  router.post('/logout', controller.logout);
  router.get('/me', controller.me);

  return router;
}
