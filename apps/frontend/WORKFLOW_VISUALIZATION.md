# 워크플로우 시각화 컴포넌트 가이드

n8n 워크플로우를 React Flow로 시각화하는 컴포넌트 사용 가이드입니다.

## 📦 설치된 패키지

```json
{
  "reactflow": "latest"
}
```

## 🎨 구현된 컴포넌트

### 1. 커스텀 노드 컴포넌트 (5개)

#### TriggerNode

- **위치**: `src/components/workflow/nodes/TriggerNode.tsx`
- **용도**: 워크플로우 트리거 노드 (웹훅, 스케줄, 이벤트 등)
- **아이콘**: ⚡ (빨간색)
- **특징**: Output Handle만 존재 (시작 노드)

#### HttpNode

- **위치**: `src/components/workflow/nodes/HttpNode.tsx`
- **용도**: HTTP 요청 노드
- **아이콘**: 🌐 (파란색)
- **특징**: HTTP 메서드와 URL 표시

#### AINode

- **위치**: `src/components/workflow/nodes/AINode.tsx`
- **용도**: AI/LLM 노드 (OpenAI, Claude 등)
- **아이콘**: 🤖 (보라색)
- **특징**: 모델명과 Temperature 표시

#### DatabaseNode

- **위치**: `src/components/workflow/nodes/DatabaseNode.tsx`
- **용도**: 데이터베이스 작업 노드 (MongoDB, PostgreSQL 등)
- **아이콘**: 🗄️ (초록색)
- **특징**: Operation, Database, Collection 표시

#### DefaultNode

- **위치**: `src/components/workflow/nodes/DefaultNode.tsx`
- **용도**: 기타 모든 노드 타입
- **아이콘**: ⚙️ (회색)
- **특징**: 범용 노드 스타일

### 2. WorkflowCanvas 컴포넌트

#### 기본 사용

```tsx
import { WorkflowCanvas } from '@/components/workflow';
import type { N8nWorkflow, WorkflowExecution } from '@/types/workflow';

function MyWorkflowPage() {
  const workflow: N8nWorkflow = {
    id: 'workflow-123',
    name: 'My Workflow',
    active: true,
    nodes: [...],
    connections: {...},
    // ...
  };

  const executionData: WorkflowExecution = {
    id: 'exec-456',
    workflowId: 'workflow-123',
    status: 'running',
    // ...
  };

  return (
    <div className="w-full h-screen">
      <WorkflowCanvas
        workflow={workflow}
        executionData={executionData}
        onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
      />
    </div>
  );
}
```

#### 주요 기능

- ✅ n8n 워크플로우 자동 변환 (React Flow 형식)
- ✅ 노드 타입별 자동 색상 및 아이콘
- ✅ 실행 상태에 따른 노드/엣지 업데이트 (성공/실패/실행중)
- ✅ 미니맵, 줌/팬 컨트롤
- ✅ 실시간 실행 상태 패널

### 3. NodeDetails 패널

#### 기본 사용

```tsx
import { NodeDetails } from '@/components/workflow';
import type { N8nNode, NodeExecutionData } from '@/types/workflow';

function MyNodeDetailsPanel() {
  const node: N8nNode = {
    id: 'node-1',
    name: 'HTTP Request',
    type: 'n8n-nodes-base.httpRequest',
    // ...
  };

  const executionData: NodeExecutionData = {
    startTime: Date.now(),
    executionTime: 1250,
    executionStatus: 'success',
    // ...
  };

  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {isOpen && (
        <NodeDetails node={node} executionData={executionData} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
```

#### 표시 정보

- ✅ 노드 이름, 타입, 아이콘
- ✅ 실행 상태 (성공/실패/실행중)
- ✅ 실행 시간
- ✅ 오류 메시지 (실패 시)
- ✅ 노드 파라미터 (모든 설정값)
- ✅ 인증 정보
- ✅ 입력 데이터 (JSON 형식)
- ✅ 노드 위치 정보
- ✅ 노트 (메모)

### 4. ExecutionFlow 컴포넌트

#### 기본 사용

```tsx
import { ExecutionFlow } from '@/components/workflow';
import type { N8nWorkflow, WorkflowExecution } from '@/types/workflow';

function MyExecutionPage() {
  const workflow: N8nWorkflow = {...};
  const execution: WorkflowExecution = {...};

  return (
    <ExecutionFlow
      workflow={workflow}
      execution={execution}
      className="max-w-4xl mx-auto"
    />
  );
}
```

#### 주요 기능

- ✅ 실행 타임라인 시각화
- ✅ 노드별 실행 순서 표시
- ✅ 각 노드의 실행 시간 표시
- ✅ 실시간 실행 상태 업데이트 (WebSocket 연동)
- ✅ 성공/실패 카운트
- ✅ 총 실행 시간 계산
- ✅ 오류 메시지 표시

### 5. WorkflowStats 컴포넌트

#### 기본 사용

```tsx
import { WorkflowStats } from '@/components/workflow';
import type { WorkflowStatistics } from '@/types/workflow';

function MyStatsPage() {
  const statistics: WorkflowStatistics = {
    workflowId: 'workflow-123',
    totalExecutions: 150,
    successfulExecutions: 142,
    failedExecutions: 8,
    successRate: 94.67,
    averageExecutionTime: 2500,
    minExecutionTime: 850,
    maxExecutionTime: 8200,
    lastExecutionAt: '2025-01-15T10:30:00Z',
    aiNodesUsed: 45,
  };

  return <WorkflowStats statistics={statistics} />;
}
```

#### 표시 정보

- ✅ 총 실행 횟수
- ✅ 평균 실행 시간
- ✅ 성공률 (백분율 + 진행 바)
- ✅ AI 노드 사용 횟수
- ✅ 최단/최장 실행 시간
- ✅ 마지막 실행 시간
- ✅ 성능 지표 (우수/양호/주의/개선 필요)

## 🛠️ 유틸리티 함수

### convertWorkflowToFlow()

```tsx
import { convertWorkflowToFlow } from '@/lib/workflow-utils';
import type { N8nWorkflow } from '@/types/workflow';

const workflow: N8nWorkflow = {...};
const { nodes, edges } = convertWorkflowToFlow(workflow);
```

n8n 워크플로우를 React Flow 형식으로 변환합니다.

### updateNodesWithExecutionStatus()

```tsx
import { updateNodesWithExecutionStatus } from '@/lib/workflow-utils';

const updatedNodes = updateNodesWithExecutionStatus(nodes, executionData);
```

실행 데이터를 기반으로 노드 스타일을 업데이트합니다.

### updateEdgesWithExecutionPath()

```tsx
import { updateEdgesWithExecutionPath } from '@/lib/workflow-utils';

const updatedEdges = updateEdgesWithExecutionPath(edges, executionData);
```

실행 경로에 따라 엣지를 하이라이트합니다.

### formatExecutionTime()

```tsx
import { formatExecutionTime } from '@/lib/workflow-utils';

formatExecutionTime(500); // "500ms"
formatExecutionTime(2500); // "2.50s"
formatExecutionTime(125000); // "2.08m"
```

밀리초를 읽기 쉬운 형식으로 변환합니다.

### getNodeIcon() / getNodeColor()

```tsx
import { getNodeIcon, getNodeColor } from '@/lib/workflow-utils';

getNodeIcon('trigger'); // "⚡"
getNodeIcon('http'); // "🌐"
getNodeIcon('ai'); // "🤖"
getNodeIcon('database'); // "🗄️"

getNodeColor('trigger'); // "#ef4444" (red)
getNodeColor('http'); // "#3b82f6" (blue)
getNodeColor('ai'); // "#8b5cf6" (purple)
getNodeColor('database'); // "#10b981" (green)
```

노드 타입별 아이콘과 색상을 반환합니다.

## 🎯 통합 예시

### 완전한 워크플로우 페이지

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WorkflowCanvas, NodeDetails, ExecutionFlow, WorkflowStats } from '@/components/workflow';
import { apiClient } from '@/lib/api-client';
import { useWorkflowStore } from '@/stores/workflow-store';

export default function WorkflowPage({ params }: { params: { id: string } }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Workflow 데이터 가져오기
  const { data: workflow } = useQuery({
    queryKey: ['workflow', params.id],
    queryFn: () => apiClient.getWorkflow(params.id),
  });

  // 통계 데이터 가져오기
  const { data: statistics } = useQuery({
    queryKey: ['workflow-stats', params.id],
    queryFn: () => apiClient.getWorkflowStatistics(params.id),
  });

  // 실행 데이터 (Zustand에서)
  const runningExecutions = useWorkflowStore((state) => state.runningExecutions);
  const latestExecution = Array.from(runningExecutions.values())[0];

  // 선택된 노드 찾기
  const selectedNode = workflow?.nodes.find((n) => n.id === selectedNodeId);
  const selectedNodeExecution = latestExecution?.data?.resultData?.runData?.[selectedNode?.name];

  if (!workflow) return <div>Loading...</div>;

  return (
    <div className="flex h-screen">
      {/* Main Canvas */}
      <div className="flex-1 relative">
        <WorkflowCanvas
          workflow={workflow}
          executionData={latestExecution}
          onNodeClick={setSelectedNodeId}
        />
      </div>

      {/* Side Panel */}
      {selectedNode && (
        <NodeDetails
          node={selectedNode}
          executionData={selectedNodeExecution?.[0]}
          onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Bottom Panels */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-4">
        {/* Execution Timeline */}
        {latestExecution && (
          <div className="flex-1">
            <ExecutionFlow workflow={workflow} execution={latestExecution} />
          </div>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="w-96">
            <WorkflowStats statistics={statistics} />
          </div>
        )}
      </div>
    </div>
  );
}
```

## 🔥 실시간 업데이트

WebSocket을 통한 실시간 업데이트는 Zustand 스토어와 자동 연동됩니다:

```tsx
// WebSocket이 자동으로 Zustand 스토어를 업데이트
// ExecutionFlow와 WorkflowCanvas가 자동으로 리렌더링됨

import { useWorkflowStore } from '@/stores/workflow-store';

function MyComponent() {
  // 실시간 실행 데이터 구독
  const runningExecutions = useWorkflowStore((state) => state.runningExecutions);

  // WebSocket 메시지가 오면 자동으로 업데이트됨
  // execution.started, execution.progress, execution.finished 이벤트
}
```

## 📊 타입 정의

모든 타입은 `src/types/workflow.ts`에 정의되어 있습니다:

```typescript
// 주요 타입들
export interface N8nWorkflow { ... }
export interface N8nNode { ... }
export interface WorkflowExecution { ... }
export interface NodeExecutionData { ... }
export interface WorkflowStatistics { ... }
export interface ExecutionError { ... }
```

## ✨ 스타일링

모든 컴포넌트는 Tailwind CSS를 사용하며, 실행 상태에 따라 자동으로 색상이 변경됩니다:

- **성공**: 초록색 (`bg-green-100`, `border-green-500`, `text-green-600`)
- **실패**: 빨간색 (`bg-red-100`, `border-red-500`, `text-red-600`)
- **실행 중**: 파란색 + 애니메이션 (`bg-blue-100`, `animate-pulse`)

## 🎨 커스터마이징

### 커스텀 노드 타입 추가

```tsx
// 1. 새 노드 컴포넌트 생성
// src/components/workflow/nodes/CustomNode.tsx
export function CustomNode({ data }: NodeProps<CustomNodeData>) {
  return <div className="...">{/* 커스텀 UI */}</div>;
}

// 2. nodeTypes에 등록
// src/components/workflow/nodes/index.ts
export const nodeTypes = {
  trigger: TriggerNode,
  http: HttpNode,
  custom: CustomNode, // 추가
  // ...
};

// 3. getNodeType() 함수 수정
// src/lib/workflow-utils.ts
function getNodeType(n8nType: string): string {
  if (n8nType.includes('custom')) return 'custom';
  // ...
}
```

### 커스텀 스타일 적용

```tsx
<WorkflowCanvas workflow={workflow} className="border-2 border-blue-500 rounded-xl shadow-2xl" />
```

## 🐛 트러블슈팅

### React Flow 렌더링 문제

```tsx
// 컨테이너에 명시적 높이 설정 필요
<div className="h-screen">
  <WorkflowCanvas workflow={workflow} />
</div>
```

### WebSocket 연결 문제

```tsx
// .env.local 설정 확인
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### 타입 오류

```bash
# 타입 체크 실행
npm run type-check
```

## 📚 참고 자료

- [React Flow 문서](https://reactflow.dev/)
- [n8n API 문서](https://docs.n8n.io/api/)
- [Zustand 문서](https://zustand-demo.pmnd.rs/)
- [TanStack Query 문서](https://tanstack.com/query/latest)
