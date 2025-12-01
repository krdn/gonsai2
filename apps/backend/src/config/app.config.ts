/**
 * 애플리케이션 설정
 *
 * 하드코딩된 값들을 중앙 집중화하여 관리
 */

import { envConfig } from '../utils/env-validator';

export const appConfig = {
  /**
   * 서버 설정
   */
  server: {
    /** Graceful shutdown 타임아웃 (ms) */
    gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '5000', 10),
    /** 요청 바디 크기 제한 */
    bodyLimit: process.env.BODY_LIMIT || '10mb',
  },

  /**
   * 캐시 TTL 설정 (초)
   */
  cache: {
    /** 워크플로우 목록 캐시 TTL */
    workflows: parseInt(process.env.CACHE_TTL_WORKFLOWS || '30', 10),
    /** 워크플로우 상세 캐시 TTL */
    workflowDetail: parseInt(process.env.CACHE_TTL_WORKFLOW_DETAIL || '60', 10),
    /** 실행 목록 캐시 TTL */
    executions: parseInt(process.env.CACHE_TTL_EXECUTIONS || '10', 10),
  },

  /**
   * Rate Limiting 설정
   */
  rateLimit: {
    /** 일반 요청 윈도우 (ms) */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15분
    /** 일반 요청 최대 횟수 */
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    /** 로그인 실패 윈도우 (ms) */
    authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15분
    /** 로그인 최대 실패 횟수 */
    authMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
  },

  /**
   * 보안 설정
   */
  security: {
    /** bcrypt salt rounds */
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    /** 비밀번호 재설정 토큰 만료 시간 (시간) */
    passwordResetTokenExpiryHours: parseInt(
      process.env.PASSWORD_RESET_TOKEN_EXPIRY_HOURS || '1',
      10
    ),
  },

  /**
   * 페이지네이션 기본값
   */
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_LIMIT || '100', 10),
  },

  /**
   * 로깅 설정
   */
  logging: {
    /** 로그 레벨 */
    level: process.env.LOG_LEVEL || (envConfig.NODE_ENV === 'production' ? 'info' : 'debug'),
    /** 요청 로깅 제외 경로 */
    excludePaths: ['/health', '/api/health', '/'],
  },
} as const;

// 타입 export
export type AppConfig = typeof appConfig;
