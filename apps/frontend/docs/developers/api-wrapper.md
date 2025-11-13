# API Wrapper - N8nApiClient

N8nApiClient는 n8n REST API와 통신하기 위한 타입 안전한 래퍼 클라이언트입니다. 자동 재시도, 에러 처리, 타입 정의 등을 제공합니다.

## 목차

- [초기화](#초기화)
- [기본 사용법](#기본-사용법)
- [메서드 레퍼런스](#메서드-레퍼런스)
- [에러 처리](#에러-처리)
- [재시도 전략](#재시도-전략)
- [Rate Limiting](#rate-limiting)
- [타입 정의](#타입-정의)
- [React Hooks 통합](#react-hooks-통합)
- [고급 패턴](#고급-패턴)
- [테스팅](#테스팅)

---

## 초기화

### 기본 초기화

```typescript
import { N8nApiClient } from '@/lib/n8n/client';

const client = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
});
```

### 고급 설정

```typescript
const client = new N8nApiClient({
  baseUrl: 'https://n8n.example.com/api/v1',
  apiKey: 'your-api-key',

  // 타임아웃 설정 (기본값: 30초)
  timeout: 60000,

  // 재시도 설정
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // 1초
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },

  // Rate Limiting
  rateLimit: {
    maxRequests: 100,
    perMilliseconds: 60000, // 1분당 100개 요청
  },

  // 로깅 활성화
  enableLogging: true,

  // 커스텀 헤더
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### 싱글톤 패턴

```typescript
// lib/n8n/client.ts
let clientInstance: N8nApiClient | null = null;

export function getN8nClient(): N8nApiClient {
  if (!clientInstance) {
    clientInstance = new N8nApiClient({
      baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
      apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
    });
  }

  return clientInstance;
}

// 사용
import { getN8nClient } from '@/lib/n8n/client';

const client = getN8nClient();
```

---

## 기본 사용법

### Workflow 가져오기

```typescript
// 모든 워크플로우 조회
const workflows = await client.getWorkflows();

// 필터와 정렬 적용
const filteredWorkflows = await client.getWorkflows({
  filter: { active: true },
  sort: { createdAt: -1 },
  limit: 20,
  skip: 0,
});

// 특정 워크플로우 조회
const workflow = await client.getWorkflow('workflow-id');
```

### Workflow 생성/수정/삭제

```typescript
// 워크플로우 생성
const newWorkflow = await client.createWorkflow({
  name: 'My Workflow',
  nodes: [
    {
      id: 'start',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      position: [250, 300],
      parameters: {},
    },
  ],
  connections: {},
  active: false,
  settings: {},
});

// 워크플로우 수정
const updatedWorkflow = await client.updateWorkflow('workflow-id', {
  name: 'Updated Name',
  active: true,
});

// 워크플로우 삭제
await client.deleteWorkflow('workflow-id');
```

### Workflow 실행

```typescript
// 워크플로우 실행
const execution = await client.executeWorkflow('workflow-id', {
  input: 'data',
});

// 실행 ID 확인
console.log(`Execution ID: ${execution.id}`);
```

### Execution 조회

```typescript
// 모든 실행 내역 조회
const executions = await client.getExecutions({
  workflowId: 'workflow-id',
  status: 'success',
  limit: 50,
});

// 특정 실행 내역 조회
const execution = await client.getExecution('execution-id');

// 실행 상태 확인
console.log(`Status: ${execution.status}`);
console.log(`Started: ${execution.startedAt}`);
console.log(`Finished: ${execution.stoppedAt}`);
```

---

## 메서드 레퍼런스

### Workflows

#### `getWorkflows(options?): Promise<Workflow[]>`

모든 워크플로우를 조회합니다.

**Parameters:**
```typescript
interface GetWorkflowsOptions {
  filter?: {
    active?: boolean;
    tags?: string[];
    name?: string;
  };
  sort?: {
    [key: string]: 1 | -1; // 1: 오름차순, -1: 내림차순
  };
  limit?: number;
  skip?: number;
}
```

**Example:**
```typescript
const activeWorkflows = await client.getWorkflows({
  filter: { active: true },
  sort: { createdAt: -1 },
  limit: 10,
});
```

#### `getWorkflow(id): Promise<Workflow>`

특정 워크플로우를 ID로 조회합니다.

**Example:**
```typescript
const workflow = await client.getWorkflow('abc123');
console.log(workflow.name);
```

#### `createWorkflow(data): Promise<Workflow>`

새 워크플로우를 생성합니다.

**Parameters:**
```typescript
interface CreateWorkflowData {
  name: string;
  nodes: INode[];
  connections: IConnections;
  active?: boolean;
  settings?: IWorkflowSettings;
  tags?: string[];
}
```

**Example:**
```typescript
const workflow = await client.createWorkflow({
  name: 'Data Sync Workflow',
  nodes: [
    {
      id: 'webhook',
      name: 'Webhook',
      type: 'n8n-nodes-base.webhook',
      position: [250, 300],
      parameters: {
        path: 'data-sync',
        httpMethod: 'POST',
      },
    },
  ],
  connections: {},
  active: true,
});
```

#### `updateWorkflow(id, data): Promise<Workflow>`

기존 워크플로우를 수정합니다.

**Example:**
```typescript
const updated = await client.updateWorkflow('abc123', {
  name: 'Updated Workflow Name',
  active: false,
});
```

#### `deleteWorkflow(id): Promise<void>`

워크플로우를 삭제합니다.

**Example:**
```typescript
await client.deleteWorkflow('abc123');
```

#### `executeWorkflow(id, data?): Promise<Execution>`

워크플로우를 실행합니다.

**Example:**
```typescript
const execution = await client.executeWorkflow('abc123', {
  userId: '12345',
  action: 'process',
});

console.log(`Started execution: ${execution.id}`);
```

### Executions

#### `getExecutions(options?): Promise<Execution[]>`

실행 내역을 조회합니다.

**Parameters:**
```typescript
interface GetExecutionsOptions {
  workflowId?: string;
  status?: 'success' | 'error' | 'waiting' | 'running';
  limit?: number;
  offset?: number;
  startedAfter?: Date;
  startedBefore?: Date;
}
```

**Example:**
```typescript
const recentExecutions = await client.getExecutions({
  workflowId: 'abc123',
  status: 'success',
  limit: 20,
  startedAfter: new Date('2024-01-01'),
});
```

#### `getExecution(id): Promise<Execution>`

특정 실행 내역을 조회합니다.

**Example:**
```typescript
const execution = await client.getExecution('exec-123');

if (execution.status === 'error') {
  console.error('Execution failed:', execution.error);
}
```

#### `stopExecution(id): Promise<Execution>`

실행 중인 워크플로우를 중지합니다.

**Example:**
```typescript
await client.stopExecution('exec-123');
```

#### `retryExecution(id): Promise<Execution>`

실패한 실행을 재시도합니다.

**Example:**
```typescript
const retried = await client.retryExecution('exec-123');
console.log(`Retry execution ID: ${retried.id}`);
```

### Credentials

#### `getCredentials(): Promise<Credential[]>`

모든 인증 정보를 조회합니다.

**Example:**
```typescript
const credentials = await client.getCredentials();
```

#### `createCredential(data): Promise<Credential>`

새 인증 정보를 생성합니다.

**Example:**
```typescript
const credential = await client.createCredential({
  name: 'My API Key',
  type: 'httpHeaderAuth',
  data: {
    name: 'Authorization',
    value: 'Bearer token123',
  },
});
```

---

## 에러 처리

### ApiError 클래스

N8nApiClient는 모든 에러를 `ApiError` 클래스로 래핑합니다.

```typescript
export class ApiError extends Error {
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
```

### 에러 처리 패턴

```typescript
import { ApiError } from '@/lib/n8n/client';

try {
  const workflow = await client.getWorkflow('invalid-id');
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WORKFLOW_NOT_FOUND':
        console.error('워크플로우를 찾을 수 없습니다:', error.message);
        break;

      case 'UNAUTHORIZED':
        console.error('인증 실패:', error.message);
        // 로그인 페이지로 리다이렉트
        break;

      case 'RATE_LIMIT_EXCEEDED':
        console.error('요청 제한 초과:', error.details.resetAt);
        // 재시도 타이머 설정
        break;

      case 'N8N_CONNECTION_ERROR':
        console.error('n8n 서버 연결 실패');
        // 폴백 UI 표시
        break;

      default:
        console.error('알 수 없는 에러:', error);
    }
  } else {
    console.error('예상치 못한 에러:', error);
  }
}
```

### 전역 에러 핸들러

```typescript
// lib/n8n/errorHandler.ts
export function handleApiError(error: any): {
  message: string;
  action?: string;
} {
  if (!(error instanceof ApiError)) {
    return {
      message: '알 수 없는 오류가 발생했습니다.',
    };
  }

  const errorMap: Record<string, { message: string; action?: string }> = {
    WORKFLOW_NOT_FOUND: {
      message: '워크플로우를 찾을 수 없습니다.',
      action: 'refresh',
    },
    UNAUTHORIZED: {
      message: '인증이 필요합니다.',
      action: 'login',
    },
    RATE_LIMIT_EXCEEDED: {
      message: '요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.',
      action: 'retry',
    },
    VALIDATION_ERROR: {
      message: '입력값을 확인해주세요.',
      action: 'fix',
    },
    N8N_CONNECTION_ERROR: {
      message: 'n8n 서버에 연결할 수 없습니다.',
      action: 'contact',
    },
  };

  return errorMap[error.code] || {
    message: error.message,
  };
}

// 사용
try {
  await client.executeWorkflow(id);
} catch (error) {
  const { message, action } = handleApiError(error);

  toast.error(message);

  if (action === 'login') {
    router.push('/login');
  }
}
```

---

## 재시도 전략

### 자동 재시도

N8nApiClient는 실패한 요청을 자동으로 재시도합니다.

```typescript
const client = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // 초기 지연 시간
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    exponentialBackoff: true, // 지수 백오프 활성화
  },
});
```

### 지수 백오프 알고리즘

```typescript
// lib/n8n/retry.ts
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * delay; // ±30% 지터

  return Math.min(delay + jitter, maxDelay);
}

// 사용 예시
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    return await makeRequest();
  } catch (error) {
    if (attempt === maxRetries) {
      throw error;
    }

    const delay = calculateRetryDelay(attempt);
    console.log(`Retry ${attempt}/${maxRetries} after ${delay}ms`);

    await sleep(delay);
  }
}
```

### 조건부 재시도

```typescript
// lib/n8n/retry.ts
export function shouldRetry(error: any, attempt: number): boolean {
  // 최대 재시도 횟수 초과
  if (attempt >= 3) {
    return false;
  }

  // ApiError가 아닌 경우 재시도 안 함
  if (!(error instanceof ApiError)) {
    return false;
  }

  // 클라이언트 에러 (4xx)는 재시도 안 함
  if (error.statusCode >= 400 && error.statusCode < 500) {
    // 단, 408 (Request Timeout)과 429 (Rate Limit)는 재시도
    return error.statusCode === 408 || error.statusCode === 429;
  }

  // 서버 에러 (5xx)는 재시도
  return error.statusCode >= 500;
}
```

---

## Rate Limiting

### Rate Limiter 설정

```typescript
const client = new N8nApiClient({
  baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
  apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
  rateLimit: {
    maxRequests: 100, // 최대 요청 수
    perMilliseconds: 60000, // 시간 윈도우 (1분)
    strategy: 'sliding-window', // 'fixed-window' | 'sliding-window'
  },
});
```

### Rate Limit 에러 처리

```typescript
try {
  const workflows = await client.getWorkflows();
} catch (error) {
  if (error instanceof ApiError && error.code === 'RATE_LIMIT_EXCEEDED') {
    const resetAt = error.details.resetAt;
    const waitTime = new Date(resetAt).getTime() - Date.now();

    console.log(`Rate limit exceeded. Retry after ${waitTime}ms`);

    // 자동 재시도 스케줄링
    setTimeout(async () => {
      const workflows = await client.getWorkflows();
    }, waitTime);
  }
}
```

### 클라이언트 측 Rate Limiting

```typescript
// lib/n8n/rateLimiter.ts
export class ClientRateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  private maxConcurrent: number;
  private minInterval: number;
  private lastRun = 0;

  constructor(maxConcurrent: number = 5, minInterval: number = 200) {
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRun = now - this.lastRun;

    if (timeSinceLastRun < this.minInterval) {
      setTimeout(() => this.process(), this.minInterval - timeSinceLastRun);
      return;
    }

    this.running++;
    this.lastRun = now;

    const task = this.queue.shift();
    if (task) {
      await task();
      this.running--;
      this.process();
    }
  }
}

// 사용
const limiter = new ClientRateLimiter(5, 200);

const workflows = await Promise.all(
  workflowIds.map(id =>
    limiter.execute(() => client.getWorkflow(id))
  )
);
```

---

## 타입 정의

### Workflow 타입

```typescript
export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: INode[];
  connections: IConnections;
  settings: IWorkflowSettings;
  staticData?: any;
  tags?: ITag[];
  createdAt: string;
  updatedAt: string;
}

export interface INode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
}

export interface IConnections {
  [nodeId: string]: {
    [outputType: string]: Array<
      Array<{
        node: string;
        type: string;
        index: number;
      }>
    >;
  };
}

export interface IWorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  timezone?: string;
}
```

### Execution 타입

```typescript
export interface Execution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'error';
  startedAt: string;
  stoppedAt?: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  data?: IRunExecutionData;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  error?: ExecutionError;
}

export interface IRunExecutionData {
  startData?: {
    destinationNode?: string;
    runNodeFilter?: string[];
  };
  resultData: {
    runData: {
      [nodeId: string]: ITaskData[];
    };
    error?: ExecutionError;
    lastNodeExecuted?: string;
  };
  executionData?: {
    contextData: Record<string, any>;
    nodeExecutionStack: IExecuteData[];
    waitingExecution: Record<string, any>;
  };
}

export interface ExecutionError {
  message: string;
  node?: string;
  stack?: string;
  level?: 'warning' | 'error';
  functionality?: string;
  context?: Record<string, any>;
}
```

### Credential 타입

```typescript
export interface Credential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: INodeProperties[];
}
```

---

## React Hooks 통합

### useWorkflows Hook

```typescript
// hooks/useWorkflows.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getN8nClient } from '@/lib/n8n/client';

export function useWorkflows(options?: GetWorkflowsOptions) {
  return useQuery({
    queryKey: ['workflows', options],
    queryFn: () => getN8nClient().getWorkflows(options),
    staleTime: 30000, // 30초
    cacheTime: 300000, // 5분
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => getN8nClient().getWorkflow(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkflowData) =>
      getN8nClient().createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workflow> }) =>
      getN8nClient().updateWorkflow(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', variables.id] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => getN8nClient().deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}
```

### useExecuteWorkflow Hook

```typescript
// hooks/useExecuteWorkflow.ts
export function useExecuteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) =>
      getN8nClient().executeWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
}

export function useExecutions(options?: GetExecutionsOptions) {
  return useQuery({
    queryKey: ['executions', options],
    queryFn: () => getN8nClient().getExecutions(options),
    refetchInterval: (query) => {
      // 실행 중인 항목이 있으면 2초마다 폴링
      const executions = query.state.data || [];
      const hasRunning = executions.some(
        (exec) => exec.status === 'running' || exec.status === 'waiting'
      );

      return hasRunning ? 2000 : false;
    },
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => getN8nClient().getExecution(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const execution = query.state.data;

      if (
        execution?.status === 'running' ||
        execution?.status === 'waiting'
      ) {
        return 2000; // 2초마다 폴링
      }

      return false; // 완료된 경우 폴링 중지
    },
  });
}
```

### 컴포넌트에서 사용

```typescript
// components/WorkflowList.tsx
export function WorkflowList() {
  const { data: workflows, isLoading, error } = useWorkflows({
    filter: { active: true },
    sort: { createdAt: -1 },
  });

  const executeWorkflow = useExecuteWorkflow();

  const handleExecute = async (id: string) => {
    try {
      await executeWorkflow.mutateAsync({ id });
      toast.success('워크플로우가 실행되었습니다.');
    } catch (error) {
      const { message } = handleApiError(error);
      toast.error(message);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="grid gap-4">
      {workflows?.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          workflow={workflow}
          onExecute={() => handleExecute(workflow.id)}
        />
      ))}
    </div>
  );
}
```

---

## 고급 패턴

### 배치 요청

```typescript
// lib/n8n/batch.ts
export async function batchGetWorkflows(
  ids: string[],
  concurrency: number = 5
): Promise<Workflow[]> {
  const client = getN8nClient();
  const limiter = new ClientRateLimiter(concurrency, 200);

  const workflows = await Promise.all(
    ids.map((id) => limiter.execute(() => client.getWorkflow(id)))
  );

  return workflows;
}

// 사용
const workflowIds = ['id1', 'id2', 'id3', /* ... */];
const workflows = await batchGetWorkflows(workflowIds, 5);
```

### 캐싱 레이어

```typescript
// lib/n8n/cache.ts
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500, // 최대 500개 항목
  ttl: 1000 * 60 * 5, // 5분 TTL
});

export async function getCachedWorkflow(id: string): Promise<Workflow> {
  const cacheKey = `workflow:${id}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const workflow = await getN8nClient().getWorkflow(id);
  cache.set(cacheKey, workflow);

  return workflow;
}

export function invalidateWorkflowCache(id: string) {
  cache.delete(`workflow:${id}`);
}
```

### Request/Response 인터셉터

```typescript
// lib/n8n/interceptors.ts
export class N8nApiClient {
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = [];

  private responseInterceptors: Array<
    (response: any) => any | Promise<any>
  > = [];

  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    interceptor: (response: any) => any | Promise<any>
  ) {
    this.responseInterceptors.push(interceptor);
  }

  private async executeRequestInterceptors(
    config: RequestConfig
  ): Promise<RequestConfig> {
    let modifiedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }

    return modifiedConfig;
  }

  private async executeResponseInterceptors(response: any): Promise<any> {
    let modifiedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      modifiedResponse = await interceptor(modifiedResponse);
    }

    return modifiedResponse;
  }
}

// 사용 예시
const client = getN8nClient();

// 요청 로깅 인터셉터
client.addRequestInterceptor((config) => {
  console.log(`[Request] ${config.method} ${config.url}`);
  return config;
});

// 응답 변환 인터셉터
client.addResponseInterceptor((response) => {
  // 날짜 문자열을 Date 객체로 변환
  if (response.createdAt) {
    response.createdAt = new Date(response.createdAt);
  }
  if (response.updatedAt) {
    response.updatedAt = new Date(response.updatedAt);
  }

  return response;
});
```

### Connection Pooling

```typescript
// lib/n8n/pool.ts
export class ConnectionPool {
  private connections: Array<N8nApiClient> = [];
  private availableConnections: Array<N8nApiClient> = [];
  private readonly poolSize: number;

  constructor(poolSize: number = 10) {
    this.poolSize = poolSize;
    this.initialize();
  }

  private initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const client = new N8nApiClient({
        baseUrl: process.env.NEXT_PUBLIC_N8N_API_URL!,
        apiKey: process.env.NEXT_PUBLIC_N8N_API_KEY!,
      });

      this.connections.push(client);
      this.availableConnections.push(client);
    }
  }

  async acquire(): Promise<N8nApiClient> {
    while (this.availableConnections.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return this.availableConnections.pop()!;
  }

  release(client: N8nApiClient) {
    this.availableConnections.push(client);
  }

  async execute<T>(fn: (client: N8nApiClient) => Promise<T>): Promise<T> {
    const client = await this.acquire();

    try {
      return await fn(client);
    } finally {
      this.release(client);
    }
  }
}

// 사용
const pool = new ConnectionPool(10);

const workflow = await pool.execute((client) =>
  client.getWorkflow('workflow-id')
);
```

---

## 테스팅

### Unit Tests

```typescript
// __tests__/lib/n8n/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { N8nApiClient, ApiError } from '@/lib/n8n/client';

describe('N8nApiClient', () => {
  let client: N8nApiClient;

  beforeEach(() => {
    client = new N8nApiClient({
      baseUrl: 'https://test.n8n.io/api/v1',
      apiKey: 'test-api-key',
    });
  });

  describe('getWorkflows', () => {
    it('should fetch workflows successfully', async () => {
      const mockWorkflows = [
        { id: '1', name: 'Test Workflow 1', active: true },
        { id: '2', name: 'Test Workflow 2', active: false },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockWorkflows }),
      });

      const workflows = await client.getWorkflows();

      expect(workflows).toEqual(mockWorkflows);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.n8n.io/api/v1/workflows',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-api-key',
          }),
        })
      );
    });

    it('should handle errors properly', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        }),
      });

      await expect(client.getWorkflow('invalid-id')).rejects.toThrow(ApiError);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on 503 errors', async () => {
      let attempt = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        attempt++;

        if (attempt < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({ error: { message: 'Service Unavailable' } }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: '1', name: 'Success' } }),
        });
      });

      const workflow = await client.getWorkflow('1');

      expect(attempt).toBe(3);
      expect(workflow.name).toBe('Success');
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      const client = new N8nApiClient({
        baseUrl: 'https://test.n8n.io/api/v1',
        apiKey: 'test-api-key',
        rateLimit: {
          maxRequests: 2,
          perMilliseconds: 1000,
        },
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });

      // 2개 요청은 즉시 실행
      await Promise.all([
        client.getWorkflows(),
        client.getWorkflows(),
      ]);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // 3번째 요청은 rate limit 초과로 대기
      const startTime = Date.now();
      await client.getWorkflows();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/lib/n8n/integration.test.ts
import { describe, it, expect } from 'vitest';
import { getN8nClient } from '@/lib/n8n/client';

describe('N8nApiClient Integration', () => {
  it('should create, execute, and delete workflow', async () => {
    const client = getN8nClient();

    // 1. 워크플로우 생성
    const workflow = await client.createWorkflow({
      name: 'Integration Test Workflow',
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [250, 300],
          parameters: {},
        },
      ],
      connections: {},
      active: false,
    });

    expect(workflow.id).toBeDefined();
    expect(workflow.name).toBe('Integration Test Workflow');

    // 2. 워크플로우 실행
    const execution = await client.executeWorkflow(workflow.id);

    expect(execution.id).toBeDefined();
    expect(execution.workflowId).toBe(workflow.id);

    // 3. 실행 완료 대기
    let executionStatus = await client.getExecution(execution.id);

    while (
      executionStatus.status === 'running' ||
      executionStatus.status === 'waiting'
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      executionStatus = await client.getExecution(execution.id);
    }

    expect(executionStatus.status).toBe('success');

    // 4. 워크플로우 삭제
    await client.deleteWorkflow(workflow.id);

    // 5. 삭제 확인
    await expect(client.getWorkflow(workflow.id)).rejects.toThrow();
  });
});
```

### Mock Client

```typescript
// __tests__/mocks/n8nClient.ts
import { vi } from 'vitest';

export const mockN8nClient = {
  getWorkflows: vi.fn(),
  getWorkflow: vi.fn(),
  createWorkflow: vi.fn(),
  updateWorkflow: vi.fn(),
  deleteWorkflow: vi.fn(),
  executeWorkflow: vi.fn(),
  getExecutions: vi.fn(),
  getExecution: vi.fn(),
};

// 사용
vi.mock('@/lib/n8n/client', () => ({
  getN8nClient: () => mockN8nClient,
}));

// 테스트에서
mockN8nClient.getWorkflows.mockResolvedValue([
  { id: '1', name: 'Test Workflow', active: true },
]);
```

---

## 다음 단계

- [에러 처리 가이드](./error-handling.md) - 에러 처리 패턴 상세 가이드
- [테스팅 가이드](./testing.md) - 테스트 전략과 실습
- [아키텍처 문서](./architecture.md) - 시스템 아키텍처 개요

---

## 참고 자료

- [n8n API Documentation](https://docs.n8n.io/api/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
