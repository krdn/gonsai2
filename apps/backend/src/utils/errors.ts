/**
 * Custom Error Classes
 *
 * @description 도메인별 에러 클래스 및 에러 코드 정의
 */

/**
 * 에러 코드 정의
 */
export enum ErrorCode {
  // 인증 관련
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // 권한 관련
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 리소스 관련
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // 유효성 검증
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // 외부 서비스
  N8N_API_ERROR = 'N8N_API_ERROR',
  N8N_WORKFLOW_EXECUTION_FAILED = 'N8N_WORKFLOW_EXECUTION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 내부 에러
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

/**
 * 기본 에러 클래스
 */
export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    isOperational = true,
    metadata?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.metadata = metadata;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.constructor.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}

/**
 * 인증 관련 에러
 */
export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication failed',
    code = ErrorCode.AUTHENTICATION_FAILED,
    metadata?: Record<string, unknown>
  ) {
    super(message, 401, code, true, metadata);
  }
}

/**
 * 권한 관련 에러
 */
export class AuthorizationError extends AppError {
  constructor(
    message = 'Forbidden',
    code = ErrorCode.FORBIDDEN,
    metadata?: Record<string, unknown>
  ) {
    super(message, 403, code, true, metadata);
  }
}

/**
 * 리소스 관련 에러
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, metadata?: Record<string, unknown>) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, ErrorCode.RESOURCE_NOT_FOUND, true, metadata);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 409, ErrorCode.RESOURCE_ALREADY_EXISTS, true, metadata);
  }
}

/**
 * 유효성 검증 에러
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    errors?: Array<{ field: string; message: string }>,
    metadata?: Record<string, unknown>
  ) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, {
      ...metadata,
      validationErrors: errors,
    });
  }
}

/**
 * 외부 서비스 에러
 */
export class N8nApiError extends AppError {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super(message, 502, ErrorCode.N8N_API_ERROR, true, metadata);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error, metadata?: Record<string, unknown>) {
    super(message, 500, ErrorCode.DATABASE_ERROR, false, {
      ...metadata,
      originalError: originalError?.message,
    });
  }
}

export class RedisError extends AppError {
  constructor(message: string, originalError?: Error, metadata?: Record<string, unknown>) {
    super(message, 500, ErrorCode.REDIS_ERROR, false, {
      ...metadata,
      originalError: originalError?.message,
    });
  }
}

/**
 * Rate Limiting 에러
 */
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', metadata?: Record<string, unknown>) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, true, metadata);
  }
}

/**
 * 내부 서버 에러
 */
export class InternalServerError extends AppError {
  constructor(
    message = 'Internal server error',
    originalError?: Error,
    metadata?: Record<string, unknown>
  ) {
    super(message, 500, ErrorCode.INTERNAL_SERVER_ERROR, false, {
      ...metadata,
      originalError: originalError?.message,
    });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, metadata?: Record<string, unknown>) {
    super(
      `Service '${service}' is currently unavailable`,
      503,
      ErrorCode.SERVICE_UNAVAILABLE,
      true,
      metadata
    );
  }
}

/**
 * 에러 타입 가드
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
