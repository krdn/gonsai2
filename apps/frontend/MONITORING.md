# 실시간 모니터링 대시보드 가이드

n8n 워크플로우 실행을 실시간으로 모니터링하는 대시보드 사용 가이드입니다.

## 📦 설치된 패키지

```json
{
  "recharts": "^2.x",
  "socket.io-client": "^4.x",
  "date-fns": "^3.x"
}
```

## 🎯 구현된 기능

### 1. Socket.io 클라이언트 ([socket-client.ts](src/lib/socket-client.ts))

실시간 양방향 통신을 위한 Socket.io 클라이언트입니다.

#### 주요 이벤트

```typescript
// 실행 관련
'execution:update'   // 실행 상태 업데이트
'execution:started'  // 실행 시작
'execution:finished' // 실행 완료
'execution:error'    // 실행 오류

// 로그 관련
'log:message'        // 로그 메시지

// 메트릭 관련
'metric:update'      // 메트릭 데이터 업데이트

// 알림 관련
'notification'       // 시스템 알림
```

#### 사용 예시

```typescript
import { getSocketClient } from '@/lib/socket-client';

// 연결
const socket = getSocketClient();
await socket.connect();

// 이벤트 구독
socket.onExecutionUpdate((data) => {
  console.log('Execution update:', data);
});

socket.onLogMessage((log) => {
  console.log('New log:', log.message);
});

// 특정 워크플로우 구독
socket.subscribeToWorkflow('workflow-id');

// 연결 해제
socket.disconnect();
```

### 2. 실시간 실행 목록 컴포넌트 ([ExecutionList.tsx](src/components/monitoring/ExecutionList.tsx))

현재 실행 중인 워크플로우 목록을 실시간으로 표시합니다.

#### 기능
- ✅ 실행 중 (Running) - 진행률 표시
- ✅ 대기 중 (Waiting) - 큐에 대기
- ✅ 최근 완료 (Completed) - 성공한 실행
- ✅ 실패 (Failed) - 오류 하이라이트
- ✅ 자동 업데이트 (Socket.io)
- ✅ 최대 10개씩 표시
- ✅ 실행 시간 표시
- ✅ 현재 노드 표시

#### 사용 예시

```tsx
import { ExecutionList } from '@/components/monitoring';

export default function MonitoringPage() {
  return (
    <div className="p-6">
      <ExecutionList />
    </div>
  );
}
```

### 3. 로그 스트리밍 컴포넌트 ([LogStream.tsx](src/components/monitoring/LogStream.tsx))

실시간 로그를 터미널 스타일로 표시합니다.

#### 기능
- ✅ 실시간 로그 스트리밍
- ✅ 로그 레벨별 필터 (INFO, WARN, ERROR, DEBUG)
- ✅ 검색 기능
- ✅ 자동 스크롤 (토글 가능)
- ✅ 일시정지/재개
- ✅ 로그 내보내기 (.txt)
- ✅ 로그 지우기
- ✅ 최대 500개 로그 유지
- ✅ 터미널 스타일 UI (검정 배경)

#### 사용 예시

```tsx
import { LogStream } from '@/components/monitoring';

export default function MonitoringPage() {
  return (
    <div className="p-6">
      <LogStream className="h-[600px]" />
    </div>
  );
}
```

#### 로그 레벨별 색상
- **INFO**: 파란색 (`text-blue-600`)
- **WARN**: 노란색 (`text-yellow-600`)
- **ERROR**: 빨간색 (`text-red-600`)
- **DEBUG**: 회색 (`text-gray-600`)

### 4. 메트릭 차트 컴포넌트 ([MetricsCharts.tsx](src/components/monitoring/MetricsCharts.tsx))

Recharts 기반 실시간 메트릭 시각화입니다.

#### 차트 종류

**1. 현재 메트릭 카드 (4개)**
- 실행/분 (Activity)
- 평균 실행 시간 (Clock)
- 오류율 (AlertTriangle)
- AI 토큰 사용량 (Zap)

**2. 실행 추이 (AreaChart)**
- 시간별 실행/분 변화
- 그라데이션 영역 차트
- 최근 60분 데이터

**3. 평균 실행 시간 (LineChart)**
- 시간별 평균 실행 시간
- 밀리초 단위 → 초 단위 변환

**4. 오류율 (AreaChart)**
- 백분율 오류율
- 빨간색 그라데이션

**5. 큐 길이 & 활성 실행 (BarChart)**
- 대기 중 (노란색)
- 실행 중 (초록색)

**6. AI 토큰 사용량 (AreaChart)**
- 누적 토큰 사용량
- 조건부 렌더링 (데이터가 있을 때만)

#### 사용 예시

```tsx
import { MetricsCharts } from '@/components/monitoring';

export default function MonitoringPage() {
  return (
    <div className="p-6">
      <MetricsCharts />
    </div>
  );
}
```

### 5. 알림 센터 컴포넌트 ([NotificationCenter.tsx](src/components/monitoring/NotificationCenter.tsx))

실시간 알림 시스템입니다.

#### 기능
- ✅ 실시간 알림 수신 (Socket.io)
- ✅ 미읽음 개수 배지
- ✅ 알림 타입별 아이콘/색상
  - Success (초록색)
  - Error (빨간색)
  - Warning (노란색)
  - Info (파란색)
- ✅ 브라우저 알림 (Notification API)
- ✅ 알림 개별 삭제
- ✅ 전체 삭제
- ✅ 액션 링크 (선택적)
- ✅ 최대 50개 알림 유지

#### 사용 예시

```tsx
import { NotificationCenter } from '@/components/monitoring';

export default function Layout({ children }: { children: React.Node }) {
  return (
    <div>
      <header>
        <nav>
          {/* 오른쪽 상단에 배치 */}
          <NotificationCenter />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

#### 알림 권한 요청

컴포넌트가 마운트되면 자동으로 브라우저 알림 권한을 요청합니다.

```typescript
// 자동 권한 요청
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
```

### 6. 모니터링 대시보드 페이지 ([monitoring/page.tsx](src/app/(dashboard)/monitoring/page.tsx))

모든 컴포넌트를 통합한 완전한 대시보드입니다.

#### 레이아웃 구조

```
┌─────────────────────────────────────────────────────┐
│ Header (고정)                                        │
│ - 타이틀, 연결 상태, 알림 센터                         │
└─────────────────────────────────────────────────────┘
┌──────────────────────┬──────────────────────────────┐
│ ExecutionList        │ MetricsCharts                │
│ (5 columns)          │ (7 columns)                  │
│                      │ - 현재 메트릭 카드 (4개)       │
├──────────────────────┤ - 실행 추이 차트              │
│ LogStream            │ - 평균 실행 시간 차트          │
│ (h-[600px])          │ - 오류율 차트                 │
│                      │ - 큐 & 활성 실행 차트          │
│                      │ - AI 토큰 사용량 차트          │
└──────────────────────┴──────────────────────────────┘
```

## 🔧 백엔드 연동

### Socket.io 서버 설정

백엔드에서 Socket.io 서버를 구현해야 합니다:

```typescript
// backend/src/socket.ts
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 실행 업데이트 발송
  socket.on('execution:update', (data) => {
    io.emit('execution:update', data);
  });

  // 로그 메시지 발송
  socket.on('log:message', (data) => {
    io.emit('log:message', data);
  });

  // 메트릭 업데이트 발송
  socket.on('metric:update', (data) => {
    io.emit('metric:update', data);
  });

  // 알림 발송
  socket.on('notification', (data) => {
    io.emit('notification', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

### 이벤트 데이터 형식

**ExecutionUpdate**
```typescript
{
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  progress?: number;        // 0-100
  currentNode?: string;     // 현재 실행 중인 노드
  startedAt: string;        // ISO 8601
  stoppedAt?: string;
}
```

**LogMessage**
```typescript
{
  id: string;
  timestamp: string;        // ISO 8601
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  executionId?: string;
  workflowId?: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}
```

**MetricUpdate**
```typescript
{
  timestamp: string;
  executionsPerMinute: number;
  averageExecutionTime: number;  // milliseconds
  errorRate: number;              // 0-1 (0% - 100%)
  queueLength: number;
  activeExecutions: number;
  aiTokensUsed?: number;
}
```

**Notification**
```typescript
{
  id: string;
  type: 'error' | 'success' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  executionId?: string;
  workflowId?: string;
  action?: {
    label: string;
    url: string;
  };
}
```

## 🚀 사용 방법

### 1. 환경 변수 설정

`.env.local` 파일 생성:

```bash
# Socket.io 서버 URL
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

### 2. 백엔드 Socket.io 서버 실행

```bash
cd backend
npm run dev
```

### 3. 프론트엔드 실행

```bash
cd apps/frontend
npm run dev
```

### 4. 모니터링 대시보드 접속

```
http://localhost:3000/monitoring
```

## 🎨 커스터마이징

### 색상 테마 변경

```tsx
// 실행 상태 색상 커스터마이징
const statusColors = {
  running: 'text-blue-500',   // 기본: 파란색
  waiting: 'text-yellow-500', // 기본: 노란색
  success: 'text-green-500',  // 기본: 초록색
  error: 'text-red-500',      // 기본: 빨간색
};
```

### 최대 데이터 개수 조정

```typescript
// ExecutionList.tsx
const MAX_NOTIFICATIONS = 50; // 기본값: 50

// LogStream.tsx
const MAX_LOGS = 500; // 기본값: 500

// MetricsCharts.tsx
const MAX_DATA_POINTS = 60; // 기본값: 60 (60분)
```

### 차트 높이 조정

```tsx
<ResponsiveContainer width="100%" height={300}>
  {/* 기본: 200 */}
</ResponsiveContainer>
```

## 🔔 브라우저 알림 설정

브라우저 알림이 작동하려면 사용자가 권한을 허용해야 합니다:

1. 브라우저에서 알림 권한 요청 팝업 허용
2. 또는 브라우저 설정에서 수동으로 허용:
   - Chrome: 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 알림
   - Firefox: 설정 → 개인정보 보호 및 보안 → 권한 → 알림

## 📊 성능 최적화

### 메모리 관리

모든 컴포넌트는 최대 개수를 설정하여 메모리 사용을 제한합니다:
- ExecutionList: 각 상태별 10개 (총 40개)
- LogStream: 500개
- MetricsCharts: 60개 (1시간)
- NotificationCenter: 50개

### 리렌더링 최적화

```tsx
// React.memo를 사용한 불필요한 리렌더링 방지
const MemoizedChart = React.memo(MetricsCharts);

// useCallback으로 핸들러 메모이제이션
const handleLogMessage = useCallback((log: LogMessage) => {
  setLogs((prev) => [log, ...prev].slice(0, MAX_LOGS));
}, []);
```

## 🐛 트러블슈팅

### Socket.io 연결 실패

**증상**: "연결 끊김" 메시지 표시

**해결 방법**:
1. 백엔드 서버가 실행 중인지 확인
2. `NEXT_PUBLIC_SOCKET_URL` 환경 변수 확인
3. CORS 설정 확인 (백엔드)
4. 방화벽/프록시 설정 확인

### 브라우저 알림이 작동하지 않음

**해결 방법**:
1. HTTPS 환경에서 실행 (localhost는 HTTP 허용)
2. 브라우저 알림 권한 확인
3. 콘솔에서 `Notification.permission` 확인

### 차트가 표시되지 않음

**해결 방법**:
1. Socket.io 연결 상태 확인
2. 백엔드에서 메트릭 데이터 발송 확인
3. 브라우저 개발자 도구 콘솔 확인

## 📚 참고 자료

- [Socket.io 문서](https://socket.io/docs/v4/)
- [Recharts 문서](https://recharts.org/en-US/)
- [Notification API](https://developer.mozilla.org/ko/docs/Web/API/Notifications_API)
- [date-fns 문서](https://date-fns.org/)
