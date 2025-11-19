# gonsai2 개발 명칭 가이드 (Development Naming Guide)

> **목적**: 개발 시 AI 및 개발자 간 명칭 혼동 방지를 위한 표준 용어집

**최종 업데이트**: 2025-01-12

---

## 📑 목차

1. [페이지(화면) 명칭](#페이지화면-명칭)
2. [컴포넌트 명칭](#컴포넌트-명칭)
3. [API 엔드포인트](#api-엔드포인트)
4. [서비스 및 기능](#서비스-및-기능)
5. [타입 및 인터페이스](#타입-및-인터페이스)
6. [WebSocket 이벤트](#websocket-이벤트)
7. [용어 사전](#용어-사전)
8. [파일 경로 규칙](#파일-경로-규칙)

---

## 페이지(화면) 명칭

### 인증 관련 페이지

| 공식 명칭                  | URL 경로                  | 파일 위치                                               | 설명                    |
| -------------------------- | ------------------------- | ------------------------------------------------------- | ----------------------- |
| **로그인 페이지**          | `/login`                  | `apps/frontend/src/app/login/page.tsx`                  | 사용자 로그인 화면      |
| **회원가입 페이지**        | `/signup`                 | `apps/frontend/src/app/signup/page.tsx`                 | 신규 사용자 등록 화면   |
| **비밀번호 찾기 페이지**   | `/forgot-password`        | `apps/frontend/src/app/forgot-password/page.tsx`        | 비밀번호 재설정 요청    |
| **비밀번호 재설정 페이지** | `/reset-password/[token]` | `apps/frontend/src/app/reset-password/[token]/page.tsx` | 토큰 기반 비밀번호 변경 |

### 대시보드 페이지

| 공식 명칭                                        | URL 경로      | 파일 위치                                               | 설명                      |
| ------------------------------------------------ | ------------- | ------------------------------------------------------- | ------------------------- |
| **워크플로우 관리 페이지**<br/>(Workflows Page)  | `/workflows`  | `apps/frontend/src/app/(dashboard)/workflows/page.tsx`  | 워크플로우 목록 및 실행   |
| **실행 내역 페이지**<br/>(Executions Page)       | `/executions` | `apps/frontend/src/app/(dashboard)/executions/page.tsx` | 워크플로우 실행 기록 조회 |
| **실시간 모니터링 페이지**<br/>(Monitoring Page) | `/monitoring` | `apps/frontend/src/app/(dashboard)/monitoring/page.tsx` | 실시간 시스템 모니터링    |
| **AI 에이전트 관리 페이지**<br/>(AI Agents Page) | `/ai-agents`  | `apps/frontend/src/app/(dashboard)/ai-agents/page.tsx`  | AI 에이전트 관리 (신규)   |
| **에이전트 관리 페이지**<br/>(Agents Page)       | `/agents`     | `apps/frontend/src/app/(dashboard)/agents/page.tsx`     | 에이전트 관리 (레거시)    |
| **프로필 페이지**<br/>(Profile Page)             | `/profile`    | `apps/frontend/src/app/(dashboard)/profile/page.tsx`    | 사용자 프로필 및 설정     |
| **대시보드 홈**<br/>(Dashboard Home)             | `/` (루트)    | `apps/frontend/src/app/(dashboard)/page.tsx`            | 대시보드 기본 화면        |

### 용어 사용 지침

**✅ 권장 표현**:

- "워크플로우 관리 페이지에서..."
- "실행 내역 페이지의 필터 기능을..."
- "모니터링 페이지 WebSocket 연결 상태..."

**❌ 피해야 할 표현**:

- "워크플로우 화면에서..." (명확하지 않음)
- "실행 리스트에서..." (공식 명칭 아님)
- "모니터링 대시보드에서..." (대시보드는 전체를 지칭)

---

## 컴포넌트 명칭

### 레이아웃 컴포넌트

| 공식 명칭           | 파일 위치                                          | 용도                          |
| ------------------- | -------------------------------------------------- | ----------------------------- |
| **Sidebar**         | `apps/frontend/src/components/Sidebar.tsx`         | 좌측 네비게이션 메뉴          |
| **DashboardHeader** | `apps/frontend/src/components/DashboardHeader.tsx` | 상단 헤더 (로고, 사용자 메뉴) |
| **UserMenu**        | `apps/frontend/src/components/UserMenu.tsx`        | 사용자 드롭다운 메뉴          |
| **HamburgerIcon**   | `apps/frontend/src/components/HamburgerIcon.tsx`   | 모바일 메뉴 토글 아이콘       |
| **Modal**           | `apps/frontend/src/components/ui/Modal.tsx`        | 기본 모달 컨테이너            |

### 워크플로우 관련 컴포넌트

| 공식 명칭                  | 파일 위치                                                          | 용도                     |
| -------------------------- | ------------------------------------------------------------------ | ------------------------ |
| **WorkflowExecutionModal** | `apps/frontend/src/components/workflow/WorkflowExecutionModal.tsx` | 워크플로우 실행 모달     |
| **WorkflowCanvas**         | `apps/frontend/src/components/workflow/WorkflowCanvas.tsx`         | 워크플로우 시각화 캔버스 |
| **ExecutionFlow**          | `apps/frontend/src/components/workflow/ExecutionFlow.tsx`          | 실행 흐름 시각화         |
| **WorkflowStats**          | `apps/frontend/src/components/workflow/WorkflowStats.tsx`          | 워크플로우 통계 표시     |
| **NodeDetails**            | `apps/frontend/src/components/workflow/NodeDetails.tsx`            | 노드 상세 정보 패널      |
| **KnowledgeLearningModal** | `apps/frontend/src/components/workflow/KnowledgeLearningModal.tsx` | 지식 습득 프로세스 모달  |
| **WebhookInfoPanel**       | `apps/frontend/src/components/workflow/WebhookInfoPanel.tsx`       | Webhook 정보 표시 패널   |

### 워크플로우 폼 컴포넌트

| 공식 명칭                 | 파일 위치                                                               | 용도                    |
| ------------------------- | ----------------------------------------------------------------------- | ----------------------- |
| **DynamicWorkflowForm**   | `apps/frontend/src/components/workflow/forms/DynamicWorkflowForm.tsx`   | 동적 워크플로우 입력 폼 |
| **DefaultWorkflowForm**   | `apps/frontend/src/components/workflow/forms/DefaultWorkflowForm.tsx`   | 기본 워크플로우 입력 폼 |
| **DynamicFormField**      | `apps/frontend/src/components/workflow/forms/DynamicFormField.tsx`      | 동적 폼 필드            |
| **KnowledgeLearningForm** | `apps/frontend/src/components/workflow/forms/KnowledgeLearningForm.tsx` | 지식 습득 특화 폼       |

### 노드 타입 컴포넌트

| 공식 명칭        | 파일 위치                                                      | 노드 타입         |
| ---------------- | -------------------------------------------------------------- | ----------------- |
| **DefaultNode**  | `apps/frontend/src/components/workflow/nodes/DefaultNode.tsx`  | 기본 노드         |
| **AINode**       | `apps/frontend/src/components/workflow/nodes/AINode.tsx`       | AI 관련 노드      |
| **TriggerNode**  | `apps/frontend/src/components/workflow/nodes/TriggerNode.tsx`  | 트리거 노드       |
| **HttpNode**     | `apps/frontend/src/components/workflow/nodes/HttpNode.tsx`     | HTTP 요청 노드    |
| **DatabaseNode** | `apps/frontend/src/components/workflow/nodes/DatabaseNode.tsx` | 데이터베이스 노드 |

### 모니터링 관련 컴포넌트

| 공식 명칭              | 파일 위치                                                        | 용도                 |
| ---------------------- | ---------------------------------------------------------------- | -------------------- |
| **ExecutionList**      | `apps/frontend/src/components/monitoring/ExecutionList.tsx`      | 실시간 실행 목록     |
| **LogStream**          | `apps/frontend/src/components/monitoring/LogStream.tsx`          | 실시간 로그 스트림   |
| **MetricsCharts**      | `apps/frontend/src/components/monitoring/MetricsCharts.tsx`      | 메트릭 차트 (그래프) |
| **NotificationCenter** | `apps/frontend/src/components/monitoring/NotificationCenter.tsx` | 알림 센터            |

### 용어 사용 예시

**✅ 올바른 예**:

```
"WorkflowExecutionModal 컴포넌트에서 입력 파라미터 검증 로직을 추가해주세요"
"ExecutionList 컴포넌트의 필터링 기능을 개선해주세요"
"AINode 컴포넌트에 토큰 사용량 표시를 추가해주세요"
```

**❌ 잘못된 예**:

```
"워크플로우 실행 팝업에서..." (→ WorkflowExecutionModal)
"실행 리스트에서..." (→ ExecutionList)
"AI 노드에서..." (→ AINode 컴포넌트)
```

---

## API 엔드포인트

### 인증 API

| 엔드포인트                  | HTTP 메서드 | 설명                 | 백엔드 라우트                            |
| --------------------------- | ----------- | -------------------- | ---------------------------------------- |
| `/api/auth/login`           | POST        | 로그인               | `apps/backend/src/routes/auth.routes.ts` |
| `/api/auth/signup`          | POST        | 회원가입             | `apps/backend/src/routes/auth.routes.ts` |
| `/api/auth/logout`          | POST        | 로그아웃             | `apps/backend/src/routes/auth.routes.ts` |
| `/api/auth/forgot-password` | POST        | 비밀번호 재설정 요청 | `apps/backend/src/routes/auth.routes.ts` |
| `/api/auth/reset-password`  | POST        | 비밀번호 재설정      | `apps/backend/src/routes/auth.routes.ts` |

### 사용자 API

| 엔드포인트               | HTTP 메서드 | 설명                  | 백엔드 라우트                            |
| ------------------------ | ----------- | --------------------- | ---------------------------------------- |
| `/api/users/me`          | GET         | 현재 사용자 정보 조회 | `apps/backend/src/routes/user.routes.ts` |
| `/api/users/me`          | PUT         | 현재 사용자 정보 수정 | `apps/backend/src/routes/user.routes.ts` |
| `/api/users/me/password` | PUT         | 비밀번호 변경         | `apps/backend/src/routes/user.routes.ts` |

### 워크플로우 API

| 엔드포인트                      | HTTP 메서드 | 설명                 | 백엔드 라우트                                 |
| ------------------------------- | ----------- | -------------------- | --------------------------------------------- |
| `/api/workflows`                | GET         | 워크플로우 목록 조회 | `apps/backend/src/routes/workflows.routes.ts` |
| `/api/workflows/:id`            | GET         | 워크플로우 상세 조회 | `apps/backend/src/routes/workflows.routes.ts` |
| `/api/workflows/:id/execute`    | POST        | 워크플로우 실행      | `apps/backend/src/routes/workflows.routes.ts` |
| `/api/workflows/:id/executions` | GET         | 워크플로우 실행 내역 | `apps/backend/src/routes/workflows.routes.ts` |
| `/api/workflows/:id/activate`   | POST        | 워크플로우 활성화    | `apps/backend/src/routes/workflows.routes.ts` |
| `/api/workflows/:id/deactivate` | POST        | 워크플로우 비활성화  | `apps/backend/src/routes/workflows.routes.ts` |

### 태그 API

| 엔드포인트      | HTTP 메서드 | 설명           | 백엔드 라우트                            |
| --------------- | ----------- | -------------- | ---------------------------------------- |
| `/api/tags`     | GET         | 태그 목록 조회 | `apps/backend/src/routes/tags.routes.ts` |
| `/api/tags`     | POST        | 태그 생성      | `apps/backend/src/routes/tags.routes.ts` |
| `/api/tags/:id` | DELETE      | 태그 삭제      | `apps/backend/src/routes/tags.routes.ts` |

### 모니터링 API

| 엔드포인트                  | HTTP 메서드 | 설명             | 백엔드 라우트                                  |
| --------------------------- | ----------- | ---------------- | ---------------------------------------------- |
| `/api/monitoring/stats`     | GET         | 시스템 통계 조회 | `apps/backend/src/routes/monitoring.routes.ts` |
| `/api/monitoring/dashboard` | GET         | 대시보드 데이터  | `apps/backend/src/routes/monitoring.routes.ts` |
| `/api/monitoring/health`    | GET         | 시스템 헬스 체크 | `apps/backend/src/routes/monitoring.routes.ts` |
| `/api/monitoring/logs`      | GET         | 로그 조회        | `apps/backend/src/routes/monitoring.routes.ts` |
| `/api/monitoring/alerts`    | GET         | 알림 조회        | `apps/backend/src/routes/monitoring.routes.ts` |

### Webhook API

| 엔드포인트              | HTTP 메서드 | 설명             | 백엔드 라우트                               |
| ----------------------- | ----------- | ---------------- | ------------------------------------------- |
| `/webhooks/:workflowId` | POST        | n8n Webhook 수신 | `apps/backend/src/routes/webhook.routes.ts` |

### 헬스 체크 API

| 엔드포인트         | HTTP 메서드 | 설명                          | 백엔드 라우트                              |
| ------------------ | ----------- | ----------------------------- | ------------------------------------------ |
| `/health`          | GET         | 서버 헬스 체크                | `apps/backend/src/routes/health.routes.ts` |
| `/health/detailed` | GET         | 상세 헬스 체크 (DB, Redis 등) | `apps/backend/src/routes/health.routes.ts` |

### API 클라이언트 사용 예시

**프론트엔드 API 클라이언트**: `apps/frontend/src/lib/api-client.ts`

```typescript
// ✅ 올바른 사용
import { workflowsApi } from '@/lib/api-client';

const workflows = await workflowsApi.list();
const execution = await workflowsApi.execute(workflowId, params);

// ❌ 직접 fetch 사용 (일관성 없음)
const response = await fetch('/api/workflows');
```

---

## 서비스 및 기능

### 프론트엔드 서비스

| 공식 명칭             | 파일 위치                                    | 설명                     |
| --------------------- | -------------------------------------------- | ------------------------ |
| **API Client**        | `apps/frontend/src/lib/api-client.ts`        | 중앙화된 API 클라이언트  |
| **WebSocket Client**  | `apps/frontend/src/lib/websocket.ts`         | WebSocket 연결 관리      |
| **Socket.IO Client**  | `apps/frontend/src/lib/socket-client.ts`     | Socket.IO 클라이언트     |
| **Query Client**      | `apps/frontend/src/lib/query-client.ts`      | TanStack Query 설정      |
| **Form Field Parser** | `apps/frontend/src/lib/form-field-parser.ts` | n8n 폼 필드 파싱         |
| **Workflow Utils**    | `apps/frontend/src/lib/workflow-utils.ts`    | 워크플로우 유틸리티 함수 |

### 백엔드 서비스

| 공식 명칭                | 파일 위치                                           | 설명              |
| ------------------------ | --------------------------------------------------- | ----------------- |
| **Auth Service**         | `apps/backend/src/services/auth.service.ts`         | 인증 및 권한 관리 |
| **Database Service**     | `apps/backend/src/services/database.service.ts`     | MongoDB 연결 관리 |
| **WebSocket Service**    | `apps/backend/src/services/websocket.service.ts`    | WebSocket 서버    |
| **Socket.IO Service**    | `apps/backend/src/services/socketio.service.ts`     | Socket.IO 서버    |
| **Email Service**        | `apps/backend/src/services/email.service.ts`        | 이메일 발송       |
| **Cache Service**        | `apps/backend/src/services/cache.service.ts`        | 캐싱 관리         |
| **Health Check Service** | `apps/backend/src/services/health-check.service.ts` | 시스템 헬스 체크  |

### 저장소 (Repositories)

| 공식 명칭               | 파일 위치                                              | 설명                    |
| ----------------------- | ------------------------------------------------------ | ----------------------- |
| **User Repository**     | `apps/backend/src/repositories/user.repository.ts`     | 사용자 데이터 접근      |
| **Workflow Repository** | `apps/backend/src/repositories/workflow.repository.ts` | 워크플로우 데이터 접근  |
| **Base Repository**     | `apps/backend/src/repositories/base.repository.ts`     | 기본 저장소 추상 클래스 |

### 미들웨어

| 공식 명칭                     | 파일 위치                                                  | 설명                |
| ----------------------------- | ---------------------------------------------------------- | ------------------- |
| **Auth Middleware**           | `apps/backend/src/middleware/auth.middleware.ts`           | 인증 검증           |
| **RBAC Middleware**           | `apps/backend/src/middleware/rbac.middleware.ts`           | 역할 기반 접근 제어 |
| **Error Middleware**          | `apps/backend/src/middleware/error.middleware.ts`          | 전역 에러 처리      |
| **Request Logger Middleware** | `apps/backend/src/middleware/request-logger.middleware.ts` | 요청 로깅           |
| **Correlation ID Middleware** | `apps/backend/src/middleware/correlation-id.middleware.ts` | 요청 추적 ID 생성   |

---

## 타입 및 인터페이스

### 프론트엔드 타입

| 공식 명칭          | 파일 위치                                     | 설명                     |
| ------------------ | --------------------------------------------- | ------------------------ |
| **Workflow 타입**  | `apps/frontend/src/types/workflow.ts`         | n8n 워크플로우 관련 타입 |
| **Auth 타입**      | `apps/frontend/src/types/auth.ts`             | 인증 관련 타입           |
| **Tags 타입**      | `apps/frontend/src/types/tags.ts`             | 태그 관련 타입           |
| **FormField 타입** | `apps/frontend/src/types/form-field.types.ts` | 폼 필드 타입             |
| **Learning 타입**  | `apps/frontend/src/types/learning.types.ts`   | 지식 습득 관련 타입      |

### 백엔드 타입

| 공식 명칭    | 파일 위치                             | 설명          |
| ------------ | ------------------------------------- | ------------- |
| **API 타입** | `apps/backend/src/types/api.types.ts` | API 응답 타입 |

### 주요 인터페이스

```typescript
// Workflow 타입 (apps/frontend/src/types/workflow.ts)
interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8nNode[];
  connections: N8nConnections;
  settings: any;
  tags?: Tag[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  data?: ExecutionData;
}

// Auth 타입 (apps/frontend/src/types/auth.ts)
interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
  name?: string;
}
```

---

## WebSocket 이벤트

### 클라이언트 → 서버 이벤트

| 이벤트 명     | 페이로드 타입         | 설명           |
| ------------- | --------------------- | -------------- |
| `subscribe`   | `{ channel: string }` | 특정 채널 구독 |
| `unsubscribe` | `{ channel: string }` | 채널 구독 해제 |
| `ping`        | -                     | Heartbeat 핑   |

### 서버 → 클라이언트 이벤트

| 이벤트 명                | 페이로드 타입                      | 설명                 |
| ------------------------ | ---------------------------------- | -------------------- |
| `execution.started`      | `{ executionId, workflowId, ... }` | 워크플로우 실행 시작 |
| `execution.finished`     | `{ executionId, status, ... }`     | 워크플로우 실행 완료 |
| `execution.error`        | `{ executionId, error, ... }`      | 워크플로우 실행 실패 |
| `execution.progress`     | `{ executionId, progress, ... }`   | 실행 진행률 업데이트 |
| `workflow.updated`       | `{ workflowId, ... }`              | 워크플로우 업데이트  |
| `workflow.activated`     | `{ workflowId }`                   | 워크플로우 활성화    |
| `workflow.deactivated`   | `{ workflowId }`                   | 워크플로우 비활성화  |
| `connection.established` | -                                  | WebSocket 연결 성공  |
| `connection.lost`        | -                                  | WebSocket 연결 끊김  |
| `log`                    | `{ level, message, ... }`          | 로그 메시지          |
| `pong`                   | -                                  | Heartbeat 응답       |

### 이벤트 사용 예시

```typescript
// ✅ 올바른 이벤트명 사용
wsClient.on('execution.started', (data) => {
  console.log('실행 시작:', data);
});

wsClient.on('execution.finished', (data) => {
  console.log('실행 완료:', data);
});

// ❌ 잘못된 이벤트명
wsClient.on('executionStart', ...); // 카멜케이스 사용 금지
wsClient.on('workflow_updated', ...); // 언더스코어 사용 금지
```

---

## 용어 사전

### 핵심 용어

| 한글 용어      | 영문 용어  | 설명                     | 사용 예시                           |
| -------------- | ---------- | ------------------------ | ----------------------------------- |
| **워크플로우** | Workflow   | n8n 자동화 프로세스      | "워크플로우를 실행합니다"           |
| **실행**       | Execution  | 워크플로우 실행 인스턴스 | "실행 내역을 조회합니다"            |
| **노드**       | Node       | 워크플로우 구성 요소     | "AI 노드를 추가합니다"              |
| **트리거**     | Trigger    | 워크플로우 시작 조건     | "Webhook 트리거가 활성화되었습니다" |
| **태그**       | Tag        | 워크플로우 분류 라벨     | "태그별로 필터링합니다"             |
| **에이전트**   | Agent      | AI 자동화 에이전트       | "에이전트를 생성합니다"             |
| **모니터링**   | Monitoring | 시스템 감시              | "실시간 모니터링 페이지"            |
| **대시보드**   | Dashboard  | 통합 관리 화면           | "대시보드에서 통계를 확인합니다"    |

### 기술 용어

| 한글 용어                      | 영문 용어                         | 약어 | 설명                     |
| ------------------------------ | --------------------------------- | ---- | ------------------------ |
| **웹소켓**                     | WebSocket                         | WS   | 실시간 양방향 통신       |
| **소켓IO**                     | Socket.IO                         | -    | WebSocket 라이브러리     |
| **응용 프로그래밍 인터페이스** | Application Programming Interface | API  | 서버 통신 인터페이스     |
| **타입스크립트**               | TypeScript                        | TS   | 타입 안전 JavaScript     |
| **넥스트제이에스**             | Next.js                           | -    | React 프레임워크         |
| **익스프레스**                 | Express                           | -    | Node.js 웹 프레임워크    |
| **몽고디비**                   | MongoDB                           | -    | NoSQL 데이터베이스       |
| **엔에이트엔**                 | n8n                               | -    | 워크플로우 자동화 플랫폼 |

### 상태 관련 용어

| 한글           | 영문                 | 값              | 설명                      |
| -------------- | -------------------- | --------------- | ------------------------- |
| **실행 중**    | Running              | `running`       | 워크플로우가 현재 실행 중 |
| **성공**       | Success              | `success`       | 워크플로우 실행 성공      |
| **실패**       | Error/Failed         | `error`         | 워크플로우 실행 실패      |
| **대기**       | Waiting              | `waiting`       | 워크플로우 실행 대기 중   |
| **활성화됨**   | Active/Activated     | `active: true`  | 워크플로우 활성화 상태    |
| **비활성화됨** | Inactive/Deactivated | `active: false` | 워크플로우 비활성화 상태  |

### 용어 사용 원칙

1. **일관성**: 동일 개념은 항상 같은 용어 사용
2. **명확성**: 약어보다 전체 용어 선호 (코드 제외)
3. **표준 준수**: 업계 표준 용어 우선 사용
4. **컨텍스트**: 맥락에 따라 적절한 용어 선택

**예시**:

```
✅ "워크플로우 실행이 성공했습니다" (명확)
❌ "WF exec가 OK됐어요" (불명확, 비표준)

✅ "WebSocket 연결이 끊어졌습니다" (표준 용어)
❌ "웹소켓 커넥션이 로스트됐어요" (혼용 금지)
```

---

## 파일 경로 규칙

### 프론트엔드 경로 규칙

```
apps/frontend/src/
├── app/                      # Next.js App Router 페이지
│   ├── (dashboard)/          # 대시보드 레이아웃 그룹
│   │   ├── workflows/        # 워크플로우 관리 페이지
│   │   ├── executions/       # 실행 내역 페이지
│   │   ├── monitoring/       # 모니터링 페이지
│   │   ├── agents/           # 에이전트 관리 페이지
│   │   └── profile/          # 프로필 페이지
│   ├── login/                # 로그인 페이지
│   ├── signup/               # 회원가입 페이지
│   └── api/                  # API 라우트 (프록시)
│
├── components/               # React 컴포넌트
│   ├── workflow/             # 워크플로우 관련 컴포넌트
│   ├── monitoring/           # 모니터링 관련 컴포넌트
│   └── ui/                   # 공통 UI 컴포넌트
│
├── lib/                      # 유틸리티 라이브러리
│   ├── api-client.ts         # API 클라이언트
│   ├── websocket.ts          # WebSocket 클라이언트
│   └── utils.ts              # 공통 유틸리티
│
├── types/                    # TypeScript 타입 정의
├── stores/                   # 상태 관리 (Zustand)
├── hooks/                    # Custom React Hooks
├── contexts/                 # React Context
└── config/                   # 설정 파일
```

### 백엔드 경로 규칙

```
apps/backend/src/
├── routes/                   # API 라우트
│   ├── auth.routes.ts        # 인증 API
│   ├── workflows.routes.ts   # 워크플로우 API
│   ├── monitoring.routes.ts  # 모니터링 API
│   └── health.routes.ts      # 헬스 체크 API
│
├── services/                 # 비즈니스 로직 서비스
│   ├── auth.service.ts       # 인증 서비스
│   ├── database.service.ts   # 데이터베이스 서비스
│   └── websocket.service.ts  # WebSocket 서비스
│
├── repositories/             # 데이터 접근 계층
│   ├── user.repository.ts    # 사용자 저장소
│   └── workflow.repository.ts # 워크플로우 저장소
│
├── middleware/               # Express 미들웨어
│   ├── auth.middleware.ts    # 인증 미들웨어
│   └── error.middleware.ts   # 에러 처리 미들웨어
│
├── models/                   # MongoDB 모델
├── types/                    # TypeScript 타입
├── utils/                    # 유틸리티 함수
└── config/                   # 설정 파일
```

### 명명 규칙

| 파일 타입    | 명명 규칙                  | 예시                                        |
| ------------ | -------------------------- | ------------------------------------------- |
| **페이지**   | `page.tsx`                 | `workflows/page.tsx`                        |
| **레이아웃** | `layout.tsx`               | `(dashboard)/layout.tsx`                    |
| **컴포넌트** | `PascalCase.tsx`           | `WorkflowExecutionModal.tsx`                |
| **유틸리티** | `kebab-case.ts`            | `api-client.ts`, `workflow-utils.ts`        |
| **타입**     | `kebab-case.types.ts`      | `workflow.types.ts`, `form-field.types.ts`  |
| **서비스**   | `kebab-case.service.ts`    | `auth.service.ts`, `websocket.service.ts`   |
| **라우트**   | `kebab-case.routes.ts`     | `workflows.routes.ts`, `auth.routes.ts`     |
| **미들웨어** | `kebab-case.middleware.ts` | `auth.middleware.ts`, `error.middleware.ts` |

---

## AI 개발 요청 시 권장 표현

### ✅ 명확한 요청 예시

```
1. "WorkflowExecutionModal 컴포넌트에서 입력 파라미터 검증 로직을 추가해주세요"
   → 컴포넌트 이름, 파일 위치가 명확함

2. "실행 내역 페이지(/executions)의 필터링 기능을 개선해주세요"
   → 페이지 명칭과 URL 경로가 명확함

3. "WorkflowStats 컴포넌트에 평균 실행 시간을 표시해주세요"
   → 컴포넌트 이름과 추가할 기능이 명확함

4. "/api/workflows/:id/execute 엔드포인트에서 타임아웃 처리를 추가해주세요"
   → API 경로가 정확함

5. "execution.started WebSocket 이벤트 핸들러에 로그를 추가해주세요"
   → 이벤트명이 정확함
```

### ❌ 피해야 할 모호한 표현

```
1. "워크플로우 실행 팝업에서..."
   → WorkflowExecutionModal로 명시해야 함

2. "실행 리스트 화면에서..."
   → 실행 내역 페이지(/executions) 또는 ExecutionList 컴포넌트로 명시

3. "통계 부분에..."
   → WorkflowStats 컴포넌트로 명시

4. "워크플로우 실행 API에서..."
   → /api/workflows/:id/execute로 명시

5. "실행 시작 이벤트에서..."
   → execution.started로 명시
```

---

## 환경 변수 명칭

### 프론트엔드 환경 변수

| 변수명                        | 설명               | 기본값                  |
| ----------------------------- | ------------------ | ----------------------- |
| `NEXT_PUBLIC_API_URL`         | 백엔드 API URL     | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL`          | WebSocket 서버 URL | `ws://localhost:3000`   |
| `NEXT_PUBLIC_N8N_UI_URL`      | n8n UI URL         | `http://localhost:5678` |
| `NEXT_PUBLIC_BACKEND_API_KEY` | 백엔드 API 키      | -                       |

### 백엔드 환경 변수

| 변수명         | 설명                | 기본값                  |
| -------------- | ------------------- | ----------------------- |
| `NODE_ENV`     | 실행 환경           | `development`           |
| `PORT`         | 서버 포트           | `3000`                  |
| `HOST`         | 서버 호스트         | `0.0.0.0`               |
| `MONGODB_URI`  | MongoDB 연결 문자열 | -                       |
| `N8N_API_KEY`  | n8n API 키          | -                       |
| `N8N_BASE_URL` | n8n 베이스 URL      | `http://localhost:5678` |
| `JWT_SECRET`   | JWT 시크릿 키       | -                       |
| `SMTP_HOST`    | SMTP 호스트         | -                       |
| `SMTP_PORT`    | SMTP 포트           | `587`                   |

---

## 특수 워크플로우 ID

| 명칭                   | 워크플로우 ID                   | 용도                 |
| ---------------------- | ------------------------------- | -------------------- |
| **지식 습득 프로세스** | `WORKFLOW_IDS.LEARNING_PROCESS` | 지식 학습 워크플로우 |

**설정 파일**: `apps/frontend/src/config/workflows.config.ts`

**사용 예시**:

```typescript
import { WORKFLOW_IDS } from '@/config/workflows.config';

// ✅ 올바른 사용
const workflowId = WORKFLOW_IDS.LEARNING_PROCESS;

// ❌ 하드코딩 금지
const workflowId = 'd4TxgdnhEc1IKaEG';
```

---

## 코드 스타일 가이드

### TypeScript 명명 규칙

```typescript
// ✅ 올바른 명명
interface WorkflowExecution {} // 인터페이스: PascalCase
type ExecutionStatus = 'running' | 'success' | 'error'; // 타입: PascalCase
const API_URL = 'http://...'; // 상수: UPPER_SNAKE_CASE
const workflowId = '123'; // 변수: camelCase
function executeWorkflow() {} // 함수: camelCase
class WorkflowService {} // 클래스: PascalCase

// ❌ 잘못된 명명
interface workflow_execution {} // snake_case 금지
type execution_status = 'running'; // snake_case 금지
const apiUrl = 'http://...'; // 상수는 UPPER_SNAKE_CASE
const WorkflowId = '123'; // 변수는 camelCase
function ExecuteWorkflow() {} // 함수는 camelCase
```

### 파일명 규칙

```
✅ 올바른 파일명:
- WorkflowExecutionModal.tsx  (컴포넌트)
- api-client.ts  (유틸리티)
- workflow.types.ts  (타입)
- auth.service.ts  (서비스)

❌ 잘못된 파일명:
- workflowExecutionModal.tsx  (camelCase 금지)
- ApiClient.ts  (유틸리티는 kebab-case)
- Workflow.Types.ts  (점으로 구분된 PascalCase 금지)
```

---

## 버전 관리

**문서 버전**: 1.0.0
**최종 업데이트**: 2025-01-12
**담당자**: gonsai2 개발팀

### 변경 이력

| 버전  | 날짜       | 변경 내용      |
| ----- | ---------- | -------------- |
| 1.0.0 | 2025-01-12 | 초기 버전 작성 |

---

## 관련 문서

- [프론트엔드 사용자 메뉴얼](Frontend-User-Manual.md)
- [프로젝트 README](../README.md)
- [아키텍처 문서](architecture/README.md)

---

**마지막 업데이트**: 2025-01-12
**작성**: gonsai2 개발팀 with Claude Code

이 문서는 프로젝트의 명칭 및 용어 표준을 정의합니다. 모든 개발자와 AI는 이 가이드를 따라 일관된 용어를 사용해야 합니다.
