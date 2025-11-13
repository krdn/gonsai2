/**
 * Correlation ID Middleware
 *
 * @description 요청 추적을 위한 상관관계 ID 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * 상관관계 ID 헤더 이름
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

/**
 * 상관관계 ID 미들웨어
 *
 * 각 요청에 고유한 상관관계 ID를 할당하여 로그 추적을 용이하게 함
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 클라이언트에서 제공한 ID가 있으면 사용, 없으면 생성
  const correlationId = (req.get(CORRELATION_ID_HEADER) || randomUUID()) as string;

  // 요청 객체에 추가
  (req as any).correlationId = correlationId;

  // 응답 헤더에 추가
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  next();
}

/**
 * 요청에서 상관관계 ID 추출
 */
export function getCorrelationId(req: Request): string {
  return (req as any).correlationId || 'unknown';
}
