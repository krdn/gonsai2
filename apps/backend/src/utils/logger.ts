/**
 * Logger Configuration
 *
 * @description Winston 기반 구조화된 로깅 시스템
 */

import winston from 'winston';
import { envConfig } from './env-validator';

/**
 * 커스텀 로그 포맷
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 메타데이터 추가
    if (Object.keys(metadata).length > 0) {
      log += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    // 스택 트레이스 추가
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

/**
 * 개발 환경용 컬러 포맷
 */
const developmentFormat = winston.format.combine(winston.format.colorize(), customFormat);

/**
 * 프로덕션 환경용 JSON 포맷
 */
const productionFormat = winston.format.combine(winston.format.json());

/**
 * Winston Logger 인스턴스
 */
export const logger = winston.createLogger({
  level: envConfig.LOG_LEVEL,
  format: envConfig.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: {
    service: 'gonsai2-backend',
    environment: envConfig.NODE_ENV,
  },
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),

    // 에러 로그 파일 (로테이션)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),

    // 모든 로그 파일 (로테이션)
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),

    // Warning 이상 로그 별도 파일
    new winston.transports.File({
      filename: 'logs/warn.log',
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

/**
 * HTTP 요청 로깅용 Morgan 스트림
 */
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * 타입 안전한 로깅 헬퍼
 */
export const log = {
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(message, meta);
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(message, meta);
  },

  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    if (error instanceof Error) {
      logger.error(message, { ...meta, error: error.message, stack: error.stack });
    } else {
      logger.error(message, { ...meta, error });
    }
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(message, meta);
  },
};
