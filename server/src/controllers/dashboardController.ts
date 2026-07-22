import { RequestHandler, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { DashboardResponse } from '../types';

export function createDashboardController(dashboardService: DashboardService) {
  const getDashboard: RequestHandler = (req, res: Response<DashboardResponse>) => {
    res.json(dashboardService.getDashboard());
  };

  return { getDashboard };
}
