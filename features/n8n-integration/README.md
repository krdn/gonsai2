# n8n Integration Module

> Type-safe n8n REST API client and webhook handler

이 모듈은 n8n 워크플로우 자동화 플랫폼과의 통합을 제공합니다.

## 📂 파일 구조

```
n8n-integration/
├── types.ts              # TypeScript 타입 정의
├── api-client.ts         # n8n REST API 클라이언트
├── webhook-handler.ts    # 웹훅 요청 처리
├── workflow-executor.ts  # 워크플로우 실행 관리
├── workflow-monitor.ts   # 실행 모니터링
└── README.md            # 이 파일
```

## 🚀 빠른 시작

### 1. API Client 사용

```typescript
import { createN8nClient } from './api-client';

// 클라이언트 생성 (환경 변수에서 자동 로드)
const client = createN8nClient();

// 워크플로우 목록 조회
const workflows = await client.workflows.getAll();

// 워크플로우 실행
const execution = await client.executions.execute('workflow-id', {
  userId: '123',
  action: 'process',
});

// 실행 완료 대기
const result = await client.executions.waitForCompletion(execution.id);
```

### 2. Webhook Handler 사용

```typescript
import express from 'express';
import { createWebhookHandler } from './webhook-handler';

const app = express();
const handler = createWebhookHandler(client);

app.post('/webhook/:workflowId', async (req, res) => {
  const result = await handler.handle({
    headers: req.headers as Record<string, string>,
    body: req.body,
    query: req.query as Record<string, string>,
    params: req.params as Record<string, string>,
  });

  res.status(result.statusCode).json(result.body);
});
```

## 📖 주요 기능

### API Client

- ✅ **완전한 타입 지원**: TypeScript로 모든 API 타입 정의
- 🔄 **자동 재시도**: 네트워크 오류 시 exponential backoff 재시도
- ⏱️ **타임아웃 관리**: 설정 가능한 요청 타임아웃
- 🛡️ **오류 처리**: 일관된 오류 형식 및 상세 메시지

### Webhook Handler

- 🔐 **인증 지원**: 커스텀 인증 검증 로직
- ⚡ **다양한 응답 모드**: 즉시 응답 또는 완료 대기
- 📊 **메트릭 수집**: 처리 시간, 성공률 자동 추적
- 🔍 **상세 로깅**: 디버깅을 위한 로그 기록

## 🎯 AI 최적화 특징

이 모듈은 Kent Beck의 Augmented Coding 원칙을 따릅니다:

### 1. 명확한 의도

```typescript
// ❌ Bad
async function exec(id: string) { ... }

// ✅ Good - AI가 즉시 이해 가능
async function executeWorkflowAndWaitForCompletion(
  workflowId: string
): Promise<WorkflowExecution> { ... }
```

### 2. 풍부한 컨텍스트

모든 함수와 인터페이스에 `@aiContext` 주석 포함:

```typescript
/**
 * @aiContext
 * Triggers workflow execution with provided data.
 * Returns execution ID immediately (non-blocking).
 * Use `waitForCompletion()` to wait for result.
 */
async execute(workflowId: string, triggerData?: WorkflowTriggerData) { ... }
```

### 3. 작은 단계

각 함수는 하나의 명확한 작업만 수행:

- `execute()` - 워크플로우 실행
- `waitForCompletion()` - 완료 대기
- `getById()` - 실행 정보 조회

## 🔧 환경 변수

`.env` 파일에 다음 변수 설정:

```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here
```

## 📊 사용 예시

### 워크플로우 실행 및 모니터링

```typescript
import { createN8nClient } from './api-client';

const client = createN8nClient();

// 실행
const execution = await client.executions.execute('workflow-id', {
  input: 'test data',
});

console.log(`Execution started: ${execution.id}`);

// 상태 확인
const status = await client.executions.getById(execution.id);
console.log(`Status: ${status.status}`);

// 완료 대기
const result = await client.executions.waitForCompletion(execution.id);
console.log(`Result:`, result.data);
```

### 오류 처리

```typescript
import { N8nApiError, WorkflowExecutionError } from './types';

try {
  await client.workflows.getById('invalid-id');
} catch (error) {
  if (error instanceof N8nApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status Code: ${error.statusCode}`);
  }
}
```

### 재시도 설정

```typescript
const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key',
  retry: {
    maxAttempts: 5,
    delayMs: 2000, // 2초 간격으로 재시도
  },
});
```

## 🧪 테스트

```bash
# 단위 테스트
npm test features/n8n-integration

# 통합 테스트 (n8n 컨테이너 필요)
npm run test:integration features/n8n-integration
```

## 🔗 관련 파일

- **타입 정의**: [types.ts](./types.ts)
- **API Client**: [api-client.ts](./api-client.ts)
- **Webhook Handler**: [webhook-handler.ts](./webhook-handler.ts)
- **컨텍스트 맵**: [../../.ai/context-map.json](../../.ai/context-map.json)
- **오류 패턴**: [../../.ai/error-patterns.json](../../.ai/error-patterns.json)

## 📚 참고 자료

- [n8n REST API Documentation](https://docs.n8n.io/api/)
- [n8n Docker Setup](/home/gon/docker-n8n/README.md)
- [gonsai2 프로젝트 개요](../../README.md)
