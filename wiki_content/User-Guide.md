# 사용자 가이드 (User Guide)

gonsai2 애플리케이션을 실행하고 주요 기능을 사용하는 방법입니다.

## 애플리케이션 실행

### 개발 모드 (Development Mode)

소스 코드가 변경되면 자동으로 서버가 재시작되는 모드입니다.

```bash
npm run server:dev
```

### 프로덕션 모드 (Production Mode)

실제 운영 환경과 동일하게 실행합니다.

```bash
npm run server
```

## n8n 워크플로우 사용

gonsai2는 n8n의 강력한 워크플로우 자동화 기능을 활용합니다.

### 워크플로우 실행

`N8nClient`를 사용하여 워크플로우를 프로그래밍 방식으로 실행할 수 있습니다.

```typescript
import { N8nClient } from '@gonsai2/n8n-client';

const client = new N8nClient({
  baseUrl: process.env.N8N_BASE_URL,
  apiKey: process.env.N8N_API_KEY,
});

// 워크플로우 실행
const execution = await client.workflows.execute('workflow-id', {
  inputData: { key: 'value' },
});
```

### 워크플로우 모니터링

실행된 워크플로우의 상태를 확인하고 결과를 조회할 수 있습니다.

```typescript
const status = await client.executions.getStatus(execution.id);
console.log(`Status: ${status}`); // 'running', 'success', 'error'
```

## AI Agent Orchestration

여러 AI Agent 작업을 조율하고 관리하는 기능입니다.

### Agent 작업 생성

`AgentManager`를 통해 새로운 작업을 큐에 등록합니다.

```typescript
import { AgentManager } from './features/agent-orchestration';

const manager = new AgentManager();

// 우선순위가 높은 작업 생성
const task = await manager.createTask('agent-workflow-id', {
  prompt: '데이터 분석해줘',
  priority: 'high',
});
```

### 작업 상태 확인

작업 큐에서 현재 처리 상태를 확인할 수 있습니다.

```typescript
const taskStatus = await manager.getTaskStatus(task.id);
```

## 모니터링 및 로그

### 로그 확인

애플리케이션 로그는 `logs/` 디렉토리에 저장됩니다.

- `logs/error.log`: 에러 로그
- `logs/combined.log`: 전체 로그

### Health Check

서버가 정상적으로 동작 중인지 확인하려면 다음 API를 호출하세요.

```bash
curl http://localhost:3000/health
```
