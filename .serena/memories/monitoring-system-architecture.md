# Monitoring System Architecture

## Overview

gonsai2 프로젝트의 n8n 워크플로우 실행 모니터링 시스템. 실시간 메트릭 수집, 알림, 로그 집계, 대시보드 데이터를 제공합니다.

## Core Components

### 1. MetricsCollector Service
- **Location**: `features/monitoring/services/metrics-collector.service.ts`
- **Purpose**: n8n 실행 메트릭 수집 및 저장
- **Features**:
  - 실행 시간, 노드별 처리 시간 추적
  - AI 토큰 사용량 및 비용 계산 (GPT-4, GPT-3.5, Claude 3 시리즈)
  - 성공/실패율 계산
  - 리소스 사용량 모니터링 (CPU, 메모리, 네트워크)
- **Storage**: MongoDB `execution_metrics` collection
- **Key Methods**:
  - `saveExecutionMetric()`: 실행 메트릭 저장
  - `calculateAITokenUsage()`: AI 비용 계산
  - `getWorkflowStatistics()`: 워크플로우별 통계
  - `calculateSuccessRate()`: 성공률 계산

### 2. DashboardService
- **Location**: `features/monitoring/services/dashboard.service.ts`
- **Purpose**: 대시보드용 통합 데이터 제공
- **Features**:
  - 실시간 실행 상태
  - 워크플로우별 통계
  - 오류 트렌드 분석
  - 비용 분석 (워크플로우별, AI 제공자별)
  - 시스템 헬스 체크 (n8n API, Redis, MongoDB, CPU, 메모리)
- **Data Sources**: MetricsCollector, ExecutionQueue, N8nClient
- **Key Methods**:
  - `getDashboardData()`: 전체 대시보드 데이터
  - `getOverview()`: 개요 통계
  - `getRealtimeStatus()`: 실시간 상태
  - `getSystemHealth()`: 시스템 헬스
  - `getErrorTrend()`: 오류 트렌드
  - `getCostAnalysis()`: 비용 분석

### 3. AlertManager Service
- **Location**: `features/monitoring/services/alert-manager.service.ts`
- **Purpose**: 임계값 기반 알림 시스템
- **Features**:
  - Cron 기반 주기적 체크 (1분마다)
  - 3개 기본 알림 규칙:
    * `high_failure_rate`: 실패율 > 10% (critical)
    * `slow_execution`: 평균 실행 시간 > 30초 (warning)
    * `high_cost`: AI 비용 > $10 (warning)
  - 다중 채널 지원: console, email, webhook, Slack, Discord
  - 쿨다운 메커니즘 (알림 스팸 방지)
- **Storage**: MongoDB `alerts` collection
- **Key Methods**:
  - `start()`: 알림 모니터링 시작
  - `stop()`: 알림 모니터링 중지
  - `getAlerts()`: 알림 조회
  - `acknowledgeAlert()`: 알림 확인
  - `resolveAlert()`: 알림 해결

### 4. LogAggregator Service
- **Location**: `features/monitoring/services/log-aggregator.service.ts`
- **Purpose**: 다양한 로그 소스 집계 및 통합
- **Features**:
  - Cron 기반 주기적 집계 (5분마다)
  - 다중 소스 지원:
    * 파일 소스: combined.log, error.log
    * 데이터베이스 소스: n8n execution logs
    * 스트림 소스 (실시간 처리)
  - 로그 파싱: JSON, text 형식
  - 자동 중복 제거 (같은 메시지는 count 증가)
  - 30일 자동 보관 정책 (TTL 인덱스)
- **Storage**: MongoDB `aggregated_logs` collection
- **Key Methods**:
  - `start()`: 로그 집계 시작
  - `getLogs()`: 로그 조회
  - `getLogStatistics()`: 로그 통계

### 5. Winston Monitoring Transport
- **Location**: `features/monitoring/services/winston-monitoring-transport.ts`
- **Purpose**: Winston 로거와 모니터링 시스템 통합
- **Features**:
  - Winston Transport 확장
  - 로그를 LogAggregator로 자동 전송
  - 소스 이름 커스터마이징 가능
- **Usage**:
```typescript
import { createLogger } from 'winston';
import { WinstonMonitoringTransport } from './winston-monitoring-transport';

const logger = createLogger({
  transports: [
    new WinstonMonitoringTransport({ sourceName: 'my-service' })
  ]
});
```

### 6. MonitoringService (Orchestrator)
- **Location**: `features/monitoring/services/monitoring.service.ts`
- **Purpose**: 모든 모니터링 컴포넌트 통합 관리
- **Features**:
  - 싱글톤 패턴
  - 통합 초기화 및 lifecycle 관리
  - 모든 모니터링 기능에 대한 편의 메서드 제공
- **Key Methods**:
  - `initialize()`: 모든 컴포넌트 초기화
  - `start()`: 모니터링 시작
  - `disconnect()`: 연결 종료
  - 모든 하위 서비스 메서드 프록시

## Data Flow

```
n8n Workflow Execution
  ↓
ExecutionMetric
  ↓
MetricsCollector.saveExecutionMetric()
  ↓
MongoDB (execution_metrics)
  ↓
┌─────────────────┬─────────────────┬─────────────────┐
↓                 ↓                 ↓                 ↓
DashboardService  AlertManager     LogAggregator     Winston Transport
  ↓                 ↓                 ↓                 ↓
API Endpoints     Alert Channels   Log Storage       Log Storage
```

## MongoDB Collections

### execution_metrics
- **Purpose**: 워크플로우 실행 메트릭
- **Indexes**:
  - `executionId` (unique)
  - `workflowId + startedAt` (compound, descending)
  - `status + startedAt` (compound, descending)
  - `startedAt` (descending)

### alerts
- **Purpose**: 알림 기록
- **Indexes**:
  - `triggeredAt` (descending)
  - `resolved + level + triggeredAt` (compound)

### aggregated_logs
- **Purpose**: 집계된 로그
- **Indexes**:
  - `timestamp` (descending)
  - `source + timestamp` (compound)
  - `level + timestamp` (compound)
  - `timestamp` (TTL: 30일)

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/gonsai2

# Email Alerts (선택)
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_USER=your-email@gmail.com
ALERT_EMAIL_PASSWORD=your-app-password
ALERT_EMAIL_FROM=alerts@gonsai.com
ALERT_EMAIL_TO=admin@gonsai.com

# Slack Alerts (선택)
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_SLACK_CHANNEL=#alerts

# Discord Alerts (선택)
ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Integration Points

### Express Server Integration
```typescript
import { MonitoringService } from './features/monitoring/services/monitoring.service';

const monitoringService = MonitoringService.getInstance();

app.listen(PORT, async () => {
  await monitoringService.initialize();
  monitoringService.start();
});
```

### n8n Webhook Hook
```typescript
import { metricsCollector } from './features/monitoring/services/metrics-collector.service';

// n8n 실행 완료 후
const metric: ExecutionMetric = {
  executionId: execution.id,
  workflowId: workflow.id,
  // ... 기타 메트릭
};

await metricsCollector.saveExecutionMetric(metric);
```

## API Endpoints

```
GET  /api/monitoring/dashboard?timeRange=day
GET  /api/monitoring/metrics/workflow/:workflowId
GET  /api/monitoring/realtime
GET  /api/monitoring/health
GET  /api/monitoring/alerts
POST /api/monitoring/alerts/:id/acknowledge
POST /api/monitoring/alerts/:id/resolve
GET  /api/monitoring/logs
GET  /api/monitoring/logs/statistics
```

## Performance Considerations

1. **Indexes**: MongoDB 인덱스로 쿼리 성능 최적화
2. **Batch Processing**: 로그 집계 시 최근 100줄만 처리
3. **Cron Interval**: 알림 체크 1분, 로그 집계 5분
4. **TTL Index**: 30일 자동 삭제로 디스크 사용량 관리
5. **Aggregation**: MongoDB aggregation pipeline 사용

## Testing

- **Location**: `features/monitoring/tests/monitoring.test.ts`
- **Coverage**: 모든 주요 기능 통합 테스트
- **Run**: `npm test features/monitoring`

## Documentation

- **Main**: `features/monitoring/README.md`
- **Types**: `features/monitoring/types/monitoring.types.ts` (JSDoc)
