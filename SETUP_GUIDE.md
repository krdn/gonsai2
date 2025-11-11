# gonsai2 설정 가이드

> n8n API 클라이언트 설정 및 테스트 실행 가이드

## 🚀 빠른 시작

### 1. 환경 확인

```bash
# n8n 컨테이너 확인
docker ps | grep n8n

# 예상 출력:
# n8n                    Up 2 days (healthy)   127.0.0.1:5678->5678/tcp
# n8n-worker             Up 2 days (healthy)   5678/tcp
```

### 2. n8n API Key 생성

1. 웹 브라우저에서 n8n 열기: http://localhost:5678
2. 로그인 (필요시)
3. **Settings** → **API** 메뉴로 이동
4. **Create new API key** 클릭
5. 생성된 API Key 복사

### 3. 환경 변수 설정

```bash
# .env 파일 편집
nano .env
```

**필수 변수 설정**:
```bash
N8N_API_URL=http://localhost:5678
N8N_API_KEY=your-api-key-here  # ← 여기에 복사한 API Key 입력
```

### 4. 패키지 설치

```bash
npm install
```

### 5. 연결 테스트

```bash
# 기본 연결 테스트 (API Key 없이)
node test-n8n-basic.js

# 완전한 연결 테스트 (API Key 필요)
npm run test:connection
```

## 📊 테스트 결과 예시

### 성공적인 연결

```
==============================================
n8n Connection Test Suite
==============================================

1. 환경 변수 확인
✅ N8N_API_URL 설정
   http://localhost:5678
✅ N8N_API_KEY 설정
   설정됨 (값 숨김)

2. 인증 설정 검증
✅ 인증 방법
   apiKey 사용 중

3. n8n 서버 연결 테스트
✅ n8n 헬스체크
   HTTP 200 - 서버 정상

4. API 클라이언트 테스트
✅ 워크플로우 목록 조회
   3개의 워크플로우 발견

   워크플로우 목록:
   - 🟢 활성 Data Processor (ID: workflow-123)
   - ⚪ 비활성 Email Sender (ID: workflow-456)
   - 🟢 활성 AI Agent Executor (ID: workflow-789)

✅ 실행 내역 조회
   최근 5개의 실행 내역

   최근 실행:
   - ✅ success (2024-11-11 22:30:15)
   - ✅ success (2024-11-11 22:15:42)
   - ❌ error (2024-11-11 22:00:18)

5. Docker 컨테이너 상태 확인
✅ n8n 컨테이너 실행 중
   n8n: Up 2 days (healthy)
   n8n-worker: Up 2 days (healthy)

==============================================
테스트 결과 요약
==============================================

총 테스트: 6
통과: 6
실패: 0
성공률: 100.0%

🎉 모든 테스트 통과! n8n 연결이 정상입니다.
```

## 🛠️ 구축된 기능

### 1. n8n API 클라이언트 ([features/n8n-integration/api-client.ts](features/n8n-integration/api-client.ts))

**주요 기능**:
- ✅ 워크플로우 CRUD 작업
- ✅ 워크플로우 실행 및 모니터링
- ✅ 자동 재시도 (exponential backoff)
- ✅ 타임아웃 관리
- ✅ 타입 안전성 (TypeScript)

**사용 예시**:
```typescript
import { createN8nClient } from './features/n8n-integration/api-client';

// 클라이언트 생성
const client = createN8nClient();

// 워크플로우 목록 조회
const workflows = await client.workflows.getAll();

// 워크플로우 실행
const execution = await client.executions.execute('workflow-id', {
  userId: '123',
  action: 'process'
});

// 완료 대기
const result = await client.executions.waitForCompletion(execution.id);
```

### 2. WebSocket 클라이언트 ([features/n8n-integration/websocket-client.ts](features/n8n-integration/websocket-client.ts))

**주요 기능**:
- ✅ 실시간 워크플로우 실행 모니터링
- ✅ 자동 재연결 (exponential backoff)
- ✅ 이벤트 기반 아키텍처

**사용 예시**:
```typescript
import { createWebSocketClient } from './features/n8n-integration/websocket-client';

const ws = createWebSocketClient();

// 이벤트 리스너 등록
ws.on('executionStarted', (data) => {
  console.log('실행 시작:', data);
});

ws.on('executionFinished', (data) => {
  console.log('실행 완료:', data);
});

// 연결
await ws.connect();
```

### 3. 인증 관리자 ([features/n8n-integration/auth-manager.ts](features/n8n-integration/auth-manager.ts))

**지원 인증 방법**:
- ✅ API Key (권장)
- ✅ Basic Auth
- ✅ Session Token

**사용 예시**:
```typescript
import { AuthManager } from './features/n8n-integration/auth-manager';

// 환경 변수에서 자동 감지
const auth = AuthManager.fromEnv();

// 인증 헤더 적용
const headers = auth.applyAuth({
  'Content-Type': 'application/json'
});
```

## 🔧 오류 처리

### 재시도 로직

API 클라이언트는 자동으로 실패한 요청을 재시도합니다:

```typescript
const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key',
  retry: {
    maxAttempts: 5,        // 최대 5회 재시도
    delayMs: 1000          // 1초부터 시작 (exponential backoff)
  }
});
```

**재시도 정책**:
- 네트워크 오류: ✅ 재시도
- 5xx 서버 오류: ✅ 재시도
- 4xx 클라이언트 오류: ❌ 재시도 안 함 (즉시 실패)

### n8n 서버 다운 감지

```typescript
try {
  const workflows = await client.workflows.getAll();
} catch (error) {
  if (error.message.includes('ECONNREFUSED')) {
    console.error('n8n 서버가 실행 중이지 않습니다');
    console.log('docker ps | grep n8n 으로 확인하세요');
  }
}
```

## 📝 다음 단계

### 1. 샘플 워크플로우 실행

```bash
# 샘플 워크플로우 실행 테스트 (향후 구현)
npm run test:workflow-execution
```

### 2. WebSocket 테스트

```bash
# WebSocket 연결 테스트 (향후 구현)
npm run test:websocket
```

### 3. 프로덕션 배포

프로덕션 환경에서는 다음 사항을 확인하세요:

**환경 변수**:
```bash
# .env.production
NODE_ENV=production
N8N_API_URL=https://n8n.yourdomain.com
N8N_API_KEY=<production-api-key>

# 타임아웃 설정 (밀리초)
N8N_REQUEST_TIMEOUT=60000

# 재시도 설정
N8N_MAX_RETRIES=5
N8N_RETRY_DELAY=2000
```

**보안 고려사항**:
- ✅ HTTPS 사용
- ✅ API Key를 환경 변수로 관리
- ✅ API Key를 Git에 커밋하지 않음
- ✅ 정기적으로 API Key 갱신

## 🐛 문제 해결

### 문제: "API key is required" 오류

**원인**: N8N_API_KEY 환경 변수가 설정되지 않음

**해결**:
```bash
# .env 파일 확인
cat .env | grep N8N_API_KEY

# 비어있으면 n8n UI에서 API Key 생성 후 추가
```

### 문제: "ECONNREFUSED" 오류

**원인**: n8n 컨테이너가 실행 중이지 않음

**해결**:
```bash
# 컨테이너 상태 확인
docker ps | grep n8n

# 컨테이너 시작
cd /home/gon/docker-n8n
docker-compose up -d
```

### 문제: "Unauthorized" (401) 오류

**원인**: API Key가 유효하지 않음

**해결**:
1. n8n UI에서 새 API Key 생성
2. .env 파일 업데이트
3. 애플리케이션 재시작

### 문제: "Timeout" 오류

**원인**: 요청 타임아웃 또는 n8n 서버 응답 느림

**해결**:
```typescript
const client = new N8nClient({
  baseUrl: 'http://localhost:5678',
  apiKey: 'your-api-key',
  timeout: 60000  // 60초로 증가
});
```

## 📚 참고 자료

### 프로젝트 문서
- [프로젝트 개요](README.md)
- [프로젝트 구조](PROJECT_STRUCTURE.md)
- [GitHub 설정 가이드](GITHUB_SETUP.md)
- [n8n 통합 모듈 README](features/n8n-integration/README.md)

### 외부 문서
- [n8n REST API Documentation](https://docs.n8n.io/api/)
- [n8n WebSocket Documentation](https://docs.n8n.io/hosting/scaling/queue-mode/)
- [n8n Docker Setup Guide](/home/gon/docker-n8n/README.md)

## ✅ 체크리스트

설정 완료 전 확인사항:

- [ ] n8n 컨테이너 실행 중 (`docker ps | grep n8n`)
- [ ] n8n UI 접근 가능 (http://localhost:5678)
- [ ] API Key 생성 완료
- [ ] .env 파일에 N8N_API_KEY 설정
- [ ] `npm install` 실행 완료
- [ ] `npm run test:connection` 성공

모든 항목이 체크되면 다음 단계로 진행할 수 있습니다!

---

**문의사항이나 문제가 있으면 GitHub Issues에 등록해주세요.**

생성일: 2024-11-11 | 최종 업데이트: 2024-11-11
