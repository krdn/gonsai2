# Agent Orchestration Engine - 아키텍처 문서

n8n 워크플로우 기반 AI Agent 실행 엔진의 전체 아키텍처와 사용 가이드입니다.

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [핵심 컴포넌트](#핵심-컴포넌트)
3. [사용 가이드](#사용-가이드)
4. [타입 시스템](#타입-시스템)
5. [테스트](#테스트)
6. [모니터링](#모니터링)
7. [문제 해결](#문제-해결)

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                     AgentManager                            │
│  - 워크플로우 로드 및 캐싱                                     │
│  - AI 노드 식별 (OpenAI, Claude, LangChain)                  │
│  - 파라미터 검증                                              │
│  - 실행 조정                                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ExecutionQueue (Bull)                      │
│  - Redis 기반 작업 큐                                         │
│  - 우선순위 관리 (urgent/high/normal/low)                     │
│  - 재시도 로직 (exponential backoff)                          │
│  - 동시 실행 제한                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    N8nClientService                         │
│  - n8n REST API 통합                                         │
│  - 워크플로우 실행                                            │
│  - 실행 상태 폴링                                             │
│  - 결과 파싱                                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  WebSocket Service                          │
│  - 실시간 실행 상태 브로드캐스트                              │
│  - 진행률 업데이트                                            │
│  - 클라이언트 연결 관리                                       │
└─────────────────────────────────────────────────────────────┘
```

## 핵심 컴포넌트

### 1. AgentManager

**위치**: `services/agent-manager.service.ts`

**역할**: 고수준 Agent 관리 및 실행 조정

**주요 메서드**:
- `loadWorkflows()`: 워크플로우 목록 로드
- `getWorkflow(id)`: 특정 워크플로우 조회
- `identifyAINodes(id)`: AI 노드 식별
- `validateWorkflow(id)`: 파라미터 검증
- `executeWorkflow(request)`: 비동기 실행
- `executeAndWait(request)`: 동기 실행
- `getAgentStats()`: 통계 조회

### 2. ExecutionQueue

**위치**: `services/execution-queue.service.ts`

**역할**: Bull 기반 작업 큐 관리

**우선순위 설정**:

| Priority | Bull Priority | Attempts | Backoff Strategy |
|----------|---------------|----------|------------------|
| urgent   | 1             | 5        | Exponential (2s) |
| high     | 2             | 3        | Exponential (5s) |
| normal   | 5             | 2        | Fixed (10s)      |
| low      | 10            | 1        | None             |

### 3. N8nClientService

**위치**: `services/n8n-client.service.ts`

**역할**: n8n REST API 통합

**주요 메서드**:
- `getWorkflows()`: 워크플로우 목록
- `executeWorkflow(id, data)`: 워크플로우 실행
- `getExecution(id)`: 실행 상태 조회
- `waitForExecution(id)`: 실행 완료 대기
- `getWorkflowExecutions(id)`: 실행 기록

## 사용 가이드

### 빠른 시작

```typescript
import { agentManager } from './services/agent-manager.service';

// 1. 워크플로우 로드
const workflows = await agentManager.loadWorkflows();
console.log(`Loaded ${workflows.length} workflows`);

// 2. AI 노드 식별
const aiNodes = await agentManager.identifyAINodes('workflow-123');
console.log(`Found ${aiNodes.length} AI nodes`);

// 3. 워크플로우 검증
const validation = await agentManager.validateWorkflow('workflow-123');
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// 4. 워크플로우 실행
const job = await agentManager.executeWorkflow({
  workflowId: 'workflow-123',
  mode: 'manual',
  priority: 'high',
  inputData: { query: 'Hello, AI!' },
});

console.log(`Job created: ${job.id}`);
```

### 동기 실행 (결과 대기)

```typescript
const result = await agentManager.executeAndWait({
  workflowId: 'workflow-123',
  mode: 'manual',
  priority: 'urgent',
  inputData: { query: 'Process immediately' },
  options: {
    timeout: 60000,        // 1분 타임아웃
    waitForExecution: true // 완료 대기
  },
});

console.log(`Execution ${result.executionId}: ${result.status}`);
console.log(`Duration: ${result.duration}ms`);
console.log('Output:', result.outputData);
```

### 큐 관리

```typescript
import { executionQueue } from './services/execution-queue.service';

// 큐 통계
const stats = await executionQueue.getQueueStats();
console.log(`Waiting: ${stats.waiting}, Active: ${stats.active}`);

// 작업 취소
await executionQueue.cancelJob('exec_123');

// 큐 정리
await executionQueue.cleanQueue(5000); // 5초 이상 된 작업 제거
```

## 타입 시스템

### AI 노드 타입

```typescript
type AINodeType =
  | 'n8n-nodes-base.openAi'
  | 'n8n-nodes-base.openAiChat'
  | '@n8n/n8n-nodes-langchain.chatOpenAi'
  | '@n8n/n8n-nodes-langchain.chatAnthropic';
```

### 실행 요청

```typescript
interface ExecutionRequest {
  workflowId: string;
  mode: ExecutionMode;
  priority?: ExecutionPriority;
  inputData?: Record<string, unknown>;
  options?: ExecutionOptions;
}
```

### 실행 결과

```typescript
interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  outputData?: Record<string, unknown>;
  error?: ExecutionError;
}
```

## 테스트

### 테스트 실행

```bash
# Agent Manager 통합 테스트
npm run test:agent

# 또는 직접 실행
ts-node features/agent-orchestration/tests/agent-manager.test.ts
```

### 테스트 케이스

1. 워크플로우 로딩 및 캐싱
2. AI 노드 식별
3. 파라미터 검증
4. 워크플로우 실행 (큐)
5. 동기 실행 (executeAndWait)
6. Agent 통계
7. 큐 관리
8. 캐시 관리
9. 에러 처리

## 모니터링

### 로그 확인

```bash
# 실행 큐 로그
tail -f logs/combined.log | grep "Execution queue"

# Agent Manager 로그
tail -f logs/combined.log | grep "Agent Manager"
```

### Redis 큐 모니터링

```bash
redis-cli

# 큐 통계
> INFO stats

# 큐 키 조회
> KEYS bull:workflow-executions:*

# 작업 목록
> LRANGE bull:workflow-executions:wait 0 -1
```

### MongoDB 쿼리

```javascript
// 최근 실행 기록
db.executions.find().sort({ createdAt: -1 }).limit(10)

// 실패한 실행
db.executions.find({ status: 'failed' })

// 실행 시간 통계
db.executions.aggregate([
  { $match: { status: 'success' } },
  { $group: {
    _id: '$workflowId',
    avgTime: { $avg: '$executionTime' },
    count: { $sum: 1 }
  }}
])
```

## 문제 해결

### 큐가 작동하지 않음

```bash
# Redis 연결 확인
redis-cli ping

# Bull 큐 상태 확인
redis-cli KEYS "bull:workflow-executions:*"
```

### 워크플로우 실행 실패

```bash
# n8n 연결 확인
curl http://localhost:5678/healthz

# 실행 로그 확인
db.executions.find({ status: 'failed' }).sort({ createdAt: -1 })
```

### WebSocket 연결 끊김

```bash
# WebSocket 로그
tail -f logs/combined.log | grep "WebSocket"
```

## 환경 변수

```bash
# n8n API
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-api-key

# Redis
REDIS_URL=redis://localhost:6379

# MongoDB
MONGODB_URI=mongodb://localhost:27017/gonsai2
```

## 참고 자료

- [n8n API Documentation](https://docs.n8n.io/api/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [MongoDB Node.js Driver](https://mongodb.github.io/node-mongodb-native/)
