import { RequestHandler } from 'express';
import { DashboardService } from '../services/dashboardService';

export function createDashboardController(dashboardService: DashboardService) {
  const getDashboard: RequestHandler = (req, res) => {
    res.json(dashboardService.getDashboard());
  };

  return { getDashboard };
}
