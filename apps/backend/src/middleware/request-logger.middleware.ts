/**
 * Request Logging Middleware
 *
 * @description HTTP 요청 로깅 미들웨어
 */

import morgan from 'morgan';
import { morganStream } from '../utils/logger';
import { RequestWithCorrelationId } from './correlation-id.middleware';

/**
 * Morgan 미들웨어 설정
 */
export const requestLogger = morgan(
  (tokens, req, res) => {
    const correlationId = (req as RequestWithCorrelationId).correlationId || 'unknown';

    return [
      correlationId,
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'),
      '-',
      tokens['response-time'](req, res),
      'ms',
    ].join(' ');
  },
  {
    stream: morganStream,
    skip: (req) => {
      // 헬스체크 엔드포인트는 로깅 스킵
      return req.url === '/health' || req.url === '/';
    },
  }
);
