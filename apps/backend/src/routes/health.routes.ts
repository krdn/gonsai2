/**
 * Health Check Routes
 *
 * @description 서버 상태 확인 엔드포인트
 */

import { Router, Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import { HealthCheckResponse } from '../types/api.types';
import { asyncHandler } from '../middleware';

const router = Router();

/**
 * GET /health
 * 서버 헬스체크
 */
router.get('/', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const startTime = process.hrtime();

  // MongoDB 연결 확인
  let mongoStatus: 'connected' | 'disconnected' = 'disconnected';
  try {
    const client = new MongoClient(envConfig.MONGODB_URI);
    await client.connect();
    await client.db().admin().ping();
    await client.close();
    mongoStatus = 'connected';
  } catch (error) {
    log.error('MongoDB health check failed', error);
  }

  // n8n 연결 확인
  let n8nStatus: 'reachable' | 'unreachable' = 'unreachable';
  try {
    const response = await fetch(`${envConfig.N8N_BASE_URL}/healthz`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': envConfig.N8N_API_KEY,
      },
    });
    if (response.ok) {
      n8nStatus = 'reachable';
    }
  } catch (error) {
    log.error('n8n health check failed', error);
  }

  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = seconds * 1000 + nanoseconds / 1000000;

  const response: HealthCheckResponse = {
    status: mongoStatus === 'connected' && n8nStatus === 'reachable' ? 'healthy' : 'unhealthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      n8n: n8nStatus,
    },
  };

  log.debug('Health check completed', { duration: `${duration.toFixed(2)}ms`, ...response });

  res.status(response.status === 'healthy' ? 200 : 503).json(response);
}));

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
