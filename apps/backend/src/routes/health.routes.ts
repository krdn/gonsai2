/**
 * Health Check Routes
 *
 * @description 서버 상태 확인 엔드포인트
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware';
import { healthCheckService } from '../services/health-check.service';

const router = Router();

/**
 * GET /health
 * 서버 헬스체크
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const result = await healthCheckService.checkAll();

    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(result);
  })
);

/**
 * GET /
 * Root endpoint
 */
router.get('/root', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'gonsai2 API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
