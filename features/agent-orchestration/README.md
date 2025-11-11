# Agent Orchestration Module

> AI Agent task management and execution orchestration

이 모듈은 여러 AI Agent 작업을 조율하고 관리합니다.

## 주요 기능

- **Task Queue**: 우선순위 기반 작업 큐
- **Agent Manager**: Agent 생명주기 관리
- **Result Processing**: 실행 결과 처리 및 저장

## 사용 예시

\`\`\`typescript
import { AgentManager, ExecutionQueue } from './agent-orchestration';

const manager = new AgentManager();
const queue = new ExecutionQueue();

// Create task
const task = await manager.createTask('workflow-id', { input: 'data' });

// Add to queue
queue.enqueue(task);
\`\`\`
