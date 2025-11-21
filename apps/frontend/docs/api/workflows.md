---
sidebar_position: 3
title: 워크플로우 API
---

# 워크플로우 API

워크플로우 생성, 조회, 수정, 삭제 및 실행을 위한 API입니다.

## 엔드포인트 목록

| 메서드 | 엔드포인트                         | 설명                 |
| ------ | ---------------------------------- | -------------------- |
| GET    | `/api/v1/workflows`                | 워크플로우 목록 조회 |
| GET    | `/api/v1/workflows/:id`            | 워크플로우 상세 조회 |
| POST   | `/api/v1/workflows`                | 워크플로우 생성      |
| PUT    | `/api/v1/workflows/:id`            | 워크플로우 수정      |
| DELETE | `/api/v1/workflows/:id`            | 워크플로우 삭제      |
| POST   | `/api/v1/workflows/:id/execute`    | 워크플로우 실행      |
| POST   | `/api/v1/workflows/:id/activate`   | 워크플로우 활성화    |
| POST   | `/api/v1/workflows/:id/deactivate` | 워크플로우 비활성화  |

## 워크플로우 데이터 구조

### Workflow 객체

```typescript
interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: WorkflowSettings;
  staticData?: any;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
}

interface WorkflowConnections {
  [nodeId: string]: {
    main?: NodeConnection[][];
  };
}

interface NodeConnection {
  node: string;
  type: string;
  index: number;
}
```

## API 상세

### 1. 워크플로우 목록 조회

모든 워크플로우를 조회합니다.

```http
GET /api/v1/workflows
```

**쿼리 파라미터:**

| 파라미터 | 타입    | 설명                  | 기본값 |
| -------- | ------- | --------------------- | ------ |
| `active` | boolean | 활성 상태 필터        | -      |
| `tags`   | string  | 태그 필터 (쉼표 구분) | -      |

**요청 예시:**

```bash
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/workflows?active=true"
```

**응답 예시:**

```json
{
  "data": [
    {
      "id": "1",
      "name": "My First Workflow",
      "active": true,
      "nodes": [...],
      "connections": {...},
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**TypeScript 클라이언트:**

```typescript
const workflows = await n8nClient.getWorkflows();

// 활성 워크플로우만 조회
const activeWorkflows = workflows.filter((w) => w.active);
```

### 2. 워크플로우 상세 조회

특정 워크플로우의 상세 정보를 조회합니다.

```http
GET /api/v1/workflows/:id
```

**경로 파라미터:**

| 파라미터 | 타입   | 설명          |
| -------- | ------ | ------------- |
| `id`     | string | 워크플로우 ID |

**요청 예시:**

```bash
curl -X GET \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/workflows/1"
```

**응답 예시:**

```json
{
  "data": {
    "id": "1",
    "name": "My First Workflow",
    "active": true,
    "nodes": [
      {
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [250, 300],
        "parameters": {}
      },
      {
        "id": "http",
        "name": "HTTP Request",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 1,
        "position": [450, 300],
        "parameters": {
          "url": "https://api.example.com/data",
          "method": "GET"
        }
      }
    ],
    "connections": {
      "start": {
        "main": [[{ "node": "http", "type": "main", "index": 0 }]]
      }
    },
    "settings": {
      "executionTimeout": 300,
      "saveDataSuccessExecution": "all"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**TypeScript 클라이언트:**

```typescript
const workflow = await n8nClient.getWorkflow('1');
console.log(`Workflow: ${workflow.name}`);
console.log(`Nodes: ${workflow.nodes.length}`);
```

### 3. 워크플로우 생성

새로운 워크플로우를 생성합니다.

```http
POST /api/v1/workflows
```

**요청 본문:**

```json
{
  "name": "New Workflow",
  "active": false,
  "nodes": [
    {
      "id": "start",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": {}
    }
  ],
  "connections": {}
}
```

**요청 예시:**

```bash
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Workflow",
    "active": false,
    "nodes": [
      {
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [250, 300],
        "parameters": {}
      }
    ],
    "connections": {}
  }' \
  "http://localhost:5678/api/v1/workflows"
```

**응답 예시:**

```json
{
  "data": {
    "id": "2",
    "name": "New Workflow",
    "active": false,
    "nodes": [...],
    "connections": {},
    "createdAt": "2024-01-02T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

**TypeScript 클라이언트:**

```typescript
const newWorkflow = {
  name: 'My API Workflow',
  active: false,
  nodes: [
    {
      id: 'start',
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [250, 300],
      parameters: {},
    },
    {
      id: 'http',
      name: 'Fetch Data',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: [450, 300],
      parameters: {
        url: 'https://api.example.com/data',
        method: 'GET',
      },
    },
  ],
  connections: {
    start: {
      main: [[{ node: 'http', type: 'main', index: 0 }]],
    },
  },
};

const created = await n8nClient.createWorkflow(newWorkflow);
console.log(`Created workflow: ${created.id}`);
```

### 4. 워크플로우 수정

기존 워크플로우를 수정합니다.

```http
PUT /api/v1/workflows/:id
```

**경로 파라미터:**

| 파라미터 | 타입   | 설명          |
| -------- | ------ | ------------- |
| `id`     | string | 워크플로우 ID |

**요청 본문:**

```json
{
  "name": "Updated Workflow Name",
  "active": true,
  "nodes": [...],
  "connections": {...}
}
```

**요청 예시:**

```bash
curl -X PUT \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Workflow",
    "active": true
  }' \
  "http://localhost:5678/api/v1/workflows/1"
```

**TypeScript 클라이언트:**

```typescript
const updated = await n8nClient.updateWorkflow('1', {
  name: 'Updated Name',
  active: true,
});
```

### 5. 워크플로우 삭제

워크플로우를 삭제합니다.

```http
DELETE /api/v1/workflows/:id
```

**경로 파라미터:**

| 파라미터 | 타입   | 설명          |
| -------- | ------ | ------------- |
| `id`     | string | 워크플로우 ID |

**요청 예시:**

```bash
curl -X DELETE \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/workflows/1"
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
await n8nClient.deleteWorkflow('1');
console.log('Workflow deleted successfully');
```

### 6. 워크플로우 실행

워크플로우를 즉시 실행합니다.

```http
POST /api/v1/workflows/:id/execute
```

**경로 파라미터:**

| 파라미터 | 타입   | 설명          |
| -------- | ------ | ------------- |
| `id`     | string | 워크플로우 ID |

**요청 본문 (선택):**

```json
{
  "data": {
    "customInput": "value"
  }
}
```

**요청 예시:**

```bash
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  -H "Content-Type: application/json" \
  "http://localhost:5678/api/v1/workflows/1/execute"
```

**응답 예시:**

```json
{
  "data": {
    "executionId": "exec-123",
    "status": "running"
  }
}
```

**TypeScript 클라이언트:**

```typescript
// 기본 실행
const execution = await n8nClient.executeWorkflow('1');
console.log(`Execution ID: ${execution.executionId}`);

// 커스텀 데이터와 함께 실행
const executionWithData = await n8nClient.executeWorkflow('1', {
  data: { userId: 123, action: 'process' },
});
```

### 7. 워크플로우 활성화

워크플로우를 활성화합니다.

```http
POST /api/v1/workflows/:id/activate
```

**요청 예시:**

```bash
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/workflows/1/activate"
```

**TypeScript 클라이언트:**

```typescript
await n8nClient.activateWorkflow('1');
```

### 8. 워크플로우 비활성화

워크플로우를 비활성화합니다.

```http
POST /api/v1/workflows/:id/deactivate
```

**요청 예시:**

```bash
curl -X POST \
  -H "X-N8N-API-KEY: your-api-key" \
  "http://localhost:5678/api/v1/workflows/1/deactivate"
```

**TypeScript 클라이언트:**

```typescript
await n8nClient.deactivateWorkflow('1');
```

## React Hook 예제

### 워크플로우 목록 조회

```typescript
import { useQuery } from '@tanstack/react-query';
import { n8nClient } from '@/lib/n8n/client';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => n8nClient.getWorkflows(),
    staleTime: 30000, // 30초
  });
}

// 컴포넌트에서 사용
function WorkflowList() {
  const { data: workflows, isLoading, error } = useWorkflows();

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error.message}</div>;

  return (
    <ul>
      {workflows?.map(workflow => (
        <li key={workflow.id}>{workflow.name}</li>
      ))}
    </ul>
  );
}
```

### 워크플로우 생성

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { n8nClient } from '@/lib/n8n/client';

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflow: CreateWorkflowDto) =>
      n8nClient.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
}

// 컴포넌트에서 사용
function CreateWorkflowForm() {
  const createWorkflow = useCreateWorkflow();

  const handleSubmit = async (data: CreateWorkflowDto) => {
    try {
      const result = await createWorkflow.mutateAsync(data);
      toast.success(`워크플로우 생성됨: ${result.id}`);
    } catch (error) {
      toast.error('생성 실패');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 워크플로우 실행

```typescript
import { useMutation } from '@tanstack/react-query';
import { n8nClient } from '@/lib/n8n/client';

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) =>
      n8nClient.executeWorkflow(id, data),
  });
}

// 컴포넌트에서 사용
function ExecuteButton({ workflowId }: { workflowId: string }) {
  const execute = useExecuteWorkflow();

  const handleClick = async () => {
    try {
      const result = await execute.mutateAsync({ id: workflowId });
      toast.success(`실행 시작: ${result.executionId}`);
    } catch (error) {
      toast.error('실행 실패');
    }
  };

  return (
    <Button onClick={handleClick} disabled={execute.isPending}>
      {execute.isPending ? '실행 중...' : '실행'}
    </Button>
  );
}
```

## 워크플로우 복사

```typescript
async function duplicateWorkflow(workflowId: string): Promise<Workflow> {
  // 원본 워크플로우 조회
  const original = await n8nClient.getWorkflow(workflowId);

  // 새 워크플로우 데이터 준비
  const duplicate = {
    ...original,
    id: undefined, // ID 제거
    name: `${original.name} (Copy)`,
    active: false, // 복사본은 비활성 상태로
  };

  // 새 워크플로우 생성
  return await n8nClient.createWorkflow(duplicate);
}
```

## 워크플로우 검증

```typescript
function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: string[] = [];

  // 이름 검증
  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push('워크플로우 이름은 필수입니다');
  }

  // 노드 검증
  if (!workflow.nodes || workflow.nodes.length === 0) {
    errors.push('최소 1개의 노드가 필요합니다');
  }

  // Start 노드 검증
  const hasStartNode = workflow.nodes.some((node) => node.type === 'n8n-nodes-base.start');
  if (!hasStartNode) {
    errors.push('Start 노드가 필요합니다');
  }

  // 연결 검증
  const nodeIds = new Set(workflow.nodes.map((n) => n.id));
  for (const [sourceId, connections] of Object.entries(workflow.connections)) {
    if (!nodeIds.has(sourceId)) {
      errors.push(`존재하지 않는 노드 ID: ${sourceId}`);
    }

    if (connections.main) {
      for (const connectionList of connections.main) {
        for (const conn of connectionList) {
          if (!nodeIds.has(conn.node)) {
            errors.push(`존재하지 않는 타겟 노드: ${conn.node}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## 에러 처리

### 일반적인 에러

**404 Not Found:**

```json
{
  "code": "WORKFLOW_NOT_FOUND",
  "message": "Workflow with ID '123' not found"
}
```

**400 Bad Request:**

```json
{
  "code": "INVALID_WORKFLOW",
  "message": "Invalid workflow structure",
  "details": {
    "errors": ["At least one node is required", "Start node is missing"]
  }
}
```

**409 Conflict:**

```json
{
  "code": "WORKFLOW_NAME_EXISTS",
  "message": "Workflow with name 'My Workflow' already exists"
}
```

## 다음 단계

1. [실행 API](./executions) - 워크플로우 실행 조회 및 관리
2. [Webhook API](./webhooks) - Webhook 설정 및 사용
3. [n8n 통합 가이드](/n8n-integration/workflow-creation) - 워크플로우 작성 가이드

## 참고 자료

- [n8n 워크플로우 API](https://docs.n8n.io/api/workflows/)
- [n8n 노드 타입](https://docs.n8n.io/integrations/)
- [워크플로우 베스트 프랙티스](/n8n-integration/best-practices)
