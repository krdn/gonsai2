/**
 * Authentication Middleware
 *
 * @description JWT 인증 및 n8n API 인증/웹훅 검증
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';

/**
 * Request에 user 정보 추가를 위한 타입 확장
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * JWT 인증 미들웨어
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Authorization 헤더 또는 쿠키에서 토큰 추출
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid token',
      });
      return;
    }

    // 토큰 검증
    const payload = authService.verifyToken(token);

    // Request에 사용자 정보 추가
    req.userId = payload.userId;
    req.userEmail = payload.email;

    log.debug('JWT authenticated', { userId: payload.userId, path: req.path });
    next();
  } catch (error) {
    log.warn('JWT authentication failed', { error, path: req.path });
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: error instanceof Error ? error.message : 'Token verification failed',
    });
  }
}

/**
 * n8n API Key 검증 미들웨어
 */
export function authenticateN8nApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    log.warn('Missing API key in request', { path: req.path });
    res.status(401).json({
      success: false,
      error: 'Missing API key',
      message: 'Please provide X-API-Key header',
    });
    return;
  }

  if (apiKey !== envConfig.N8N_API_KEY) {
    log.warn('Invalid API key attempt', { path: req.path, ip: req.ip });
    res.status(403).json({
      success: false,
      error: 'Invalid API key',
      message: 'The provided API key is not valid',
    });
    return;
  }

  log.debug('API key authenticated', { path: req.path });
  next();
}

/**
 * n8n 웹훅 시그니처 검증 미들웨어
 */
export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  // n8n 웹훅 시크릿이 설정되지 않은 경우 스킵
  if (!envConfig.N8N_WEBHOOK_SECRET) {
    log.debug('Webhook signature verification skipped (no secret configured)');
    next();
    return;
  }

  const signature = req.headers['x-n8n-signature'] as string;

  if (!signature) {
    log.warn('Missing webhook signature', { path: req.path });
    res.status(401).json({
      success: false,
      error: 'Missing webhook signature',
      message: 'Please provide X-N8N-Signature header',
    });
    return;
  }

  // 실제 시그니처 검증은 n8n 문서에 따라 구현
  // 현재는 단순 비교 (프로덕션에서는 HMAC 검증 필요)
  if (signature !== envConfig.N8N_WEBHOOK_SECRET) {
    log.warn('Invalid webhook signature', { path: req.path, ip: req.ip });
    res.status(403).json({
      success: false,
      error: 'Invalid webhook signature',
      message: 'The provided signature is not valid',
    });
    return;
  }

  log.debug('Webhook signature verified', { path: req.path });
  next();
}

/**
 * Optional authentication (API 키가 있으면 검증, 없으면 통과)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (apiKey) {
    authenticateN8nApiKey(req, res, next);
  } else {
    next();
  }
}
