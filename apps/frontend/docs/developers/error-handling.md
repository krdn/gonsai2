# Error Handling Patterns

효과적인 에러 처리는 안정적인 애플리케이션의 핵심입니다. 이 문서에서는 프로젝트 전반에 걸쳐 사용되는 에러 처리 패턴과 모범 사례를 다룹니다.

## 목차

- [에러 타입 계층구조](#에러-타입-계층구조)
- [ApiError 클래스](#apierror-클래스)
- [에러 처리 전략](#에러-처리-전략)
- [React 컴포넌트 에러 처리](#react-컴포넌트-에러-처리)
- [API Route 에러 처리](#api-route-에러-처리)
- [에러 바운더리](#에러-바운더리)
- [Toast 알림](#toast-알림)
- [로깅 및 모니터링](#로깅-및-모니터링)
- [재시도 로직](#재시도-로직)
- [사용자 친화적 에러 메시지](#사용자-친화적-에러-메시지)

---

## 에러 타입 계층구조

### 기본 에러 클래스

```typescript
// lib/errors/base.ts
export class BaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}
```

### 특화된 에러 클래스

```typescript
// lib/errors/types.ts

// API 관련 에러
export class ApiError extends BaseError {
  constructor(
    code: string,
    message: string,
    details?: any,
    statusCode: number = 500
  ) {
    super(message, code, statusCode, details);
  }
}

// 인증 에러
export class AuthenticationError extends BaseError {
  constructor(message: string = '인증이 필요합니다.', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

// 인가 에러
export class AuthorizationError extends BaseError {
  constructor(message: string = '권한이 없습니다.', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

// 유효성 검사 에러
export class ValidationError extends BaseError {
  constructor(message: string, errors: any[]) {
    super(message, 'VALIDATION_ERROR', 400, { errors });
  }
}

// 리소스 없음 에러
export class NotFoundError extends BaseError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource}(ID: ${id})를 찾을 수 없습니다.`
      : `${resource}를 찾을 수 없습니다.`;

    super(message, 'NOT_FOUND', 404, { resource, id });
  }
}

// Rate Limit 에러
export class RateLimitError extends BaseError {
  constructor(resetAt: Date) {
    super(
      '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
      'RATE_LIMIT_EXCEEDED',
      429,
      { resetAt }
    );
  }
}

// 타임아웃 에러
export class TimeoutError extends BaseError {
  constructor(operation: string, timeout: number) {
    super(
      `작업 시간이 초과되었습니다: ${operation}`,
      'TIMEOUT_ERROR',
      408,
      { operation, timeout }
    );
  }
}

// 네트워크 에러
export class NetworkError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', 502, details);
  }
}

// n8n 연결 에러
export class N8nConnectionError extends NetworkError {
  constructor(details?: any) {
    super('n8n 서버에 연결할 수 없습니다.', details);
    this.code = 'N8N_CONNECTION_ERROR';
  }
}

// 데이터베이스 에러
export class DatabaseError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}
```

### 에러 팩토리

```typescript
// lib/errors/factory.ts
export class ErrorFactory {
  static fromHttpResponse(response: Response, body?: any): BaseError {
    const status = response.status;

    switch (status) {
      case 400:
        return new ValidationError(
          body?.error?.message || '잘못된 요청입니다.',
          body?.error?.details || []
        );

      case 401:
        return new AuthenticationError(body?.error?.message);

      case 403:
        return new AuthorizationError(body?.error?.message);

      case 404:
        return new NotFoundError(
          body?.error?.resource || 'Resource',
          body?.error?.id
        );

      case 408:
        return new TimeoutError(
          body?.error?.operation || 'Request',
          body?.error?.timeout || 30000
        );

      case 429:
        return new RateLimitError(
          new Date(body?.error?.resetAt || Date.now() + 60000)
        );

      case 502:
      case 503:
      case 504:
        return new NetworkError(
          body?.error?.message || '서버에 일시적인 문제가 발생했습니다.',
          body?.error?.details
        );

      default:
        return new ApiError(
          body?.error?.code || 'UNKNOWN_ERROR',
          body?.error?.message || '알 수 없는 오류가 발생했습니다.',
          body?.error?.details,
          status
        );
    }
  }

  static fromError(error: any): BaseError {
    if (error instanceof BaseError) {
      return error;
    }

    if (error.code === 'ECONNREFUSED') {
      return new N8nConnectionError({ originalError: error.message });
    }

    if (error.code === 'ETIMEDOUT') {
      return new TimeoutError('Network request', 30000);
    }

    if (error.name === 'AbortError') {
      return new TimeoutError('Request', 30000);
    }

    return new ApiError(
      'INTERNAL_ERROR',
      error.message || '내부 오류가 발생했습니다.',
      { originalError: error }
    );
  }
}
```

---

## ApiError 클래스

### 기본 구조

```typescript
// lib/n8n/errors.ts
export class ApiError extends BaseError {
  constructor(
    code: string,
    message: string,
    details?: any,
    statusCode: number = 500
  ) {
    super(message, code, statusCode, details);
  }

  // HTTP 응답으로 변환
  toResponse(): Response {
    return new Response(
      JSON.stringify({
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
        },
      }),
      {
        status: this.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // 사용자 친화적 메시지
  getUserMessage(): string {
    const userMessages: Record<string, string> = {
      WORKFLOW_NOT_FOUND: '워크플로우를 찾을 수 없습니다.',
      EXECUTION_FAILED: '워크플로우 실행에 실패했습니다.',
      UNAUTHORIZED: '로그인이 필요합니다.',
      FORBIDDEN: '권한이 없습니다.',
      RATE_LIMIT_EXCEEDED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      VALIDATION_ERROR: '입력값을 확인해주세요.',
      N8N_CONNECTION_ERROR: 'n8n 서버에 연결할 수 없습니다.',
      TIMEOUT_ERROR: '요청 시간이 초과되었습니다.',
      NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
    };

    return userMessages[this.code] || this.message;
  }

  // 재시도 가능 여부
  isRetryable(): boolean {
    const retryableCodes = [
      'TIMEOUT_ERROR',
      'NETWORK_ERROR',
      'N8N_CONNECTION_ERROR',
      'RATE_LIMIT_EXCEEDED',
    ];

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return (
      retryableCodes.includes(this.code) ||
      retryableStatusCodes.includes(this.statusCode)
    );
  }
}
```

---

## 에러 처리 전략

### 1. Try-Catch 패턴

```typescript
// lib/n8n/service.ts
export class WorkflowService {
  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const workflow = await n8nClient.getWorkflow(id);
      return workflow;
    } catch (error) {
      // 에러 변환
      const apiError = ErrorFactory.fromError(error);

      // 로깅
      logger.error('Failed to fetch workflow', {
        workflowId: id,
        error: apiError.toJSON(),
      });

      // 재시도 가능한 에러면 재시도
      if (apiError.isRetryable()) {
        return this.retryGetWorkflow(id);
      }

      // 에러 전파
      throw apiError;
    }
  }

  private async retryGetWorkflow(
    id: string,
    attempt: number = 1
  ): Promise<Workflow> {
    const maxRetries = 3;

    if (attempt > maxRetries) {
      throw new ApiError(
        'MAX_RETRIES_EXCEEDED',
        '최대 재시도 횟수를 초과했습니다.',
        { workflowId: id, attempts: attempt }
      );
    }

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    await sleep(delay);

    try {
      return await n8nClient.getWorkflow(id);
    } catch (error) {
      const apiError = ErrorFactory.fromError(error);

      if (apiError.isRetryable()) {
        return this.retryGetWorkflow(id, attempt + 1);
      }

      throw apiError;
    }
  }
}
```

### 2. Result 패턴 (함수형)

```typescript
// lib/utils/result.ts
export type Result<T, E = BaseError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E extends BaseError>(error: E): Result<never, E> {
  return { ok: false, error };
}

// 사용 예시
export async function getWorkflowResult(
  id: string
): Promise<Result<Workflow, ApiError>> {
  try {
    const workflow = await n8nClient.getWorkflow(id);
    return Ok(workflow);
  } catch (error) {
    const apiError = ErrorFactory.fromError(error);
    return Err(apiError);
  }
}

// 호출부
const result = await getWorkflowResult('workflow-id');

if (result.ok) {
  console.log('Workflow:', result.value);
} else {
  console.error('Error:', result.error.getUserMessage());
}
```

### 3. Either 패턴 (함수형)

```typescript
// lib/utils/either.ts
export class Either<L, R> {
  private constructor(
    private readonly value: L | R,
    private readonly isRight: boolean
  ) {}

  static left<L, R>(value: L): Either<L, R> {
    return new Either<L, R>(value, false);
  }

  static right<L, R>(value: R): Either<L, R> {
    return new Either<L, R>(value, true);
  }

  map<T>(fn: (value: R) => T): Either<L, T> {
    if (this.isRight) {
      return Either.right(fn(this.value as R));
    }

    return Either.left(this.value as L);
  }

  mapLeft<T>(fn: (value: L) => T): Either<T, R> {
    if (!this.isRight) {
      return Either.left(fn(this.value as L));
    }

    return Either.right(this.value as R);
  }

  flatMap<T>(fn: (value: R) => Either<L, T>): Either<L, T> {
    if (this.isRight) {
      return fn(this.value as R);
    }

    return Either.left(this.value as L);
  }

  fold<T>(leftFn: (left: L) => T, rightFn: (right: R) => T): T {
    if (this.isRight) {
      return rightFn(this.value as R);
    }

    return leftFn(this.value as L);
  }

  getOrElse(defaultValue: R): R {
    if (this.isRight) {
      return this.value as R;
    }

    return defaultValue;
  }

  isLeft(): boolean {
    return !this.isRight;
  }

  isRightValue(): boolean {
    return this.isRight;
  }
}

// 사용 예시
export async function getWorkflowEither(
  id: string
): Promise<Either<ApiError, Workflow>> {
  try {
    const workflow = await n8nClient.getWorkflow(id);
    return Either.right(workflow);
  } catch (error) {
    const apiError = ErrorFactory.fromError(error);
    return Either.left(apiError);
  }
}

// 호출부
const result = await getWorkflowEither('workflow-id');

const message = result.fold(
  (error) => `Error: ${error.getUserMessage()}`,
  (workflow) => `Success: ${workflow.name}`
);

console.log(message);
```

---

## React 컴포넌트 에러 처리

### React Query와 함께 사용

```typescript
// hooks/useWorkflow.ts
import { useQuery } from '@tanstack/react-query';
import { ErrorFactory } from '@/lib/errors/factory';

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      try {
        return await n8nClient.getWorkflow(id);
      } catch (error) {
        throw ErrorFactory.fromError(error);
      }
    },
    enabled: !!id,
    retry: (failureCount, error) => {
      // ApiError인 경우에만 재시도 가능 여부 확인
      if (error instanceof ApiError) {
        return error.isRetryable() && failureCount < 3;
      }

      return false;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
  });
}

// 컴포넌트에서 사용
export function WorkflowDetail({ id }: { id: string }) {
  const { data, error, isLoading, refetch } = useWorkflow(id);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error instanceof ApiError ? error : ErrorFactory.fromError(error)}
        onRetry={refetch}
      />
    );
  }

  return <WorkflowCard workflow={data} />;
}
```

### 에러 표시 컴포넌트

```typescript
// components/ErrorDisplay.tsx
import { ApiError } from '@/lib/errors/types';

interface ErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const getMessage = () => {
    if (error instanceof ApiError) {
      return error.getUserMessage();
    }

    return '알 수 없는 오류가 발생했습니다.';
  };

  const getIcon = () => {
    switch (error.code) {
      case 'NOT_FOUND':
        return <SearchOffIcon className="h-12 w-12 text-gray-400" />;
      case 'UNAUTHORIZED':
      case 'FORBIDDEN':
        return <LockClosedIcon className="h-12 w-12 text-yellow-500" />;
      case 'NETWORK_ERROR':
      case 'N8N_CONNECTION_ERROR':
        return <WifiOffIcon className="h-12 w-12 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />;
    }
  };

  const canRetry = error instanceof ApiError && error.isRetryable();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {getIcon()}

      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {error.name}
      </h3>

      <p className="mt-2 text-sm text-gray-600">{getMessage()}</p>

      {error.details && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">상세 정보</summary>
          <pre className="mt-2 text-left">
            {JSON.stringify(error.details, null, 2)}
          </pre>
        </details>
      )}

      <div className="mt-6 flex gap-3">
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            다시 시도
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
        >
          페이지 새로고침
        </button>
      </div>
    </div>
  );
}
```

### Suspense와 함께 사용

```typescript
// app/workflows/[id]/page.tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

export default function WorkflowPage({ params }: { params: { id: string } }) {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <ErrorDisplay
          error={ErrorFactory.fromError(error)}
          onRetry={resetErrorBoundary}
        />
      )}
      onReset={() => {
        // 에러 상태 리셋 로직
      }}
    >
      <Suspense fallback={<LoadingSpinner />}>
        <WorkflowContent id={params.id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## API Route 에러 처리

### Next.js API Route 에러 핸들러

```typescript
// lib/api/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server';
import { BaseError } from '@/lib/errors/base';
import { logger } from '@/lib/logger';

export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

function handleApiError(error: any, request: NextRequest): NextResponse {
  // BaseError 인스턴스인 경우
  if (error instanceof BaseError) {
    logger.error('API Error', {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error.toJSON(),
    });

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Zod 유효성 검사 에러
  if (error.name === 'ZodError') {
    logger.warn('Validation Error', {
      path: request.nextUrl.pathname,
      errors: error.errors,
    });

    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값 유효성 검사에 실패했습니다.',
          details: {
            errors: error.errors.map((err: any) => ({
              path: err.path.join('.'),
              message: err.message,
            })),
          },
        },
      },
      { status: 400 }
    );
  }

  // 예상치 못한 에러
  logger.error('Unexpected Error', {
    path: request.nextUrl.pathname,
    method: request.method,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
  });

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: '내부 서버 오류가 발생했습니다.',
      },
    },
    { status: 500 }
  );
}
```

### API Route에서 사용

```typescript
// app/api/workflows/[id]/route.ts
import { withErrorHandler } from '@/lib/api/errorHandler';
import { NotFoundError, ValidationError } from '@/lib/errors/types';
import { z } from 'zod';

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  active: z.boolean().optional(),
});

export const GET = withErrorHandler(async (request, { params }) => {
  const { id } = params;

  if (!id) {
    throw new ValidationError('워크플로우 ID가 필요합니다.', [
      { field: 'id', message: 'Required' },
    ]);
  }

  const workflow = await n8nClient.getWorkflow(id);

  if (!workflow) {
    throw new NotFoundError('Workflow', id);
  }

  return NextResponse.json({ data: workflow });
});

export const PATCH = withErrorHandler(async (request, { params }) => {
  const { id } = params;
  const body = await request.json();

  // Zod 유효성 검사 (에러 발생 시 자동으로 처리됨)
  const data = updateWorkflowSchema.parse(body);

  const workflow = await n8nClient.updateWorkflow(id, data);

  return NextResponse.json({ data: workflow });
});
```

---

## 에러 바운더리

### 클래스 기반 에러 바운더리

```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { ApiError } from '@/lib/errors/types';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅
    logger.error('React Error Boundary', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
    });

    // 커스텀 에러 핸들러 호출
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-red-100 p-2">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            오류가 발생했습니다
          </h2>
        </div>

        <p className="mt-4 text-sm text-gray-600">{error.message}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            다시 시도
          </button>

          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 사용 예시

```typescript
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            // Sentry 등 에러 추적 서비스로 전송
            console.error('Global Error:', error, errorInfo);
          }}
        >
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

## Toast 알림

### Toast 시스템 구현

```typescript
// lib/toast.ts
import { toast as sonnerToast } from 'sonner';
import { ApiError } from '@/lib/errors/types';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message);
  },

  error: (error: string | Error | ApiError) => {
    if (typeof error === 'string') {
      sonnerToast.error(error);
      return;
    }

    if (error instanceof ApiError) {
      sonnerToast.error(error.getUserMessage(), {
        description: error.details ? JSON.stringify(error.details, null, 2) : undefined,
      });
      return;
    }

    sonnerToast.error(error.message);
  },

  warning: (message: string) => {
    sonnerToast.warning(message);
  },

  info: (message: string) => {
    sonnerToast.info(message);
  },

  promise: async <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error: (err) => {
        if (typeof error === 'function') {
          return error(err);
        }

        if (err instanceof ApiError) {
          return err.getUserMessage();
        }

        return error;
      },
    });
  },
};
```

### 컴포넌트에서 사용

```typescript
// components/WorkflowActions.tsx
import { toast } from '@/lib/toast';
import { useExecuteWorkflow } from '@/hooks/useExecuteWorkflow';

export function WorkflowActions({ workflowId }: { workflowId: string }) {
  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = async () => {
    try {
      await toast.promise(
        executeWorkflow.mutateAsync({ id: workflowId }),
        {
          loading: '워크플로우 실행 중...',
          success: (data) => `워크플로우가 실행되었습니다 (ID: ${data.id})`,
          error: '워크플로우 실행에 실패했습니다.',
        }
      );
    } catch (error) {
      // toast.promise가 에러를 처리하므로 추가 작업이 필요한 경우에만
      console.error(error);
    }
  };

  return (
    <button onClick={handleExecute} className="btn-primary">
      실행
    </button>
  );
}
```

---

## 로깅 및 모니터링

### 구조화된 로깅

```typescript
// lib/logger/index.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export { logger };

// 에러 전용 로거
export function logError(error: Error | ApiError, context?: any) {
  if (error instanceof ApiError) {
    logger.error('API Error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      context,
    });
  } else {
    logger.error('Unexpected Error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }
}
```

### Sentry 통합

```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs';
import { BaseError } from '@/lib/errors/base';

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,

    beforeSend(event, hint) {
      const error = hint.originalException;

      // BaseError 인스턴스인 경우 추가 컨텍스트 설정
      if (error instanceof BaseError) {
        event.tags = {
          ...event.tags,
          errorCode: error.code,
        };

        event.extra = {
          ...event.extra,
          errorDetails: error.details,
          statusCode: error.statusCode,
        };

        // 클라이언트 에러 (4xx)는 로그 레벨 낮추기
        if (error.statusCode >= 400 && error.statusCode < 500) {
          event.level = 'warning';
        }
      }

      return event;
    },
  });
}

export function captureError(error: Error | BaseError, context?: any) {
  Sentry.captureException(error, {
    extra: context,
  });
}
```

---

## 재시도 로직

### 지수 백오프 재시도

```typescript
// lib/retry/exponentialBackoff.ts
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    ...options,
  };

  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 마지막 시도인 경우 에러 throw
      if (attempt === config.maxRetries) {
        throw error;
      }

      // 재시도 불가능한 에러인 경우 즉시 throw
      if (error instanceof ApiError && !error.isRetryable()) {
        throw error;
      }

      // 지연 시간 계산
      const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
      const jitter = config.jitter ? Math.random() * 0.3 * baseDelay : 0;
      const delay = Math.min(baseDelay + jitter, config.maxDelay);

      console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);

      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 조건부 재시도

```typescript
// lib/retry/conditional.ts
export interface ConditionalRetryOptions extends RetryOptions {
  shouldRetry: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  options: Partial<ConditionalRetryOptions>
): Promise<T> {
  const config: ConditionalRetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: (error, attempt) => {
      // 기본 재시도 로직
      if (error instanceof ApiError) {
        return error.isRetryable() && attempt < 3;
      }
      return false;
    },
    ...options,
  };

  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 재시도 가능 여부 확인
      if (!config.shouldRetry(error, attempt)) {
        throw error;
      }

      // 재시도 콜백 호출
      config.onRetry?.(error, attempt);

      // 지연 시간 계산 및 대기
      const baseDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
      const jitter = config.jitter ? Math.random() * 0.3 * baseDelay : 0;
      const delay = Math.min(baseDelay + jitter, config.maxDelay);

      await sleep(delay);
    }
  }

  throw lastError;
}
```

---

## 사용자 친화적 에러 메시지

### 에러 메시지 변환

```typescript
// lib/errors/messages.ts
export const ERROR_MESSAGES: Record<string, string> = {
  // 인증/인가
  UNAUTHORIZED: '로그인이 필요합니다.',
  FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
  TOKEN_EXPIRED: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',

  // 리소스
  WORKFLOW_NOT_FOUND: '워크플로우를 찾을 수 없습니다.',
  EXECUTION_NOT_FOUND: '실행 내역을 찾을 수 없습니다.',
  CREDENTIAL_NOT_FOUND: '인증 정보를 찾을 수 없습니다.',

  // 실행
  EXECUTION_FAILED: '워크플로우 실행에 실패했습니다.',
  EXECUTION_TIMEOUT: '워크플로우 실행 시간이 초과되었습니다.',
  WORKFLOW_INACTIVE: '비활성화된 워크플로우는 실행할 수 없습니다.',

  // 네트워크
  N8N_CONNECTION_ERROR: 'n8n 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  TIMEOUT_ERROR: '요청 시간이 초과되었습니다.',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',

  // 유효성 검사
  VALIDATION_ERROR: '입력값을 확인해주세요.',
  INVALID_WORKFLOW_DATA: '워크플로우 데이터가 올바르지 않습니다.',

  // 기타
  INTERNAL_ERROR: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했습니다.',
};

export function getUserFriendlyMessage(error: ApiError): string {
  return ERROR_MESSAGES[error.code] || error.message;
}
```

### 액션 제안

```typescript
// lib/errors/actions.ts
export interface ErrorAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function getErrorActions(error: ApiError): ErrorAction[] {
  const actions: ErrorAction[] = [];

  switch (error.code) {
    case 'UNAUTHORIZED':
    case 'TOKEN_EXPIRED':
      actions.push({
        label: '로그인',
        action: () => (window.location.href = '/login'),
        variant: 'primary',
      });
      break;

    case 'WORKFLOW_NOT_FOUND':
    case 'EXECUTION_NOT_FOUND':
      actions.push({
        label: '목록으로',
        action: () => window.history.back(),
        variant: 'secondary',
      });
      break;

    case 'RATE_LIMIT_EXCEEDED':
      actions.push({
        label: `${Math.ceil((new Date(error.details.resetAt).getTime() - Date.now()) / 1000)}초 후 재시도`,
        action: () => {},
        variant: 'secondary',
      });
      break;

    case 'N8N_CONNECTION_ERROR':
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      actions.push({
        label: '다시 시도',
        action: () => window.location.reload(),
        variant: 'primary',
      });
      break;
  }

  // 항상 홈으로 버튼 추가
  actions.push({
    label: '홈으로',
    action: () => (window.location.href = '/'),
    variant: 'secondary',
  });

  return actions;
}
```

---

## 다음 단계

- [테스팅 가이드](./testing.md) - 에러 시나리오 테스트 방법
- [API Wrapper](./api-wrapper.md) - API 클라이언트 에러 처리
- [아키텍처 문서](./architecture.md) - 시스템 에러 처리 아키텍처

---

## 참고 자료

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
