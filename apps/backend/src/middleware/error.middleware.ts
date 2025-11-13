/**
 * Error Handling Middleware
 *
 * @description 전역 에러 핸들러 및 에러 응답 표준화
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';
import { envConfig } from '../utils/env-validator';

/**
 * 에러 응답 인터페이스
 */
import { ErrorCode, isAppError, NotFoundError } from '../utils/errors';

export interface ErrorResponse {
  success: false;
  error: ErrorCode | string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  correlationId?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 404 Not Found 핸들러
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError('Route', `${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
  });
  next(error);
}

/**
 * 전역 에러 핸들러
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // AppError 타입 체크
  const isAppErr = isAppError(err);
  const statusCode = isAppErr ? err.statusCode : 500;
  const errorCode = isAppErr ? err.code : ErrorCode.INTERNAL_SERVER_ERROR;
  const isOperational = isAppErr ? err.isOperational : false;
  const message = err.message || 'Internal Server Error';

  // 상관관계 ID 추출 (요청 추적용)
  const correlationId = (req as any).correlationId || 'unknown';

  // 에러 로깅
  const errorContext = {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(isAppErr && err.metadata),
  };

  if (!isOperational || statusCode >= 500) {
    log.error('Server error occurred', err, errorContext);
  } else {
    log.warn('Client error occurred', {
      message,
      statusCode,
      errorCode,
      ...errorContext,
    });
  }

  // 에러 응답
  const errorResponse: ErrorResponse = {
    success: false,
    error: errorCode,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    correlationId,
  };

  // 개발 환경에서만 스택 트레이스 포함
  if (envConfig.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    if (isAppErr && err.metadata) {
      errorResponse.metadata = err.metadata;
    }
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async 핸들러 래퍼 (try-catch 자동 처리)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
