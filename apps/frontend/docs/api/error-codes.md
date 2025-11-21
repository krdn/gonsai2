---
sidebar_position: 6
title: 에러 코드
---

# API 에러 코드

API에서 반환되는 에러 코드와 해결 방법을 설명합니다.

## 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field1": "Additional information",
      "field2": "More context"
    }
  }
}
```

## HTTP 상태 코드 매핑

| HTTP 코드 | 카테고리            | 설명                  |
| --------- | ------------------- | --------------------- |
| 400       | Client Error        | 잘못된 요청           |
| 401       | Authentication      | 인증 실패             |
| 403       | Authorization       | 권한 없음             |
| 404       | Not Found           | 리소스를 찾을 수 없음 |
| 409       | Conflict            | 리소스 충돌           |
| 422       | Validation          | 유효성 검사 실패      |
| 429       | Rate Limit          | 요청 제한 초과        |
| 500       | Server Error        | 서버 내부 오류        |
| 502       | Gateway Error       | n8n 연결 실패         |
| 503       | Service Unavailable | 서비스 이용 불가      |
| 504       | Gateway Timeout     | n8n 응답 시간 초과    |

## 인증 에러 (4xx)

### AUTHENTICATION_FAILED (401)

**설명:** API 키 또는 JWT 토큰 인증 실패

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Invalid or missing API key"
  }
}
```

**해결 방법:**

1. API 키가 올바른지 확인
2. `X-N8N-API-KEY` 헤더가 포함되었는지 확인
3. n8n에서 API 키를 재생성

**예제:**

```typescript
try {
  const response = await fetch('/api/workflows', {
    headers: {
      'X-N8N-API-KEY': process.env.NEXT_PUBLIC_N8N_API_KEY!,
    },
  });

  if (response.status === 401) {
    console.error('Authentication failed - check API key');
    // API 키 갱신 로직
  }
} catch (error) {
  console.error('Request failed:', error);
}
```

---

### TOKEN_EXPIRED (401)

**설명:** JWT 토큰이 만료됨

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "JWT token has expired",
    "details": {
      "expiredAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

**해결 방법:**

1. Refresh token을 사용하여 새 access token 발급
2. 사용자에게 재로그인 요청

**예제:**

```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.ok) {
    const { accessToken } = await response.json();
    localStorage.setItem('accessToken', accessToken);
    return accessToken;
  }

  throw new Error('Failed to refresh token');
}
```

---

### INSUFFICIENT_PERMISSIONS (403)

**설명:** 리소스에 대한 권한이 없음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You do not have permission to access this resource",
    "details": {
      "requiredRole": "admin",
      "currentRole": "user"
    }
  }
}
```

**해결 방법:**

1. 사용자 권한 확인
2. 관리자에게 권한 요청

---

## 리소스 에러 (4xx)

### WORKFLOW_NOT_FOUND (404)

**설명:** 요청한 워크플로우를 찾을 수 없음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow with ID 'abc123' not found",
    "details": {
      "workflowId": "abc123"
    }
  }
}
```

**해결 방법:**

1. 워크플로우 ID가 올바른지 확인
2. 워크플로우가 삭제되었는지 확인

**예제:**

```typescript
async function getWorkflowSafe(workflowId: string) {
  try {
    return await n8nClient.getWorkflow(workflowId);
  } catch (error: any) {
    if (error.code === 'WORKFLOW_NOT_FOUND') {
      console.error(`Workflow ${workflowId} not found`);
      return null;
    }
    throw error;
  }
}
```

---

### EXECUTION_NOT_FOUND (404)

**설명:** 요청한 실행을 찾을 수 없음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "EXECUTION_NOT_FOUND",
    "message": "Execution with ID 'exec-123' not found"
  }
}
```

---

### WORKFLOW_NAME_EXISTS (409)

**설명:** 동일한 이름의 워크플로우가 이미 존재

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_NAME_EXISTS",
    "message": "Workflow with name 'My Workflow' already exists",
    "details": {
      "name": "My Workflow",
      "existingId": "1"
    }
  }
}
```

**해결 방법:**

1. 워크플로우 이름 변경
2. 기존 워크플로우 업데이트

---

## 유효성 검사 에러 (422)

### VALIDATION_ERROR (422)

**설명:** 요청 데이터 유효성 검사 실패

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": {
        "name": "Name is required",
        "nodes": "At least one node is required",
        "connections": "Invalid connection structure"
      }
    }
  }
}
```

**해결 방법:**

1. 요청 데이터의 각 필드 확인
2. 필수 필드가 모두 포함되었는지 확인

**예제:**

```typescript
function validateWorkflow(workflow: CreateWorkflowDto): string[] {
  const errors: string[] = [];

  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('At least one node is required');
  }

  const hasStartNode = workflow.nodes.some((node) => node.type === 'n8n-nodes-base.start');
  if (!hasStartNode) {
    errors.push('Start node is required');
  }

  return errors;
}
```

---

### INVALID_WORKFLOW_STRUCTURE (422)

**설명:** 워크플로우 구조가 유효하지 않음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_WORKFLOW_STRUCTURE",
    "message": "Invalid workflow structure",
    "details": {
      "errors": [
        "Node 'http' references non-existent node 'missing-node'",
        "Circular dependency detected between 'nodeA' and 'nodeB'"
      ]
    }
  }
}
```

---

## Rate Limiting 에러 (429)

### RATE_LIMIT_EXCEEDED (429)

**설명:** API 호출 제한 초과

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 60,
      "remaining": 0,
      "resetAt": "2024-01-01T00:01:00Z",
      "retryAfter": 60
    }
  }
}
```

**해결 방법:**

1. `retryAfter` 초만큼 대기 후 재시도
2. 요청 빈도 줄이기
3. Rate limit 증가 요청

**예제:**

```typescript
async function fetchWithRetry(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('X-RateLimit-Reset') || '60');

    console.log(`Rate limited. Retrying after ${retryAfter}s`);

    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

    return fetch(url, options);
  }

  return response;
}
```

---

## 실행 에러 (5xx)

### EXECUTION_FAILED (500)

**설명:** 워크플로우 실행 중 오류 발생

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "EXECUTION_FAILED",
    "message": "Workflow execution failed",
    "details": {
      "workflowId": "1",
      "executionId": "exec-123",
      "node": "HTTP Request",
      "error": "Connection timeout",
      "stack": "Error: Connection timeout\n  at ..."
    }
  }
}
```

**해결 방법:**

1. 에러 메시지 및 스택 트레이스 확인
2. 실패한 노드 확인
3. 워크플로우 로직 수정
4. 재시도

**예제:**

```typescript
async function executeWorkflowWithRetry(workflowId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await n8nClient.executeWorkflow(workflowId);
    } catch (error: any) {
      if (error.code === 'EXECUTION_FAILED' && attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

---

### N8N_CONNECTION_ERROR (502)

**설명:** n8n 인스턴스에 연결할 수 없음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "N8N_CONNECTION_ERROR",
    "message": "Failed to connect to n8n instance",
    "details": {
      "url": "http://localhost:5678",
      "error": "ECONNREFUSED"
    }
  }
}
```

**해결 방법:**

1. n8n 서비스가 실행 중인지 확인
2. n8n URL이 올바른지 확인
3. 네트워크 연결 확인

**예제:**

```bash
# n8n 상태 확인
curl http://localhost:5678/healthz

# Docker 컨테이너 확인
docker ps | grep n8n

# 로그 확인
docker logs n8n
```

---

### N8N_TIMEOUT (504)

**설명:** n8n 응답 시간 초과

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "N8N_TIMEOUT",
    "message": "Request to n8n timed out after 30000ms",
    "details": {
      "timeout": 30000,
      "endpoint": "/api/v1/workflows/1/execute"
    }
  }
}
```

**해결 방법:**

1. 타임아웃 값 증가
2. 워크플로우 최적화
3. n8n 서버 성능 확인

**예제:**

```typescript
const client = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
  timeout: 60000, // 60초로 증가
});
```

---

### DATABASE_ERROR (500)

**설명:** 데이터베이스 오류

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to save workflow to database",
    "details": {
      "database": "MongoDB",
      "error": "Connection pool exhausted"
    }
  }
}
```

**해결 방법:**

1. 데이터베이스 연결 확인
2. 데이터베이스 서버 상태 확인
3. 연결 풀 크기 조정

---

## Webhook 에러

### WEBHOOK_AUTHENTICATION_FAILED (401)

**설명:** Webhook 인증 실패

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "WEBHOOK_AUTHENTICATION_FAILED",
    "message": "Invalid webhook secret"
  }
}
```

**해결 방법:**

1. Webhook secret 확인
2. n8n Webhook 노드 헤더 설정 확인

---

### INVALID_WEBHOOK_SIGNATURE (401)

**설명:** Webhook HMAC 서명이 유효하지 않음

**응답 예시:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_WEBHOOK_SIGNATURE",
    "message": "Webhook signature verification failed"
  }
}
```

**해결 방법:**

1. Webhook secret이 일치하는지 확인
2. 서명 생성 로직 확인

---

## 에러 처리 모범 사례

### 1. 전역 에러 핸들러

```typescript
class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: any): ApiError {
  // n8n API 에러
  if (error.response) {
    return new ApiError(
      error.response.data?.error?.code || 'API_ERROR',
      error.response.data?.error?.message || 'An error occurred',
      error.response.data?.error?.details,
      error.response.status
    );
  }

  // 네트워크 에러
  if (error.code === 'ECONNREFUSED') {
    return new ApiError(
      'N8N_CONNECTION_ERROR',
      'Failed to connect to n8n',
      { error: error.message },
      502
    );
  }

  // 타임아웃
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return new ApiError('N8N_TIMEOUT', 'Request timed out', { error: error.message }, 504);
  }

  // 기타 에러
  return new ApiError('INTERNAL_ERROR', error.message || 'An unexpected error occurred', null, 500);
}
```

### 2. React Query Error Handling

```typescript
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

export function useWorkflowsWithErrorHandling() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      try {
        return await n8nClient.getWorkflows();
      } catch (error: any) {
        const apiError = handleApiError(error);

        switch (apiError.code) {
          case 'AUTHENTICATION_FAILED':
            toast({
              title: '인증 실패',
              description: 'API 키를 확인해주세요.',
              variant: 'destructive',
            });
            break;

          case 'N8N_CONNECTION_ERROR':
            toast({
              title: '연결 실패',
              description: 'n8n 서버에 연결할 수 없습니다.',
              variant: 'destructive',
            });
            break;

          case 'RATE_LIMIT_EXCEEDED':
            toast({
              title: '요청 제한 초과',
              description: '잠시 후 다시 시도해주세요.',
              variant: 'destructive',
            });
            break;

          default:
            toast({
              title: '오류 발생',
              description: apiError.message,
              variant: 'destructive',
            });
        }

        throw apiError;
      }
    },
  });
}
```

### 3. 재시도 전략

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        const apiError = error as ApiError;

        // 클라이언트 에러는 재시도하지 않음
        if (apiError.statusCode >= 400 && apiError.statusCode < 500) {
          return false;
        }

        // Rate limit 에러는 재시도하지 않음
        if (apiError.code === 'RATE_LIMIT_EXCEEDED') {
          return false;
        }

        // 최대 3회 재시도
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // 지수 백오프: 2초, 4초, 8초
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
    },
  },
});
```

## 에러 로깅

```typescript
import * as Sentry from '@sentry/nextjs';

export function logError(error: ApiError, context?: any) {
  // 콘솔 로그
  console.error('[API Error]', {
    code: error.code,
    message: error.message,
    details: error.details,
    context,
  });

  // Sentry에 에러 전송
  Sentry.captureException(error, {
    tags: {
      error_code: error.code,
      status_code: error.statusCode,
    },
    extra: {
      details: error.details,
      context,
    },
  });

  // 서버 로그에 기록
  if (typeof window === 'undefined') {
    // 서버 사이드 로깅
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

## 다음 단계

1. [워크플로우 API](./workflows) - 워크플로우 API 문서
2. [실행 API](./executions) - 실행 API 문서
3. [트러블슈팅](/operations/troubleshooting) - 문제 해결 가이드

## 참고 자료

- [HTTP 상태 코드](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [REST API 에러 처리](https://www.rfc-editor.org/rfc/rfc7807)
- [n8n API 문서](https://docs.n8n.io/api/)
