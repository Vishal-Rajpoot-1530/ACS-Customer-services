import { Request, Response, Router } from 'express';
import { isDatabaseHealthy } from '../config/db.config';
import { HttpStatusCodes } from '../constants/httpStatusCodes.constant';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(HttpStatusCodes.OK).json({
    success: true,
    message: 'ACS Customer Service Centre API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const dbHealthy = await isDatabaseHealthy();

  if (!dbHealthy) {
    res.status(HttpStatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      message: 'Service unavailable: Database not connected',
      status: {
        database: 'disconnected',
      },
    });
    return;
  }

  res.status(HttpStatusCodes.OK).json({
    success: true,
    message: 'Service is ready to handle traffic',
    status: {
      database: 'connected',
    },
  });
});

export default router;
