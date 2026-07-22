import { Router } from 'express';
import { DashboardService } from '../services/dashboardService';
import { createDashboardController } from '../controllers/dashboardController';
import { isAuthenticated } from '../middleware/isAuthenticated';

export function createDashboardRoutes(dashboardService: DashboardService): Router {
  const router = Router();
  const controller = createDashboardController(dashboardService);

  router.get('/dashboard', isAuthenticated, controller.getDashboard);

  return router;
}
