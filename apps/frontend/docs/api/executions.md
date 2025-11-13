---
sidebar_position: 4
title: 실행 API
---

# 실행 API

워크플로우 실행 이력 조회, 관리 및 재시도를 위한 API입니다.

## 엔드포인트 목록

| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/v1/executions` | 실행 목록 조회 |
| GET | `/api/v1/executions/:id` | 실행 상세 조회 |
| DELETE | `/api/v1/executions/:id` | 실행 이력 삭제 |
| POST | `/api/v1/executions/:id/retry` | 실패한 실행 재시도 |

## 실행 데이터 구조

### Execution 객체

```typescript
interface Execution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  data?: ExecutionData;
  error?: ExecutionError;
}

type ExecutionStatus =
  | 'new'
  | 'running'
  | 'success'
  | 'error'
  | 'waiting'
  | 'canceled'
  | 'crashed'
  | 'unknown';

type ExecutionMode = 'manual' | 'trigger' | 'webhook' | 'retry';

interface ExecutionData {
  startData?: any;
  resultData?: {
    runData: Record<string, NodeRunData[]>;
    lastNodeExecuted?: string;
  };
}

interface ExecutionError {
  message: string;
  node?: string;
  stack?: string;
}
```

## API 상세

### 1. 실행 목록 조회

모든 실행 이력을 조회합니다.

```http
GET /api/v1/executions
```

**쿼리 파라미터:**

| 파라미터 | 타입 | 설명 | 기본값 |
|---------|------|------|--------|
| `workflowId` | string | 워크플로우 ID 필터 | - |
| `status` | string | 상태 필터 (success, error 등) | - |
| `limit` | number | 반환할 최대 개수 | 20 |
| `cursor` | string | 페이지네이션 커서 | - |

**요청 예시:**

```bash
# 모든 실행 조회
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions"

# 특정 워크플로우의 실행만 조회
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions?workflowId=1"

# 실패한 실행만 조회
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions?status=error"
```

**응답 예시:**

```json
{
  "data": {
    "results": [
      {
        "id": "exec-123",
        "workflowId": "1",
        "workflowName": "My Workflow",
        "status": "success",
        "mode": "manual",
        "startedAt": "2024-01-01T10:00:00Z",
        "stoppedAt": "2024-01-01T10:00:05Z",
        "finished": true
      },
      {
        "id": "exec-124",
        "workflowId": "1",
        "workflowName": "My Workflow",
        "status": "error",
        "mode": "manual",
        "startedAt": "2024-01-01T11:00:00Z",
        "stoppedAt": "2024-01-01T11:00:03Z",
        "finished": true,
        "error": {
          "message": "Connection timeout",
          "node": "HTTP Request"
        }
      }
    ],
    "nextCursor": "cursor-abc123"
  }
}
```

**TypeScript 클라이언트:**

```typescript
// 모든 실행 조회
const executions = await n8nClient.getExecutions();

// 특정 워크플로우의 실행 조회
const workflowExecutions = await n8nClient.getExecutions({
  workflowId: '1',
});

// 실패한 실행만 조회
const failedExecutions = await n8nClient.getExecutions({
  status: 'error',
  limit: 50,
});
```

### 2. 실행 상세 조회

특정 실행의 상세 정보를 조회합니다.

```http
GET /api/v1/executions/:id
```

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `id` | string | 실행 ID |

**요청 예시:**

```bash
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions/exec-123"
```

**응답 예시:**

```json
{
  "data": {
    "id": "exec-123",
    "workflowId": "1",
    "workflowName": "My Workflow",
    "status": "success",
    "mode": "manual",
    "startedAt": "2024-01-01T10:00:00Z",
    "stoppedAt": "2024-01-01T10:00:05Z",
    "finished": true,
    "data": {
      "resultData": {
        "runData": {
          "Start": [
            {
              "startTime": 1704103200000,
              "executionTime": 1,
              "data": {
                "main": [[{ "json": {} }]]
              }
            }
          ],
          "HTTP Request": [
            {
              "startTime": 1704103201000,
              "executionTime": 1523,
              "data": {
                "main": [[{ "json": { "userId": 1, "title": "Test" } }]]
              }
            }
          ]
        },
        "lastNodeExecuted": "HTTP Request"
      }
    }
  }
}
```

**TypeScript 클라이언트:**

```typescript
const execution = await n8nClient.getExecution('exec-123');

console.log(`Status: ${execution.status}`);
console.log(`Duration: ${
  new Date(execution.stoppedAt!) - new Date(execution.startedAt)
}ms`);

// 각 노드의 실행 결과 확인
if (execution.data?.resultData?.runData) {
  for (const [nodeName, runs] of Object.entries(
    execution.data.resultData.runData
  )) {
    console.log(`${nodeName}: ${runs[0].executionTime}ms`);
  }
}
```

### 3. 실행 삭제

실행 이력을 삭제합니다.

```http
DELETE /api/v1/executions/:id
```

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `id` | string | 실행 ID |

**요청 예시:**

```bash
curl -X DELETE \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions/exec-123"
```

**응답 예시:**

```json
{
  "data": {
    "success": true
  }
}
```

**TypeScript 클라이언트:**

```typescript
await n8nClient.deleteExecution('exec-123');
console.log('Execution deleted');
```

### 4. 실패한 실행 재시도

실패한 워크플로우 실행을 재시도합니다.

```http
POST /api/v1/executions/:id/retry
```

**경로 파라미터:**

| 파라미터 | 타입 | 설명 |
|---------|------|------|
| `id` | string | 재시도할 실행 ID |

**요청 예시:**

```bash
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/executions/exec-124/retry"
```

**응답 예시:**

```json
{
  "data": {
    "executionId": "exec-125",
    "status": "running",
    "retryOf": "exec-124"
  }
}
```

**TypeScript 클라이언트:**

```typescript
const retry = await n8nClient.retryExecution('exec-124');
console.log(`Retry execution started: ${retry.executionId}`);
```

## React Hook 예제

### 실행 목록 조회

```typescript
import { useQuery } from '@tanstack/react-query';
import { n8nClient } from '@/lib/n8n/client';

export function useExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['executions', workflowId],
    queryFn: () => n8nClient.getExecutions({ workflowId }),
    refetchInterval: 5000, // 5초마다 자동 갱신
  });
}

// 컴포넌트에서 사용
function ExecutionList({ workflowId }: { workflowId: string }) {
  const { data, isLoading } = useExecutions(workflowId);

  if (isLoading) return <div>로딩 중...</div>;

  return (
    <ul>
      {data?.results.map(execution => (
        <li key={execution.id}>
          <ExecutionStatusBadge status={execution.status} />
          <span>{execution.startedAt}</span>
        </li>
      ))}
    </ul>
  );
}
```

### 실행 상세 조회

```typescript
export function useExecution(executionId: string) {
  return useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => n8nClient.getExecution(executionId),
    enabled: !!executionId,
  });
}

// 컴포넌트에서 사용
function ExecutionDetail({ executionId }: { executionId: string }) {
  const { data: execution } = useExecution(executionId);

  if (!execution) return null;

  return (
    <div>
      <h2>실행 상세</h2>
      <p>상태: {execution.status}</p>
      <p>시작: {new Date(execution.startedAt).toLocaleString()}</p>
      {execution.stoppedAt && (
        <p>종료: {new Date(execution.stoppedAt).toLocaleString()}</p>
      )}
      {execution.error && (
        <div className="error">
          <p>에러: {execution.error.message}</p>
          {execution.error.node && <p>노드: {execution.error.node}</p>}
        </div>
      )}
    </div>
  );
}
```

### 실행 재시도

```typescript
export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (executionId: string) => n8nClient.retryExecution(executionId),
    onSuccess: (data, variables) => {
      // 실행 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['executions'] });

      // 원래 실행 ID의 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['execution', variables] });

      toast.success(`재시도 시작: ${data.executionId}`);
    },
  });
}

// 컴포넌트에서 사용
function RetryButton({ executionId }: { executionId: string }) {
  const retry = useRetryExecution();

  const handleRetry = () => {
    retry.mutate(executionId);
  };

  return (
    <Button onClick={handleRetry} disabled={retry.isPending}>
      {retry.isPending ? '재시도 중...' : '재시도'}
    </Button>
  );
}
```

## 실행 통계 계산

```typescript
interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  running: number;
  successRate: number;
  averageDuration: number;
}

function calculateExecutionStats(executions: Execution[]): ExecutionStats {
  const total = executions.length;
  const success = executions.filter(e => e.status === 'success').length;
  const error = executions.filter(e => e.status === 'error').length;
  const running = executions.filter(e => e.status === 'running').length;

  const successRate = total > 0 ? (success / total) * 100 : 0;

  const durations = executions
    .filter(e => e.stoppedAt && e.startedAt)
    .map(
      e =>
        new Date(e.stoppedAt!).getTime() - new Date(e.startedAt).getTime()
    );

  const averageDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  return {
    total,
    success,
    error,
    running,
    successRate,
    averageDuration,
  };
}

// 사용 예시
function ExecutionStats({ workflowId }: { workflowId: string }) {
  const { data } = useExecutions(workflowId);

  if (!data) return null;

  const stats = calculateExecutionStats(data.results);

  return (
    <div className="grid grid-cols-4 gap-4">
      <Stat label="총 실행" value={stats.total} />
      <Stat label="성공" value={stats.success} color="green" />
      <Stat label="실패" value={stats.error} color="red" />
      <Stat label="성공률" value={`${stats.successRate.toFixed(1)}%`} />
      <Stat
        label="평균 실행 시간"
        value={`${(stats.averageDuration / 1000).toFixed(2)}s`}
      />
    </div>
  );
}
```

## 실시간 실행 모니터링

### 폴링 방식

```typescript
export function useExecutionStatus(executionId: string) {
  return useQuery({
    queryKey: ['execution', executionId],
    queryFn: () => n8nClient.getExecution(executionId),
    refetchInterval: (query) => {
      const execution = query.state.data;

      // 실행 중이면 2초마다 폴링
      if (execution?.status === 'running' || execution?.status === 'waiting') {
        return 2000;
      }

      // 완료되면 폴링 중지
      return false;
    },
  });
}

// 컴포넌트에서 사용
function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { data: execution } = useExecutionStatus(executionId);

  useEffect(() => {
    if (execution?.status === 'success') {
      toast.success('워크플로우 실행 완료!');
    } else if (execution?.status === 'error') {
      toast.error(`실행 실패: ${execution.error?.message}`);
    }
  }, [execution?.status]);

  return (
    <div>
      <StatusIndicator status={execution?.status} />
      {execution?.status === 'running' && <ProgressBar />}
    </div>
  );
}
```

### WebSocket 방식

```typescript
export function useExecutionWebSocket(executionId: string) {
  const [status, setStatus] = useState<ExecutionStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_N8N_WEBSOCKET_URL}/execution/${executionId}`
    );

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'executionStatus') {
        setStatus(data.status);

        if (data.status === 'error') {
          setError(data.error?.message || 'Unknown error');
        }
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, [executionId]);

  return { status, error };
}
```

## 실행 필터링 및 정렬

```typescript
interface ExecutionFilters {
  workflowId?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  endDate?: Date;
  mode?: ExecutionMode;
}

function filterExecutions(
  executions: Execution[],
  filters: ExecutionFilters
): Execution[] {
  return executions.filter(execution => {
    if (filters.workflowId && execution.workflowId !== filters.workflowId) {
      return false;
    }

    if (filters.status && execution.status !== filters.status) {
      return false;
    }

    if (filters.mode && execution.mode !== filters.mode) {
      return false;
    }

    const startedAt = new Date(execution.startedAt);

    if (filters.startDate && startedAt < filters.startDate) {
      return false;
    }

    if (filters.endDate && startedAt > filters.endDate) {
      return false;
    }

    return true;
  });
}

function sortExecutions(
  executions: Execution[],
  sortBy: 'startedAt' | 'duration' | 'status',
  order: 'asc' | 'desc'
): Execution[] {
  return [...executions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'startedAt':
        comparison =
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        break;

      case 'duration':
        const aDuration = a.stoppedAt
          ? new Date(a.stoppedAt).getTime() - new Date(a.startedAt).getTime()
          : 0;
        const bDuration = b.stoppedAt
          ? new Date(b.stoppedAt).getTime() - new Date(b.startedAt).getTime()
          : 0;
        comparison = aDuration - bDuration;
        break;

      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return order === 'asc' ? comparison : -comparison;
  });
}
```

## 실행 데이터 내보내기

```typescript
async function exportExecutions(
  workflowId: string,
  format: 'json' | 'csv'
): Promise<Blob> {
  const executions = await n8nClient.getExecutions({
    workflowId,
    limit: 1000,
  });

  if (format === 'json') {
    const json = JSON.stringify(executions, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  // CSV 형식
  const headers = ['ID', 'Status', 'Started At', 'Stopped At', 'Duration'];
  const rows = executions.results.map(execution => {
    const duration = execution.stoppedAt
      ? new Date(execution.stoppedAt).getTime() -
        new Date(execution.startedAt).getTime()
      : 0;

    return [
      execution.id,
      execution.status,
      execution.startedAt,
      execution.stoppedAt || '',
      `${duration}ms`,
    ];
  });

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

  return new Blob([csv], { type: 'text/csv' });
}

// 사용 예시
async function handleExport(workflowId: string, format: 'json' | 'csv') {
  const blob = await exportExecutions(workflowId, format);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `executions-${workflowId}.${format}`;
  a.click();

  URL.revokeObjectURL(url);
}
```

## 에러 처리

### 일반적인 에러

**404 Not Found:**
```json
{
  "code": "EXECUTION_NOT_FOUND",
  "message": "Execution with ID 'exec-123' not found"
}
```

**400 Bad Request:**
```json
{
  "code": "CANNOT_RETRY_SUCCESS",
  "message": "Cannot retry successful execution"
}
```

## 다음 단계

1. [Webhook API](./webhooks) - Webhook 설정 및 사용
2. [에러 코드](./error-codes) - 전체 에러 코드 목록
3. [모니터링 가이드](/operations/monitoring) - 실행 모니터링 설정

## 참고 자료

- [n8n 실행 API](https://docs.n8n.io/api/executions/)
- [워크플로우 디버깅](/n8n-integration/debugging)
- [성능 최적화](/n8n-integration/performance-optimization)
