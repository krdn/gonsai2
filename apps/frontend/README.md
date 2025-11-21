# Gonsai2 Frontend - n8n Workflow Management

Next.js 15 기반 n8n 워크플로우 관리 프론트엔드 애플리케이션입니다.

## 🚀 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript 5.7+
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **상태 관리**: Zustand 5
- **데이터 페칭**: TanStack Query 5
- **실시간 통신**: WebSocket (ws)
- **패키지 관리**: npm

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard Layout Group
│   │   ├── workflows/            # 워크플로우 관리
│   │   ├── executions/           # 실행 내역
│   │   ├── agents/               # AI Agent 설정
│   │   └── monitoring/           # 실시간 모니터링
│   ├── api/                      # API Routes
│   ├── webhooks/                 # n8n Webhook 수신
│   ├── layout.tsx                # Root Layout
│   ├── page.tsx                  # Homepage
│   ├── providers.tsx             # Global Providers
│   └── globals.css               # Global Styles
│
├── components/                   # UI Components
│   ├── workflow/                 # Workflow 관련 컴포넌트
│   │   ├── WorkflowList.tsx
│   │   ├── WorkflowExecutor.tsx
│   │   └── NodeVisualizer.tsx
│   ├── execution/                # Execution 관련 컴포넌트
│   │   └── ExecutionMonitor.tsx
│   └── ui/                       # shadcn/ui Components
│
├── lib/                          # Utilities & Config
│   ├── api-client.ts             # Backend API Client
│   ├── websocket.ts              # WebSocket Client
│   ├── query-client.ts           # TanStack Query Config
│   └── utils.ts                  # Helper Functions
│
├── hooks/                        # Custom React Hooks
│   ├── useWorkflows.ts
│   ├── useExecutions.ts
│   └── useWebSocket.ts
│
├── stores/                       # Zustand Stores
│   └── workflow-store.ts         # Workflow State Management
│
└── types/                        # TypeScript Types
    └── workflow.ts               # n8n Workflow Types
```

## 🔧 설치 및 실행

### 1. 의존성 설치

```bash
cd apps/frontend
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 내용:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000

# WebSocket
NEXT_PUBLIC_WS_URL=ws://localhost:4000

# n8n (선택사항)
NEXT_PUBLIC_N8N_URL=http://localhost:5678
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. 프로덕션 빌드

```bash
npm run build
npm start
```

## 🎯 주요 기능

### 1. 워크플로우 관리

- **목록 조회**: 모든 n8n 워크플로우 표시
- **상세 보기**: 워크플로우 정의 및 노드 구조 확인
- **활성화/비활성화**: 워크플로우 상태 토글
- **실행**: 수동 워크플로우 실행
- **생성/수정/삭제**: CRUD 작업

### 2. 실행 모니터링

- **실시간 상태**: WebSocket을 통한 실행 상태 업데이트
- **실행 내역**: 과거 실행 기록 조회
- **실행 재시도**: 실패한 실행 재시도
- **로그 확인**: 노드별 실행 로그 및 에러 메시지

### 3. 노드 시각화

- **플로우 차트**: 워크플로우 노드 그래프 시각화
- **노드 상세**: 각 노드의 설정 및 데이터 확인
- **연결 관계**: 노드 간 연결 구조 표시

### 4. AI Agent 설정

- **Agent 목록**: 등록된 AI Agent 조회
- **Agent 생성**: 새로운 Agent 추가
- **Agent 설정**: Agent 파라미터 구성

### 5. 대시보드

- **실시간 통계**: 워크플로우 실행 통계
- **시스템 헬스**: n8n, Redis, MongoDB 상태
- **알림**: 시스템 알림 및 경고

## 📦 상태 관리

### Zustand Store

**워크플로우 스토어** (`stores/workflow-store.ts`):

```typescript
// 사용 예시
import { useWorkflowStore, useSelectedWorkflow } from '@/stores/workflow-store';

function MyComponent() {
  const workflows = useWorkflowStore((state) => state.workflows);
  const selectedWorkflow = useSelectedWorkflow();
  const selectWorkflow = useWorkflowStore((state) => state.selectWorkflow);

  return (
    <div onClick={() => selectWorkflow('workflow-id')}>
      {selectedWorkflow?.name}
    </div>
  );
}
```

**주요 상태**:

- `connected`: n8n 연결 상태
- `workflows`: 워크플로우 캐시 (Map)
- `selectedWorkflowId`: 선택된 워크플로우 ID
- `runningExecutions`: 실행 중인 작업 (Map)
- `realtimeEnabled`: 실시간 업데이트 활성화

## 🔌 API 통신

### TanStack Query

**사용 예시**:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

function WorkflowList() {
  // 데이터 조회
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.getWorkflows(),
  });

  // 데이터 변경
  const activateMutation = useMutation({
    mutationFn: (id: string) => apiClient.activateWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  return <div>...</div>;
}
```

### WebSocket Client

**사용 예시**:

```typescript
import { useEffect } from 'react';
import { getWebSocketClient } from '@/lib/websocket';

function ExecutionMonitor() {
  useEffect(() => {
    const wsClient = getWebSocketClient();

    // 이벤트 리스너 등록
    const unsubscribe = wsClient.on('execution.started', (data) => {
      console.log('Execution started:', data);
    });

    return () => unsubscribe(); // 정리
  }, []);

  return <div>...</div>;
}
```

**지원 이벤트**:

- `execution.started`: 실행 시작
- `execution.finished`: 실행 완료
- `execution.error`: 실행 오류
- `execution.progress`: 실행 진행
- `workflow.updated`: 워크플로우 업데이트
- `workflow.activated`: 워크플로우 활성화
- `workflow.deactivated`: 워크플로우 비활성화
- `connection.established`: WebSocket 연결
- `connection.lost`: WebSocket 연결 끊김

## 🎨 UI 컴포넌트

### shadcn/ui

프로젝트는 shadcn/ui (Radix UI) 기반 컴포넌트를 사용합니다.

**사용 가능한 컴포넌트**:

- Dialog (모달)
- DropdownMenu
- Select (선택 메뉴)
- Tabs
- Toast (알림)

**추가 컴포넌트 설치**:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
```

## 🔨 개발 가이드

### 1. 새로운 페이지 추가

```typescript
// src/app/(dashboard)/my-page/page.tsx
export default function MyPage() {
  return <div>My Page</div>;
}
```

### 2. API 라우트 추가

```typescript
// src/app/api/my-route/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello' });
}
```

### 3. 커스텀 훅 작성

```typescript
// src/hooks/useMyHook.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useMyHook() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: () => apiClient.getMyData(),
  });
}
```

## 📝 타입 정의

모든 타입은 `src/types/` 디렉토리에 정의되어 있습니다.

**주요 타입**:

```typescript
// Workflow
interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  // ...
}

// Execution
interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'new' | 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  // ...
}
```

## 🧪 테스트

```bash
# 타입 체크
npm run type-check

# Linting
npm run lint

# 빌드 테스트
npm run build
```

## 🚀 배포

### Vercel (권장)

1. GitHub에 푸시
2. Vercel에서 프로젝트 import
3. 환경 변수 설정
4. 자동 배포

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 🔗 관련 문서

- [Backend API](../backend/README.md)
- [Monitoring System](../../features/monitoring/README.md)
- [Error Healing](../../features/error-healing/README.md)

## 📄 라이선스

MIT License
