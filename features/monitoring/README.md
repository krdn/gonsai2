# Monitoring System

n8n 워크플로우 실행을 실시간으로 모니터링하고 알림을 관리하는 통합 모니터링 시스템입니다.

## 📋 목차

- [아키텍처](#아키텍처)
- [주요 기능](#주요-기능)
- [설치 및 설정](#설치-및-설정)
- [사용 방법](#사용-방법)
- [구성 요소](#구성-요소)
- [알림 설정](#알림-설정)
- [대시보드 API](#대시보드-api)
- [통합 가이드](#통합-가이드)

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring System                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Winston    │───>│     Log      │───>│   MongoDB    │  │
│  │   Logger     │    │  Aggregator  │    │   Storage    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                         │          │
│         v                                         v          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Execution   │───>│   Metrics    │───>│  Dashboard   │  │
│  │   n8n API    │    │  Collector   │    │   Service    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                    │          │
│                              v                    v          │
│                     ┌──────────────┐    ┌──────────────┐   │
│                     │    Alert     │───>│   Webhook    │   │
│                     │   Manager    │    │ Slack/Discord│   │
│                     └──────────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 주요 기능

### 1. 메트릭 수집 (MetricsCollector)

- **실행 메트릭**: 워크플로우 실행 시간, 성공/실패 추적
- **노드별 성능**: 개별 노드 처리 시간 및 데이터 흐름
- **AI 토큰 사용량**: OpenAI, Anthropic 등 AI 모델 토큰 및 비용 추적
- **리소스 사용량**: CPU, 메모리, 네트워크 사용률

### 2. 대시보드 데이터 (DashboardService)

- **실시간 실행 상태**: 현재 실행 중인 워크플로우, 큐 상태
- **워크플로우별 통계**: 성공률, 평균 실행 시간, 비용 분석
- **오류 트렌드**: 시간대별 오류 발생 패턴 및 빈도
- **비용 분석**: AI 제공자별 비용 분포, 월간 예상 비용
- **시스템 헬스**: n8n API, MongoDB, Redis 연결 상태

### 3. 알림 관리 (AlertManager)

- **임계값 기반 알림**:
  - 실행 실패율 > 10%
  - 평균 실행 시간 > 30초
  - AI 비용 초과
- **알림 채널**:
  - 콘솔 로그
  - 이메일 (SMTP)
  - Webhook (일반)
  - Slack
  - Discord
- **쿨다운 메커니즘**: 알림 스팸 방지

### 4. 로그 집계 (LogAggregator)

- **다중 소스 지원**: 파일, 데이터베이스, 스트림
- **자동 집계**: 5분 간격으로 로그 수집 및 분석
- **로그 보존**: 30일 자동 정리
- **통계 제공**: 소스별, 레벨별 로그 통계

---

## 설치 및 설정

### 1. 환경 변수 설정

`.env` 파일에 다음 변수 추가:

```bash
# MongoDB (필수)
MONGODB_URI=mongodb://superadmin:password@localhost:27017/gonsai2?authSource=admin

# 로그 레벨
LOG_LEVEL=info

# 알림 - 이메일 (선택)
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_TO=admin@example.com
ALERT_EMAIL_FROM=noreply@example.com
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=your-email@gmail.com
ALERT_SMTP_PASSWORD=your-app-password

# 알림 - Webhook (선택)
ALERT_WEBHOOK_URL=https://your-webhook-url

# 알림 - Slack (선택)
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#monitoring

# 알림 - Discord (선택)
ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### 2. 의존성 설치

```bash
npm install
```

필수 패키지:

- `winston`: 구조화된 로깅
- `mongodb`: 데이터 저장
- `cron`: 스케줄링

### 3. MongoDB 초기화

```bash
npm run init:mongodb
```

생성되는 컬렉션:

- `execution_metrics`: 실행 메트릭
- `alert_rules`: 알림 규칙
- `alerts`: 알림 이력
- `aggregated_logs`: 집계된 로그

---

## 사용 방법

### 기본 사용법

```typescript
import { monitoringService } from './features/monitoring/services/monitoring.service';

// 모니터링 시스템 초기화 및 시작
async function startMonitoring() {
  await monitoringService.initialize();
  monitoringService.start();
}

// 서버 시작 시 호출
startMonitoring();
```

### 실행 메트릭 기록

```typescript
import { metricsCollector } from './features/monitoring/services/metrics-collector.service';

// 워크플로우 실행 후
const executionMetric = {
  executionId: 'exec-123',
  workflowId: 'workflow-456',
  workflowName: 'My Workflow',
  status: 'success',
  startedAt: new Date('2024-01-15T10:00:00Z'),
  finishedAt: new Date('2024-01-15T10:00:05Z'),
  duration: 5000,
  nodeMetrics: [
    {
      nodeId: 'node-1',
      nodeName: 'HTTP Request',
      nodeType: 'n8n-nodes-base.httpRequest',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      finishedAt: new Date('2024-01-15T10:00:03Z'),
      duration: 3000,
      inputItems: 1,
      outputItems: 1,
    },
  ],
  aiTokenUsage: {
    model: 'gpt-4-turbo',
    promptTokens: 100,
    completionTokens: 200,
    totalTokens: 300,
    cost: 0.002,
    provider: 'openai',
  },
  resourceUsage: {
    cpuPercent: 15.5,
    memoryMB: 256,
    networkKB: 128,
  },
};

await metricsCollector.saveExecutionMetric(executionMetric);
```

### 대시보드 데이터 조회

```typescript
import { monitoringService } from './features/monitoring/services/monitoring.service';

// 최근 24시간 데이터
const timeRange = monitoringService.createTimeRange(24, 'hour');
const dashboardData = await monitoringService.getDashboardData(timeRange);

console.log('Overview:', dashboardData.overview);
console.log('Realtime Status:', dashboardData.realtimeStatus);
console.log('Workflow Statistics:', dashboardData.workflowStatistics);
console.log('Error Trend:', dashboardData.errorTrend);
console.log('Cost Analysis:', dashboardData.costAnalysis);
```

### 알림 조회 및 관리

```typescript
// 미해결 알림 조회
const unresolvedAlerts = await monitoringService.getAlerts(false);

// 중요 알림만 조회
const criticalAlerts = await monitoringService.getAlerts(false, 'critical');

// 알림 확인
await monitoringService.acknowledgeAlert('alert-123', 'admin');

// 알림 해결
await monitoringService.resolveAlert('alert-123');
```

---

## 구성 요소

### MetricsCollector

**파일**: `services/metrics-collector.service.ts`

**주요 메서드**:

- `saveExecutionMetric(metric)`: 실행 메트릭 저장
- `calculateNodeMetrics(...)`: 노드 메트릭 계산
- `calculateAITokenUsage(...)`: AI 토큰 사용량 및 비용 계산
- `getWorkflowStatistics(workflowId, timeRange)`: 워크플로우 통계 조회
- `calculateSuccessRate(timeRange)`: 성공률 계산

**AI 모델 비용** (per 1K tokens):

```typescript
const AI_MODEL_COSTS = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.001, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
};
```

### DashboardService

**파일**: `services/dashboard.service.ts`

**주요 메서드**:

- `getDashboardData(timeRange)`: 전체 대시보드 데이터
- `getOverview(timeRange)`: 대시보드 개요
- `getRealtimeStatus()`: 실시간 실행 상태
- `getSystemHealth()`: 시스템 헬스
- `getErrorTrend(timeRange)`: 오류 트렌드
- `getCostAnalysis(timeRange)`: 비용 분석

### AlertManager

**파일**: `services/alert-manager.service.ts`

**주요 메서드**:

- `initialize()`: 알림 규칙 로드 및 채널 설정
- `start()`: 알림 모니터링 시작 (1분 간격)
- `getAlerts(resolved, level, limit)`: 알림 조회
- `acknowledgeAlert(alertId, acknowledgedBy)`: 알림 확인
- `resolveAlert(alertId)`: 알림 해결

**기본 알림 규칙**:

```typescript
[
  {
    id: 'high_failure_rate',
    name: 'High Failure Rate',
    description: '실행 실패율이 10% 초과',
    threshold: 10,
    level: 'critical',
    cooldownMinutes: 30,
  },
  {
    id: 'slow_execution',
    name: 'Slow Execution',
    description: '평균 실행 시간이 30초 초과',
    threshold: 30000,
    level: 'warning',
    cooldownMinutes: 15,
  },
  {
    id: 'high_cost',
    name: 'High AI Cost',
    description: 'AI 비용이 $10 초과',
    threshold: 10,
    level: 'warning',
    cooldownMinutes: 60,
  },
];
```

### LogAggregator

**파일**: `services/log-aggregator.service.ts`

**주요 메서드**:

- `initialize()`: 로그 소스 설정 및 MongoDB 연결
- `start()`: 로그 집계 시작 (5분 간격)
- `getLogs(source, level, startDate, endDate, limit)`: 로그 조회
- `getLogStatistics(startDate, endDate)`: 로그 통계

**로그 소스 설정**:

```typescript
{
  sources: [
    {
      name: 'application',
      type: 'file',
      path: 'logs/combined.log',
      parser: 'json',
    },
    {
      name: 'error',
      type: 'file',
      path: 'logs/error.log',
      parser: 'json',
    },
  ],
  retention: {
    days: 30,
    maxSize: 1000, // MB
  },
}
```

---

## 알림 설정

### Slack 알림

1. Slack Incoming Webhook 생성:
   - Slack App 설정 → Incoming Webhooks 활성화
   - Webhook URL 복사

2. 환경 변수 설정:

```bash
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_SLACK_CHANNEL=#monitoring
```

### Discord 알림

1. Discord Webhook 생성:
   - 서버 설정 → 통합 → Webhook 생성
   - Webhook URL 복사

2. 환경 변수 설정:

```bash
ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### 이메일 알림

1. Gmail App Password 생성 (Gmail 사용 시):
   - Google 계정 설정 → 보안 → 2단계 인증 → 앱 비밀번호

2. 환경 변수 설정:

```bash
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_TO=admin@example.com
ALERT_EMAIL_FROM=noreply@example.com
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=your-email@gmail.com
ALERT_SMTP_PASSWORD=your-app-password
```

---

## 대시보드 API

### REST API 엔드포인트

`apps/backend/src/routes/monitoring.routes.ts`:

```typescript
import express from 'express';
import { monitoringService } from '../../../features/monitoring/services/monitoring.service';

const router = express.Router();

// 대시보드 데이터
router.get('/dashboard', async (req, res) => {
  const { duration = 24, unit = 'hour' } = req.query;
  const timeRange = monitoringService.createTimeRange(parseInt(duration as string), unit as any);
  const data = await monitoringService.getDashboardData(timeRange);
  res.json(data);
});

// 실시간 상태
router.get('/realtime', async (req, res) => {
  const status = await monitoringService.getRealtimeStatus();
  res.json(status);
});

// 시스템 헬스
router.get('/health', async (req, res) => {
  const health = await monitoringService.getSystemHealth();
  res.json(health);
});

// 워크플로우 통계
router.get('/workflows/:workflowId/statistics', async (req, res) => {
  const { workflowId } = req.params;
  const { duration = 24, unit = 'hour' } = req.query;
  const timeRange = monitoringService.createTimeRange(parseInt(duration as string), unit as any);
  const stats = await monitoringService.getWorkflowStatistics(workflowId, timeRange);
  res.json(stats);
});

// 알림 조회
router.get('/alerts', async (req, res) => {
  const { resolved, level, limit = '50' } = req.query;
  const alerts = await monitoringService.getAlerts(
    resolved === 'true',
    level as any,
    parseInt(limit as string)
  );
  res.json(alerts);
});

// 알림 확인
router.post('/alerts/:alertId/acknowledge', async (req, res) => {
  const { alertId } = req.params;
  const { acknowledgedBy } = req.body;
  await monitoringService.acknowledgeAlert(alertId, acknowledgedBy);
  res.json({ success: true });
});

// 로그 조회
router.get('/logs', async (req, res) => {
  const { source, level, startDate, endDate, limit = '100' } = req.query;
  const logs = await monitoringService.getLogs(
    source as string,
    level as string,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined,
    parseInt(limit as string)
  );
  res.json(logs);
});

export default router;
```

---

## 통합 가이드

### Express 서버 통합

`apps/backend/src/server.ts`:

```typescript
import { monitoringService } from '../../features/monitoring/services/monitoring.service';
import monitoringRoutes from './routes/monitoring.routes';

// 서버 시작 전 초기화
async function initializeServices() {
  // 모니터링 시스템 초기화
  await monitoringService.initialize();
  monitoringService.start();
  console.log('Monitoring system started');
}

// 라우트 등록
app.use('/api/monitoring', monitoringRoutes);

// 서버 시작
app.listen(PORT, async () => {
  await initializeServices();
  console.log(`Server running on port ${PORT}`);
});

// 서버 종료 시
process.on('SIGTERM', async () => {
  await monitoringService.disconnect();
  console.log('Monitoring system stopped');
  process.exit(0);
});
```

### Winston Logger 통합

기존 Winston logger에 모니터링 Transport 추가:

```typescript
import { logger } from './apps/backend/src/utils/logger';
import { WinstonMonitoringTransport } from './features/monitoring/services/winston-monitoring-transport';

// 모니터링 Transport 추가
logger.add(
  new WinstonMonitoringTransport({
    level: 'info',
    sourceName: 'application',
  })
);
```

### WebSocket 이벤트

```typescript
// 알림 이벤트
{
  type: 'alert.triggered',
  data: {
    id: 'alert-123',
    ruleName: 'High Failure Rate',
    level: 'critical',
    message: '실행 실패율이 10% 초과: 15.5% (threshold: 10)',
    triggeredAt: '2024-01-15T10:30:00Z',
  },
  timestamp: '2024-01-15T10:30:00Z',
}

// 실시간 메트릭 이벤트
{
  type: 'metrics.realtime',
  data: {
    runningExecutions: 3,
    queuedExecutions: 5,
    systemLoad: 0.45,
  },
  timestamp: '2024-01-15T10:30:00Z',
}
```

---

## 성능 최적화

### 인덱스 최적화

```javascript
// execution_metrics 컬렉션
db.execution_metrics.createIndex({ executionId: 1 }, { unique: true });
db.execution_metrics.createIndex({ workflowId: 1, startedAt: -1 });
db.execution_metrics.createIndex({ status: 1, startedAt: -1 });

// alerts 컬렉션
db.alerts.createIndex({ ruleId: 1, triggeredAt: -1 });
db.alerts.createIndex({ level: 1, resolved: 1 });

// aggregated_logs 컬렉션 (TTL 인덱스)
db.aggregated_logs.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000 } // 30일
);
```

### 배치 처리

```typescript
// 여러 메트릭 한 번에 저장
const metrics = [...]; // 여러 ExecutionMetric
await Promise.all(
  metrics.map(metric => metricsCollector.saveExecutionMetric(metric))
);
```

---

## 트러블슈팅

### 알림이 전송되지 않음

**원인**:

- 알림 규칙이 비활성화됨
- 쿨다운 기간 중
- 채널 설정 오류

**해결**:

```typescript
// 알림 규칙 확인
const rules = await alertManager['rulesCollection'].find().toArray();
console.log('Alert rules:', rules);

// 채널 설정 확인
const configs = alertManager['channelConfigs'];
console.log('Channel configs:', Array.from(configs.entries()));
```

### 메트릭이 저장되지 않음

**원인**:

- MongoDB 연결 실패
- 스키마 검증 오류

**해결**:

```bash
# MongoDB 연결 확인
npm run test:mongodb

# 컬렉션 확인
mongosh "$MONGODB_URI" --eval "db.getCollectionNames()"
```

### 로그 집계가 실행되지 않음

**원인**:

- Cron 스케줄 오류
- 로그 파일 경로 오류

**해결**:

```typescript
// 로그 집계 상태 확인
const config = logAggregator.getConfig();
console.log('Log aggregation config:', config);

// 수동 집계 실행
await logAggregator['aggregate']();
```

---

## 라이선스

MIT License

---

## 지원

문제가 발생하면 GitHub Issues에 등록해주세요.

**관련 문서**:

- [Error Healing](../error-healing/README.md)
- [Agent Orchestration](../agent-orchestration/ARCHITECTURE.md)
- [Backend API](../../apps/backend/README.md)
