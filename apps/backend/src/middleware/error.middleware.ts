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
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  stack?: string;
}

/**
 * 커스텀 에러 클래스
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found 핸들러
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new AppError(
    404,
    `Cannot ${req.method} ${req.path}`
  );
  next(error);
}

/**
 * 전역 에러 핸들러
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 기본 에러 정보
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  // 에러 로깅
  if (statusCode >= 500) {
    log.error('Server error occurred', err, {
      method: req.method,
      path: req.path,
      body: req.body,
      query: req.query,
      ip: req.ip,
    });
  } else {
    log.warn('Client error occurred', {
      message,
      statusCode,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  }

  // 에러 응답
  const errorResponse: ErrorResponse = {
    success: false,
    error: getErrorName(statusCode),
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  // 개발 환경에서만 스택 트레이스 포함
  if (envConfig.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * HTTP 상태 코드에 따른 에러 이름 반환
 */
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[statusCode] || 'Error';
}

/**
 * Async 핸들러 래퍼 (try-catch 자동 처리)
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
