# Frontend Architecture - Next.js 15

## Project Overview

gonsai2 프로젝트의 n8n 워크플로우 관리 프론트엔드. Next.js 15 App Router 기반으로 구축.

## Technology Stack

- **Framework**: Next.js 15.5.6 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.9.3
- **Styling**: Tailwind CSS 4.1.17 + shadcn/ui
- **State Management**: Zustand 5.0.8 (클라이언트 상태)
- **Data Fetching**: TanStack Query 5.90.7 (서버 상태)
- **Real-time**: WebSocket (ws 8.18.3)
- **UI Components**: Radix UI

## Directory Structure

```
apps/frontend/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (dashboard)/           # Dashboard Layout Group
│   │   │   ├── workflows/         # 워크플로우 관리
│   │   │   ├── executions/        # 실행 내역
│   │   │   ├── agents/            # AI Agent 설정
│   │   │   └── monitoring/        # 실시간 모니터링
│   │   ├── api/                   # API Routes (proxy)
│   │   ├── webhooks/              # n8n Webhook 수신
│   │   ├── layout.tsx             # Root Layout
│   │   ├── page.tsx               # Homepage
│   │   ├── providers.tsx          # Global Providers
│   │   └── globals.css            # Global Styles
│   │
│   ├── components/                # UI Components
│   ├── hooks/                     # Custom React Hooks
│   │
│   ├── lib/                       # Core Library
│   │   ├── api-client.ts          # Backend API Client
│   │   ├── websocket.ts           # WebSocket Client
│   │   ├── query-client.ts        # TanStack Query Config
│   │   └── utils.ts               # Utility Functions
│   │
│   ├── stores/                    # Zustand Stores
│   │   └── workflow-store.ts      # Workflow State
│   │
│   └── types/                     # TypeScript Types
│       └── workflow.ts            # n8n Workflow Types
│
├── public/                        # Static Assets
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript Config
├── tailwind.config.ts             # Tailwind CSS Config
├── next.config.js                 # Next.js Config
└── README.md                      # Documentation
```

## Core Components

### 1. State Management (Zustand)

**Location**: `src/stores/workflow-store.ts`

**State**:

- `connected`: n8n/backend 연결 상태
- `workflows`: 워크플로우 캐시 (Map<string, N8nWorkflow>)
- `selectedWorkflowId`: 현재 선택된 워크플로우
- `executionQueue`: 실행 대기 큐
- `runningExecutions`: 실행 중인 작업 (Map<string, WorkflowExecution>)
- `realtimeEnabled`: 실시간 업데이트 활성화
- `statistics`: 워크플로우 통계 (Map<string, WorkflowStatistics>)

**Selectors**:

- `useSelectedWorkflow()`: 선택된 워크플로우 반환
- `useWorkflowList()`: 전체 워크플로우 배열 반환
- `useRunningExecutionsList()`: 실행 중인 작업 배열 반환

### 2. WebSocket Client

**Location**: `src/lib/websocket.ts`

**Features**:

- 자동 재연결 (exponential backoff)
- Heartbeat ping (30초마다)
- 이벤트 기반 pub/sub 시스템
- Zustand 스토어 자동 업데이트

**Events**:

- `execution.started`: 실행 시작
- `execution.finished`: 실행 완료
- `execution.error`: 실행 오류
- `execution.progress`: 실행 진행
- `workflow.updated`: 워크플로우 업데이트
- `workflow.activated/deactivated`: 워크플로우 활성화/비활성화
- `connection.established/lost`: WebSocket 연결 상태

**Usage**:

```typescript
const wsClient = getWebSocketClient();
const unsubscribe = wsClient.on('execution.started', (data) => {
  console.log('Execution started:', data);
});
```

### 3. API Client

**Location**: `src/lib/api-client.ts`

**Endpoints**:

- Workflows: CRUD, activate/deactivate
- Executions: execute, retry, stop, list
- Statistics: per-workflow stats
- Agents: CRUD operations
- Monitoring: dashboard, realtime, health, alerts

**Usage**:

```typescript
import { apiClient } from '@/lib/api-client';

const workflows = await apiClient.getWorkflows();
const result = await apiClient.executeWorkflow({ workflowId: 'xxx' });
```

### 4. TanStack Query

**Location**: `src/lib/query-client.ts`

**Configuration**:

- staleTime: 60초
- gcTime: 5분
- retry: 1회
- refetchOnWindowFocus: false

**Usage with API Client**:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['workflows'],
  queryFn: () => apiClient.getWorkflows(),
});
```

## Type System

**Location**: `src/types/workflow.ts`

**Key Types**:

- `N8nWorkflow`: 워크플로우 정의
- `N8nNode`: 워크플로우 노드
- `N8nConnections`: 노드 간 연결
- `WorkflowExecution`: 실행 정보
- `ExecutionData`: 실행 데이터 및 결과
- `NodeExecutionData`: 노드별 실행 데이터
- `ExecutionError`: 오류 정보
- `WorkflowStatistics`: 워크플로우 통계

## Configuration

### Environment Variables

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_N8N_URL=http://localhost:5678
```

### Next.js Config

**Key Settings**:

- reactStrictMode: true
- swcMinify: true
- Rewrites: `/api/backend/:path*` → backend API proxy
- Webpack externals: ws, utf-8-validate, bufferutil

### Tailwind CSS

**Theme**:

- Dark mode: class-based
- Color system: CSS custom properties (hsl)
- Border radius: CSS variable `--radius`
- Animations: accordion-down/up

## Development Workflow

### 1. Start Development Server

```bash
cd apps/frontend
npm run dev
```

→ http://localhost:3000

### 2. Type Check

```bash
npm run type-check
```

### 3. Lint

```bash
npm run lint
```

### 4. Build

```bash
npm run build
npm start
```

## Integration Points

### Backend API

**Base URL**: `http://localhost:4000`

**API Routes** (Next.js proxy):

```
Frontend: /api/backend/:path*
↓
Backend: /api/:path*
```

### WebSocket Server

**URL**: `ws://localhost:4000`

**Auto-connect**: Providers 컴포넌트에서 자동 연결

### n8n Instance

**URL**: `http://localhost:5678`

**Access**: 직접 접근 또는 backend API를 통한 간접 접근

## Performance Optimizations

1. **State Management**:
   - Zustand로 클라이언트 상태 (가벼움)
   - TanStack Query로 서버 상태 (캐싱, 자동 갱신)

2. **WebSocket**:
   - 단일 연결 유지 (싱글톤)
   - Heartbeat로 연결 상태 확인
   - 자동 재연결

3. **Caching**:
   - Workflow 목록: Map 구조로 O(1) 조회
   - Query cache: 1분 stale time

4. **Code Splitting**:
   - Next.js automatic code splitting
   - Dynamic imports for heavy components

## Future Enhancements

### 필요한 추가 구현

1. **UI Components**:
   - WorkflowList: 워크플로우 목록 표시
   - WorkflowExecutor: 실행 인터페이스
   - ExecutionMonitor: 실시간 모니터링
   - NodeVisualizer: 노드 그래프 시각화

2. **Hooks**:
   - useWorkflows: 워크플로우 데이터 훅
   - useExecutions: 실행 데이터 훅
   - useWebSocket: WebSocket 상태 훅

3. **Pages**:
   - `/workflows`: 워크플로우 목록
   - `/workflows/[id]`: 워크플로우 상세
   - `/executions`: 실행 내역
   - `/agents`: AI Agent 관리
   - `/monitoring`: 대시보드

4. **Features**:
   - Workflow editor integration
   - Real-time execution logs
   - Error healing UI
   - Alert notifications UI

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

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

## Related Documentation

- [Backend API](../backend/README.md)
- [Monitoring System](../../features/monitoring/README.md)
- [Error Healing](../../features/error-healing/README.md)
- [Agent Orchestration](../../features/agent-orchestration/README.md)
