# Error Healing System

n8n 워크플로우 실행 오류를 자동으로 감지하고 수정하는 지능형 시스템입니다.

## 📋 목차

- [아키텍처](#아키텍처)
- [주요 기능](#주요-기능)
- [설치 및 설정](#설치-및-설정)
- [사용 방법](#사용-방법)
- [구성 요소](#구성-요소)
- [통합 가이드](#통합-가이드)
- [모니터링](#모니터링)
- [트러블슈팅](#트러블슈팅)

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     Error Healing System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  n8n Error   │───>│   Pattern    │───>│   Analyze    │  │
│  │   Detected   │    │   Matching   │    │  Confidence  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                                         │          │
│         v                                         v          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   MongoDB    │<───│  Auto Healing│<───│    Claude    │  │
│  │   Storage    │    │    Service   │    │   Analyzer   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                     │                    │         │
│         v                     v                    v         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Fix History │    │   Workflow   │    │    AI Fix    │  │
│  │   Tracking   │    │    Fixer     │    │  Suggestions │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                               │
│                              v                               │
│                     ┌──────────────┐                        │
│                     │  WebSocket   │                        │
│                     │ Notification │                        │
│                     └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 주요 기능

### 1. 자동 오류 감지 및 분류

- **15가지 오류 패턴** 데이터베이스
- **8가지 오류 유형**: 노드 연결, 인증, 타임아웃, 데이터 형식, API, 자격증명, 표현식, 워크플로우 구조
- **4단계 심각도**: critical, high, medium, low
- **신뢰도 점수**: 패턴 매칭 수에 따라 자동 계산

### 2. 지능형 수정 전략

- **6가지 수정 전략**:
  - `reconnect_nodes`: 노드 재연결
  - `update_credential`: 인증 정보 갱신
  - `adjust_timeout`: 타임아웃 조정
  - `add_data_transformation`: 데이터 변환 로직 추가
  - `add_error_handler`: 에러 핸들러 추가
  - `update_expression`: 표현식 업데이트

- **자동 백업 및 롤백**: 수정 실패 시 자동 복원
- **테스트 실행**: 수정 후 자동으로 워크플로우 테스트

### 3. 자동 복구 워크플로우

- **Cron 스케줄링**: 기본 5분마다 실행
- **자동 수정 시도**: 설정된 심각도 이하 오류는 자동 수정
- **승인 플로우**: 민감한 작업(인증, 자격증명)은 수동 승인 필요
- **재시도 메커니즘**: 최대 3회 재시도, 5분 간격

### 4. Claude AI 통합

- **고급 오류 분석**: 복잡한 오류의 근본 원인 분석
- **코드 수정 제안**: 우선순위, 단계별 가이드, 위험 요소 포함
- **워크플로우 최적화**: 성능 및 안정성 개선 제안

---

## 설치 및 설정

### 1. 환경 변수 설정

`.env` 파일에 다음 변수 추가:

```bash
# Claude API (선택사항)
ANTHROPIC_API_KEY=your-claude-api-key

# MongoDB (필수)
MONGODB_URI=mongodb://superadmin:password@localhost:27017/gonsai2?authSource=admin

# n8n API (필수)
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
```

### 2. 의존성 설치

```bash
npm install
```

필수 패키지:
- `cron`: 스케줄링
- `mongodb`: 데이터 저장
- `winston`: 로깅

### 3. MongoDB 컬렉션 초기화

```bash
npm run init:mongodb
```

생성되는 컬렉션:
- `analyzed_errors`: 분석된 오류
- `workflow_fixes`: 수정 결과
- `healing_history`: 복구 이력

---

## 사용 방법

### 기본 사용법

```typescript
import { autoHealingService } from './features/error-healing/services/auto-healing.service';

// 자동 복구 시작
autoHealingService.start();

// 자동 복구 중지
autoHealingService.stop();
```

### 수동 오류 분석

```typescript
import { errorAnalyzer } from './features/error-healing/services/error-analyzer.service';

// 단일 오류 분석
const executionError = {
  workflowId: 'workflow-123',
  workflowName: 'My Workflow',
  executionId: 'exec-456',
  nodeName: 'HTTP Request',
  nodeType: 'n8n-nodes-base.httpRequest',
  errorMessage: 'Request timeout after 30000ms',
  timestamp: new Date(),
};

const analyzed = await errorAnalyzer.analyzeError(executionError);

console.log('Error Type:', analyzed.errorType);
console.log('Severity:', analyzed.severity);
console.log('Auto Fixable:', analyzed.autoFixable);
console.log('Confidence:', analyzed.confidence);
console.log('Suggested Fixes:', analyzed.suggestedFixes);
```

### 수동 워크플로우 수정

```typescript
import { workflowFixer } from './features/error-healing/services/workflow-fixer.service';

// 수정 요청
const fixRequest = {
  workflowId: 'workflow-123',
  analyzedError: analyzed,
  fixStrategy: {
    id: 'adjust_timeout',
    name: 'Adjust Timeout',
    errorType: 'timeout',
    description: '타임아웃 값 조정',
    steps: [
      {
        order: 1,
        action: 'update_node_parameter',
        parameters: {
          parameterName: 'timeout',
          increment: 10000,
        },
        rollbackable: true,
        description: '타임아웃 10초 증가',
      },
    ],
    requiresApproval: false,
    estimatedTime: 5,
  },
  approvedBy: 'system',
};

const result = await workflowFixer.fixWorkflow(fixRequest);

if (result.success) {
  console.log('Fix applied successfully!');
  console.log('Test Status:', result.testStatus);
} else {
  console.log('Fix failed:', result.error);
}
```

### Claude AI 분석 사용

```typescript
import { claudeAnalyzer } from './features/error-healing/services/claude-analyzer.service';

// 복잡한 오류 분석
const claudeAnalysis = await claudeAnalyzer.analyzeComplexError(analyzed);

console.log('Root Cause:', claudeAnalysis.rootCause);
console.log('Explanation:', claudeAnalysis.detailedExplanation);
console.log('Suggested Fixes:');
claudeAnalysis.suggestedFixes.forEach((fix) => {
  console.log(`- ${fix.description} (Priority: ${fix.priority})`);
  console.log(`  Steps:`, fix.steps);
  console.log(`  Risks:`, fix.risks);
});
```

---

## 구성 요소

### N8nErrorAnalyzer

**파일**: `services/error-analyzer.service.ts`

**주요 메서드**:
- `analyzeError(executionError)`: 단일 오류 분석
- `analyzeMultipleErrors(errors)`: 여러 오류 배치 분석
- `getRecentErrors(limit)`: 최근 오류 조회
- `getErrorStatistics(timeRange)`: 오류 통계

**오류 패턴 예시**:
```typescript
{
  id: 'auth_01',
  name: 'Invalid Credentials',
  errorType: 'authentication',
  pattern: /invalid (credentials|api key|token)/i,
  severity: 'critical',
  autoFixable: false,
  fixStrategy: 'update_credential',
  description: '인증 정보가 유효하지 않음',
}
```

### WorkflowFixer

**파일**: `services/workflow-fixer.service.ts`

**주요 메서드**:
- `fixWorkflow(request)`: 워크플로우 수정
- `backupWorkflow(workflowId)`: 워크플로우 백업
- `rollbackWorkflow(workflowId, backup)`: 워크플로우 복원
- `testWorkflow(workflowId, error)`: 수정 후 테스트

**수정 전략 예시**:
```typescript
{
  id: 'reconnect_nodes',
  name: 'Reconnect Nodes',
  errorType: 'node_connection',
  steps: [
    {
      order: 1,
      action: 'reconnect_nodes',
      parameters: {},
      rollbackable: true,
      description: '끊어진 노드 연결 복구',
    },
  ],
  requiresApproval: false,
  estimatedTime: 5,
}
```

### AutoHealingService

**파일**: `services/auto-healing.service.ts`

**주요 메서드**:
- `start()`: 자동 복구 시작
- `stop()`: 자동 복구 중지
- `healingCycle()`: 복구 사이클 실행
- `getHealingHistory(filter)`: 복구 이력 조회
- `getHealingStatistics()`: 복구 통계

**설정 옵션**:
```typescript
{
  enabled: true,
  cronSchedule: '*/5 * * * *',  // 5분마다
  maxRetries: 3,
  retryDelay: 300,  // 5분 (초)
  autoFixSeverity: ['medium', 'low'],
  requireApprovalFor: ['authentication', 'credential_missing'],
  notifyOnFailure: true,
  notifyChannels: ['websocket'],
}
```

### ClaudeAnalyzer

**파일**: `services/claude-analyzer.service.ts`

**주요 메서드**:
- `analyzeWithClaude(request)`: Claude API로 오류 분석
- `analyzeComplexError(analyzedError)`: 복잡한 오류 분석
- `suggestOptimizations(workflowId, definition)`: 워크플로우 최적화 제안

**응답 형식**:
```typescript
{
  rootCause: '근본 원인',
  detailedExplanation: '상세 설명',
  suggestedFixes: [
    {
      description: '수정 방법',
      steps: ['단계1', '단계2'],
      priority: 'high',
      estimatedImpact: '예상 효과',
      risks: ['위험1', '위험2'],
    },
  ],
  confidence: 0.85,
}
```

---

## 통합 가이드

### Express 서버 통합

`apps/backend/src/server.ts`에 추가:

```typescript
import { autoHealingService } from '../../features/error-healing/services/auto-healing.service';

// 서버 시작 시 자동 복구 시작
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // 자동 복구 시작
  autoHealingService.start();
  console.log('Auto-healing service started');
});

// 서버 종료 시 자동 복구 중지
process.on('SIGTERM', () => {
  autoHealingService.stop();
  console.log('Auto-healing service stopped');
  process.exit(0);
});
```

### WebSocket 이벤트

```typescript
// 복구 성공 이벤트
{
  type: 'healing.success',
  data: {
    workflowId: 'workflow-123',
    errorType: 'timeout',
    fixStrategy: 'Adjust Timeout',
    duration: 5230,
  },
  timestamp: '2024-01-15T10:30:00Z',
}

// 복구 실패 이벤트
{
  type: 'healing.failure',
  data: {
    workflowId: 'workflow-123',
    errorType: 'authentication',
    reason: 'Requires manual approval',
  },
  timestamp: '2024-01-15T10:30:00Z',
}

// 최대 재시도 도달
{
  type: 'healing.max_retries',
  data: {
    workflowId: 'workflow-123',
    errorType: 'api_error',
    retries: 3,
  },
  timestamp: '2024-01-15T10:30:00Z',
}
```

### REST API 엔드포인트 추가

`apps/backend/src/routes/healing.routes.ts`:

```typescript
import express from 'express';
import { autoHealingService } from '../../../features/error-healing/services/auto-healing.service';
import { errorAnalyzer } from '../../../features/error-healing/services/error-analyzer.service';

const router = express.Router();

// 복구 이력 조회
router.get('/history', async (req, res) => {
  const { workflowId, startDate, endDate } = req.query;
  const history = await autoHealingService.getHealingHistory({
    workflowId: workflowId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
  });
  res.json(history);
});

// 복구 통계 조회
router.get('/statistics', async (req, res) => {
  const stats = await autoHealingService.getHealingStatistics();
  res.json(stats);
});

// 최근 오류 조회
router.get('/errors/recent', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const errors = await errorAnalyzer.getRecentErrors(limit);
  res.json(errors);
});

// 수동 복구 트리거
router.post('/heal/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  // 수동 복구 로직
  res.json({ success: true });
});

export default router;
```

---

## 모니터링

### 헬스체크 스크립트

```bash
# 시스템 전체 상태 확인
./scripts/n8n-health-check.sh

# 상세 정보 출력
./scripts/n8n-health-check.sh --verbose

# JSON 형식 출력
./scripts/n8n-health-check.sh --json
```

**체크 항목**:
1. n8n API 연결
2. Redis 상태 및 메모리
3. MongoDB 연결
4. Docker 컨테이너 상태
5. 최근 오류 개수
6. 디스크 사용량
7. 메모리 사용량
8. 백엔드 프로세스

### 로그 모니터링

```bash
# 자동 복구 로그
tail -f logs/auto-healing.log

# 오류 분석 로그
tail -f logs/error-analysis.log

# 워크플로우 수정 로그
tail -f logs/workflow-fix.log
```

### MongoDB 쿼리

```javascript
// 최근 24시간 복구 성공률
db.healing_history.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 },
    },
  },
]);

// 오류 유형별 통계
db.analyzed_errors.aggregate([
  {
    $group: {
      _id: '$errorType',
      count: { $sum: 1 },
      avgConfidence: { $avg: '$confidence' },
    },
  },
  { $sort: { count: -1 } },
]);

// 수정 전략별 성공률
db.workflow_fixes.aggregate([
  {
    $group: {
      _id: '$fixStrategy.id',
      total: { $sum: 1 },
      successful: {
        $sum: { $cond: ['$success', 1, 0] },
      },
    },
  },
  {
    $project: {
      successRate: { $divide: ['$successful', '$total'] },
    },
  },
]);
```

---

## 트러블슈팅

### 자동 복구가 실행되지 않음

**원인**:
- Cron 스케줄이 잘못 설정됨
- 서비스가 시작되지 않음

**해결**:
```typescript
// 서비스 상태 확인
const isRunning = autoHealingService.isRunning();
console.log('Auto-healing running:', isRunning);

// 재시작
autoHealingService.stop();
autoHealingService.start();
```

### 오류가 자동으로 수정되지 않음

**원인**:
- 오류 심각도가 자동 수정 대상이 아님
- 승인이 필요한 오류 유형
- 패턴 매칭 실패

**해결**:
```typescript
// 오류 분석 결과 확인
const analyzed = await errorAnalyzer.analyzeError(error);
console.log('Auto Fixable:', analyzed.autoFixable);
console.log('Severity:', analyzed.severity);
console.log('Error Type:', analyzed.errorType);

// 설정 확인
const config = autoHealingService.getConfig();
console.log('Auto Fix Severity:', config.autoFixSeverity);
console.log('Require Approval For:', config.requireApprovalFor);
```

### Claude API 오류

**원인**:
- API 키가 설정되지 않음
- API 요청 한도 초과

**해결**:
```bash
# API 키 확인
echo $ANTHROPIC_API_KEY

# 서비스 상태 확인
const isConfigured = claudeAnalyzer.isConfigured();
console.log('Claude configured:', isConfigured);
```

### 워크플로우 수정 실패

**원인**:
- n8n API 연결 실패
- 워크플로우가 실행 중
- 백업 실패

**해결**:
```typescript
// n8n 연결 확인
const workflows = await n8nClient.getWorkflows();
console.log('n8n connected:', workflows.length > 0);

// 워크플로우 상태 확인
const workflow = await n8nClient.getWorkflow(workflowId);
console.log('Workflow active:', workflow.active);

// 수동 백업 생성
const backup = await workflowFixer.backupWorkflow(workflowId);
console.log('Backup created:', backup.id);
```

### MongoDB 연결 오류

**원인**:
- MongoDB 서버가 실행되지 않음
- 연결 문자열이 잘못됨

**해결**:
```bash
# MongoDB 상태 확인
docker ps | grep mongodb

# 연결 테스트
npm run test:mongodb

# 수동 연결 확인
mongosh "$MONGODB_URI"
```

---

## 성능 최적화

### 배치 처리

```typescript
// 여러 오류 한 번에 분석
const errors = await errorAnalyzer.getRecentErrors(50);
const analyzed = await errorAnalyzer.analyzeMultipleErrors(errors);

// 병렬 수정
const fixPromises = analyzed
  .filter((e) => e.autoFixable)
  .map((e) => autoHealingService.attemptFix(e));

await Promise.allSettled(fixPromises);
```

### 캐싱

```typescript
// 워크플로우 정의 캐싱 (n8nClient에 이미 구현됨)
const workflow = await n8nClient.getWorkflow(workflowId);
// 캐시에서 재사용

// 패턴 매칭 결과 캐싱
const cache = new Map<string, AnalyzedError>();
const cacheKey = `${error.workflowId}-${error.errorMessage}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 인덱스 최적화

MongoDB 인덱스:
```javascript
// analyzed_errors 컬렉션
db.analyzed_errors.createIndex({ workflowId: 1, timestamp: -1 });
db.analyzed_errors.createIndex({ errorType: 1 });
db.analyzed_errors.createIndex({ autoFixable: 1, severity: 1 });

// workflow_fixes 컬렉션
db.workflow_fixes.createIndex({ workflowId: 1, appliedAt: -1 });
db.workflow_fixes.createIndex({ 'fixStrategy.id': 1, success: 1 });

// healing_history 컬렉션
db.healing_history.createIndex({ workflowId: 1, timestamp: -1 });
db.healing_history.createIndex({ status: 1, timestamp: -1 });
```

---

## 테스트

### 단위 테스트

```typescript
// error-analyzer.test.ts
describe('N8nErrorAnalyzer', () => {
  it('should match timeout error pattern', async () => {
    const error = {
      errorMessage: 'Request timeout after 30000ms',
      // ...
    };
    const analyzed = await errorAnalyzer.analyzeError(error);
    expect(analyzed.errorType).toBe('timeout');
    expect(analyzed.autoFixable).toBe(true);
  });
});

// workflow-fixer.test.ts
describe('WorkflowFixer', () => {
  it('should backup workflow before fixing', async () => {
    const backup = await workflowFixer.backupWorkflow('workflow-123');
    expect(backup).toBeDefined();
    expect(backup.nodes).toBeDefined();
  });
});
```

### 통합 테스트

```bash
# 전체 복구 사이클 테스트
npm run test:healing

# 특정 오류 유형 테스트
npm run test:healing -- --error-type=timeout

# Claude API 통합 테스트
npm run test:claude-api
```

---

## 라이선스

MIT License

---

## 지원

문제가 발생하면 GitHub Issues에 등록해주세요.

**관련 문서**:
- [Agent Orchestration](../agent-orchestration/ARCHITECTURE.md)
- [n8n Integration](../n8n-integration/README.md)
- [MongoDB Schema](../../infrastructure/mongodb/README.md)
