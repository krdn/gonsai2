/**
 * Request Logging Middleware
 *
 * @description HTTP 요청 로깅 미들웨어
 */

import morgan from 'morgan';
import { morganStream } from '../utils/logger';
import { envConfig } from '../utils/env-validator';

/**
 * Morgan 미들웨어 설정
 */
export const requestLogger = morgan(
  envConfig.NODE_ENV === 'production'
    ? 'combined' // Apache combined log format
    : 'dev',     // 개발 환경용 간결한 포맷
  {
    stream: morganStream,
    skip: (req) => {
      // 헬스체크 엔드포인트는 로깅 스킵
      return req.path === '/health' || req.path === '/';
    },
  }
);
