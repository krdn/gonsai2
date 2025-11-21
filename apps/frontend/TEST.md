# 테스트 가이드

n8n 워크플로우 관리 프론트엔드를 위한 완전한 테스트 스위트입니다.

## 목차

- [테스트 아키텍처](#테스트-아키텍처)
- [빠른 시작](#빠른-시작)
- [단위 테스트](#단위-테스트)
- [통합 테스트](#통합-테스트)
- [E2E 테스트](#e2e-테스트)
- [부하 테스트](#부하-테스트)
- [커버리지 리포트](#커버리지-리포트)
- [CI/CD 통합](#cicd-통합)
- [트러블슈팅](#트러블슈팅)

---

## 테스트 아키텍처

### 테스트 계층 구조

```
test/
├── unit/                          # 단위 테스트 (Jest)
│   ├── __mocks__/                # Mock 서버 및 픽스쳐
│   │   ├── n8n-server.ts         # Express 기반 Mock n8n API
│   │   └── n8n-fixtures.ts       # 테스트 데이터
│   ├── n8n-client.test.ts        # n8n API 클라이언트 테스트
│   ├── workflow-parser.test.ts   # 워크플로우 파서 테스트
│   └── error-analyzer.test.ts    # 에러 분석기 테스트
│
├── integration/                   # 통합 테스트 (Jest + Docker)
│   ├── helpers/
│   │   └── test-env.ts           # Docker 컨테이너 관리
│   ├── docker-compose.test.yml   # 테스트 환경 정의
│   ├── workflow-execution.test.ts # 실제 n8n 통합 테스트
│   └── jest.integration.config.js # 통합 테스트 설정
│
├── e2e/                           # End-to-End 테스트 (Playwright)
│   ├── fixtures/                 # 테스트 데이터
│   ├── workflow-execution.spec.ts # 워크플로우 실행 플로우
│   └── monitoring-dashboard.spec.ts # 모니터링 대시보드
│
├── load/                          # 부하 테스트 (K6)
│   ├── workflow-execution.js     # 동시 워크플로우 실행
│   ├── api-load.js               # n8n API 부하 테스트
│   └── websocket-load.js         # WebSocket 연결 스케일링
│
└── setup.ts                      # 전역 테스트 설정
```

### 테스트 범위

| 테스트 유형     | 목적                 | 도구          | 대상 커버리지      |
| --------------- | -------------------- | ------------- | ------------------ |
| **단위 테스트** | 개별 컴포넌트 검증   | Jest          | 80%+               |
| **통합 테스트** | 시스템 간 통합 검증  | Jest + Docker | 주요 통합 지점     |
| **E2E 테스트**  | 사용자 시나리오 검증 | Playwright    | 핵심 사용자 플로우 |
| **부하 테스트** | 성능 및 확장성 검증  | K6            | 성능 임계값        |

---

## 빠른 시작

### 의존성 설치

```bash
cd apps/frontend
npm install
```

### 모든 단위 테스트 실행

```bash
npm run test:unit
```

### 통합 테스트 실행 (Docker 필요)

```bash
# Docker 및 docker-compose 설치 확인
docker --version
docker-compose --version

# 통합 테스트 실행
npm run test:integration
```

### 커버리지 리포트 생성

```bash
npm run test:coverage
```

---

## 단위 테스트

### 구조

단위 테스트는 **Jest**를 사용하여 개별 모듈과 함수를 격리 테스트합니다.

### 실행

```bash
# 모든 단위 테스트 실행
npm run test:unit

# Watch 모드로 실행 (개발 중)
npm run test:watch

# 특정 테스트 파일 실행
npm run test:unit -- n8n-client.test.ts
```

### 테스트 구성 요소

#### 1. n8n API 클라이언트 테스트

**파일**: `test/unit/n8n-client.test.ts`

**테스트 내용**:

- ✅ n8n API 엔드포인트 호출
- ✅ 재시도 로직 (exponential backoff)
- ✅ 타임아웃 처리
- ✅ 에러 처리 (4xx vs 5xx)

**예제**:

```typescript
describe('N8nApiClient', () => {
  it('should fetch all workflows', async () => {
    const workflows = await client.getWorkflows();
    expect(workflows).toHaveLength(2);
  });

  it('should retry on network errors', async () => {
    // Mock 서버 중지 → 네트워크 에러 시뮬레이션
    await mockServer.stop();
    const promise = client.getWorkflows();

    // 재시도 중 서버 재시작
    setTimeout(async () => {
      await mockServer.start();
    }, 500);

    await expect(promise).rejects.toThrow();
  });
});
```

#### 2. 워크플로우 파서 테스트

**파일**: `test/unit/workflow-parser.test.ts`

**테스트 내용**:

- ✅ 워크플로우 구조 분석
- ✅ 복잡도 계산 (nodes + connections + branches + loops)
- ✅ 실행 시간 추정
- ✅ 워크플로우 검증 (disconnected nodes, invalid connections)

**예제**:

```typescript
describe('WorkflowParser', () => {
  it('should calculate complexity', () => {
    const parsed = WorkflowParser.parse(complexWorkflow);

    // 복잡도 = nodes*1 + connections*0.5 + branches*2 + loops*3
    expect(parsed.complexity).toBeGreaterThan(5);
  });

  it('should detect loops using DFS', () => {
    const loopWorkflow = {
      /* self-loop */
    };
    const parsed = WorkflowParser.parse(loopWorkflow);

    expect(parsed.complexity).toBeGreaterThan(3); // Loop penalty
  });
});
```

#### 3. 에러 분석기 테스트

**파일**: `test/unit/error-analyzer.test.ts`

**테스트 내용**:

- ✅ 에러 카테고리 분류 (network, auth, timeout 등)
- ✅ 심각도 평가 (low, medium, high, critical)
- ✅ 재시도 전략 제안 (exponential, linear, none)
- ✅ 알림 트리거 판단

**예제**:

```typescript
describe('ErrorAnalyzer', () => {
  it('should categorize network errors', () => {
    const error = { message: 'ECONNREFUSED' };
    const analysis = ErrorAnalyzer.analyze(error);

    expect(analysis.category).toBe(ErrorCategory.NETWORK);
    expect(analysis.isRetryable).toBe(true);
  });

  it('should suggest retry strategy', () => {
    const error = { message: '429 Too Many Requests' };
    const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

    expect(strategy.strategy).toBe('exponential');
    expect(strategy.delayMs).toBe(60000); // 1 minute
  });
});
```

### Mock 서버

**파일**: `test/unit/__mocks__/n8n-server.ts`

Express 기반 Mock n8n API 서버로, 실제 n8n 없이 API 호출을 테스트합니다.

**기능**:

- ✅ 전체 n8n REST API 엔드포인트 구현
- ✅ 인메모리 데이터 저장
- ✅ 비동기 실행 시뮬레이션
- ✅ 테스트 간 상태 리셋

**사용 예**:

```typescript
const mockServer = new MockN8nServer(5679);
await mockServer.start();

// 테스트 실행...

await mockServer.stop();
```

---

## 통합 테스트

### 구조

통합 테스트는 **Docker Compose**로 실제 n8n 환경을 구축하여 전체 시스템을 테스트합니다.

### 사전 요구사항

- Docker 설치
- docker-compose 설치
- 포트 5679, 5433 사용 가능

### 실행

```bash
# 통합 테스트 실행 (환경 자동 시작/중지)
npm run test:integration
```

### Docker 환경

**파일**: `test/integration/docker-compose.test.yml`

**서비스**:

- **n8n-test**: n8n 최신 버전 (포트 5679)
- **postgres-test**: PostgreSQL 16 (포트 5433)

**Health Check**:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'wget --spider -q http://localhost:5678/healthz']
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

### 테스트 환경 관리

**파일**: `test/integration/helpers/test-env.ts`

```typescript
// 환경 시작
await TestEnvironment.start();

// 환경 리셋 (데이터 초기화)
await TestEnvironment.reset();

// 환경 중지
await TestEnvironment.stop();

// 로그 확인
const logs = TestEnvironment.getLogs('n8n-test');
```

### 워크플로우 실행 통합 테스트

**파일**: `test/integration/workflow-execution.test.ts`

**테스트 내용**:

- ✅ 워크플로우 생성/조회/수정/삭제 (CRUD)
- ✅ 워크플로우 실행 및 결과 확인
- ✅ 실행 이력 조회 및 필터링
- ✅ 워크플로우 파서 통합 검증
- ✅ 에러 시나리오 처리

**예제**:

```typescript
describe('Workflow Execution Integration', () => {
  let client: N8nApiClient;

  beforeAll(() => {
    client = new N8nApiClient({
      baseUrl: TestEnvironment.getUrl(),
      apiKey: '',
    });
  });

  it('should execute workflow successfully', async () => {
    // 워크플로우 생성
    const workflow = await client.createWorkflow({
      name: 'Test Workflow',
      nodes: [
        /* ... */
      ],
      connections: {
        /* ... */
      },
    });

    // 실행
    const result = await client.executeWorkflow(workflow.id);

    expect(result.executionId).toBeTruthy();

    // 실행 결과 확인
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const execution = await client.getExecution(result.executionId);

    expect(execution.status).toBe('success');
  });
});
```

---

## E2E 테스트

### 구조

E2E 테스트는 **Playwright**를 사용하여 실제 브라우저에서 사용자 시나리오를 테스트합니다.

### 사전 요구사항

```bash
# Playwright 설치
npm install -D @playwright/test
npx playwright install
```

### 실행

```bash
# E2E 테스트 실행
npm run test:e2e

# 특정 브라우저로 실행
npm run test:e2e -- --project=chromium

# UI 모드로 실행 (디버깅)
npm run test:e2e -- --ui
```

### 주요 테스트 시나리오

#### 1. 워크플로우 실행 플로우

**파일**: `test/e2e/workflow-execution.spec.ts`

**시나리오**:

1. 사용자가 로그인
2. 워크플로우 목록 조회
3. 특정 워크플로우 선택
4. 실행 버튼 클릭
5. 실시간 실행 상태 모니터링
6. 실행 결과 확인

#### 2. 모니터링 대시보드

**파일**: `test/e2e/monitoring-dashboard.spec.ts`

**시나리오**:

1. 대시보드 페이지 로드
2. 실시간 통계 렌더링 확인
3. 차트 및 그래프 로드 확인
4. WebSocket 실시간 업데이트 검증
5. 필터링 및 정렬 기능 테스트

---

## 부하 테스트

### 구조

부하 테스트는 **K6**를 사용하여 시스템의 성능 및 확장성을 검증합니다.

### 사전 요구사항

```bash
# K6 설치 (macOS)
brew install k6

# K6 설치 (Linux)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 실행

```bash
# 워크플로우 실행 부하 테스트
k6 run test/load/workflow-execution.js

# n8n API 부하 테스트
k6 run test/load/api-load.js

# WebSocket 연결 부하 테스트
k6 run test/load/websocket-load.js

# 옵션 설정
k6 run --vus 50 --duration 5m test/load/workflow-execution.js
```

### 성능 임계값

```javascript
export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 요청이 500ms 이하
    http_req_failed: ['rate<0.01'], // 실패율 1% 미만
    'checks{type:workflow}': ['rate>0.95'], // 워크플로우 성공률 95% 이상
  },
  stages: [
    { duration: '1m', target: 10 }, // Ramp up
    { duration: '3m', target: 50 }, // Peak load
    { duration: '1m', target: 0 }, // Ramp down
  ],
};
```

### 주요 테스트 시나리오

#### 1. 동시 워크플로우 실행

**파일**: `test/load/workflow-execution.js`

**목표**:

- 50개 동시 사용자 (VUs)
- 각 사용자가 5분 동안 워크플로우 실행
- 95% 요청이 500ms 이하
- 실패율 1% 미만

#### 2. n8n API 부하

**파일**: `test/load/api-load.js`

**목표**:

- GET /api/v1/workflows
- GET /api/v1/executions
- POST /api/v1/workflows/:id/execute
- 각 엔드포인트별 성능 측정

#### 3. WebSocket 연결 스케일링

**파일**: `test/load/websocket-load.js`

**목표**:

- 100개 동시 WebSocket 연결
- 실시간 메시지 수신 검증
- 연결 안정성 테스트

---

## 커버리지 리포트

### 생성

```bash
# 전체 커버리지 리포트 생성
npm run test:coverage
```

### 출력 형식

- **HTML**: `coverage/final/index.html` (브라우저에서 볼 수 있는 상세 리포트)
- **LCOV**: `coverage/final/lcov.info` (CI/CD 도구 통합용)
- **JSON**: `coverage/final/coverage-summary.json` (프로그래밍 방식 접근)
- **Text**: 콘솔 출력 (빠른 확인)

### 커버리지 임계값

**파일**: `jest.config.js`

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

**임계값 미달 시 빌드 실패**:

```bash
npm run test:coverage
# Jest: "global" coverage threshold for lines (78.5%) not met: 80%
```

### CI/CD 통합

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: |
          docker-compose -f test/integration/docker-compose.test.yml up -d
          npm run test:integration
          docker-compose -f test/integration/docker-compose.test.yml down

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
```

---

## CI/CD 통합

### GitHub Actions

**단위 테스트**:

```yaml
- name: Run unit tests
  run: npm run test:unit
```

**통합 테스트 (Docker 필요)**:

```yaml
- name: Start test environment
  run: docker-compose -f test/integration/docker-compose.test.yml up -d

- name: Run integration tests
  run: npm run test:integration

- name: Stop test environment
  run: docker-compose -f test/integration/docker-compose.test.yml down -v
```

**E2E 테스트**:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test

unit-tests:
  stage: test
  script:
    - npm ci
    - npm run test:unit -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration-tests:
  stage: test
  services:
    - docker:dind
  script:
    - npm ci
    - docker-compose -f test/integration/docker-compose.test.yml up -d
    - npm run test:integration
    - docker-compose -f test/integration/docker-compose.test.yml down -v
```

---

## 트러블슈팅

### 일반적인 문제

#### 1. Mock 서버 포트 충돌

**증상**:

```
Error: listen EADDRINUSE: address already in use :::5679
```

**해결책**:

```bash
# 포트 5679를 사용하는 프로세스 찾기
lsof -i :5679

# 프로세스 종료
kill -9 <PID>
```

#### 2. Docker 컨테이너 시작 실패

**증상**:

```
Error: n8n failed to start within 60000ms
```

**해결책**:

```bash
# 컨테이너 로그 확인
docker-compose -f test/integration/docker-compose.test.yml logs n8n-test

# 컨테이너 수동 시작
docker-compose -f test/integration/docker-compose.test.yml up

# 포트 5679, 5433이 사용 가능한지 확인
lsof -i :5679
lsof -i :5433
```

#### 3. Jest 타임아웃

**증상**:

```
Timeout - Async callback was not invoked within the 30000 ms timeout
```

**해결책**:

```typescript
// 특정 테스트의 타임아웃 증가
it('should execute workflow', async () => {
  // ... test code
}, 60000); // 60 seconds

// 또는 전역 설정에서 증가
// jest.config.js
testTimeout: 60000,
```

#### 4. 커버리지 임계값 미달

**증상**:

```
Jest: "global" coverage threshold for branches (75%) not met: 80%
```

**해결책**:

```bash
# 커버리지 리포트 확인
npm run test:coverage
open coverage/final/index.html

# 테스트되지 않은 코드 확인 및 테스트 추가
```

#### 5. n8n API 인증 에러

**증상**:

```
Error: HTTP 401: Unauthorized
```

**해결책**:

```typescript
// 테스트 환경에서는 API 키 불필요
const client = new N8nApiClient({
  baseUrl: TestEnvironment.getUrl(),
  apiKey: '', // Empty for test instance
});
```

### 디버깅 팁

#### 1. 단위 테스트 디버깅

```bash
# Watch 모드로 특정 테스트만 실행
npm run test:watch -- n8n-client

# 디버그 로그 활성화
DEBUG=* npm run test:unit
```

#### 2. 통합 테스트 디버깅

```bash
# 환경 수동 시작
docker-compose -f test/integration/docker-compose.test.yml up

# 테스트 실행 (환경은 유지)
npm run test:integration

# n8n 로그 확인
docker-compose -f test/integration/docker-compose.test.yml logs -f n8n-test
```

#### 3. E2E 테스트 디버깅

```bash
# UI 모드로 실행 (시각적 디버깅)
npm run test:e2e -- --ui

# 헤드풀 모드로 실행 (브라우저 표시)
npm run test:e2e -- --headed

# 특정 테스트만 실행
npm run test:e2e -- workflow-execution.spec.ts
```

---

## 베스트 프랙티스

### 1. 테스트 격리

```typescript
// ✅ Good: 각 테스트마다 독립적인 데이터
beforeEach(() => {
  mockServer.reset();
});

// ❌ Bad: 테스트 간 상태 공유
const workflow = {
  /* shared data */
};
```

### 2. 비동기 처리

```typescript
// ✅ Good: async/await 사용
it('should create workflow', async () => {
  const workflow = await client.createWorkflow(data);
  expect(workflow.id).toBeTruthy();
});

// ❌ Bad: Promise 체인 사용
it('should create workflow', (done) => {
  client.createWorkflow(data).then((workflow) => {
    expect(workflow.id).toBeTruthy();
    done();
  });
});
```

### 3. 에러 테스트

```typescript
// ✅ Good: 에러 타입 검증
await expect(client.getWorkflow('invalid')).rejects.toThrow('HTTP 404');

// ❌ Bad: 에러만 검증
await expect(client.getWorkflow('invalid')).rejects.toThrow();
```

### 4. Mock 데이터 재사용

```typescript
// ✅ Good: 픽스쳐 사용
import { mockWorkflow } from '@/test/unit/__mocks__/n8n-fixtures';

it('should parse workflow', () => {
  const parsed = WorkflowParser.parse(mockWorkflow);
  // ...
});

// ❌ Bad: 테스트마다 데이터 재정의
it('should parse workflow', () => {
  const workflow = { id: '1', name: 'Test', ... };
  // ...
});
```

### 5. 설명적인 테스트 이름

```typescript
// ✅ Good: 무엇을 테스트하는지 명확
it('should retry 3 times on network errors with exponential backoff', () => {
  // ...
});

// ❌ Bad: 모호한 설명
it('should work correctly', () => {
  // ...
});
```

---

## 참고 자료

### 공식 문서

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [K6 Documentation](https://k6.io/docs/)
- [n8n API Documentation](https://docs.n8n.io/api/)

### 프로젝트 구조

- [lib/n8n/client.ts](lib/n8n/client.ts) - n8n API 클라이언트
- [lib/n8n/workflow-parser.ts](lib/n8n/workflow-parser.ts) - 워크플로우 파서
- [lib/n8n/error-analyzer.ts](lib/n8n/error-analyzer.ts) - 에러 분석기

### CI/CD 템플릿

- [GitHub Actions](.github/workflows/test.yml)
- [GitLab CI](.gitlab-ci.yml)

---

## 라이선스

MIT License - [LICENSE](../../LICENSE) 참조
