# Backend API Server

Express + TypeScript + WebSocket 기반 n8n 통합 백엔드 서버

## 📦 구조

```
apps/backend/src/
├── middleware/          # 미들웨어 (인증, 로깅, 에러 핸들링)
├── routes/              # API 라우터
│   ├── health.routes.ts      # 헬스체크
│   ├── webhook.routes.ts     # n8n 웹훅
│   └── workflows.routes.ts   # 워크플로우 관리 및 실행
├── services/            # 비즈니스 로직
│   └── websocket.service.ts  # WebSocket 실시간 통신
├── types/               # TypeScript 타입 정의
├── utils/               # 유틸리티
│   ├── env-validator.ts      # 환경 변수 검증
│   └── logger.ts             # Winston 로거
└── server.ts            # 메인 서버 진입점
```

## 🚀 시작하기

### 1. 환경 변수 설정

```bash
# .env 파일 생성 (루트 디렉토리)
cp .env.example .env

# 필수 환경 변수 설정
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
MONGODB_URI=mongodb://superadmin:password@localhost:27017/gonsai2?authSource=admin
```

### 2. 서버 실행

```bash
# 개발 모드 (hot reload)
npm run server:dev

# 프로덕션 모드
npm run server
```

서버가 실행되면 다음 엔드포인트에 접근할 수 있습니다:

- **HTTP API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000/ws
- **헬스체크**: http://localhost:3000/health

## 📚 API 엔드포인트

### 헬스체크

```bash
# 서버 상태 확인
GET /health

# 응답 예시
{
  "status": "healthy",
  "uptime": 123.45,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "mongodb": "connected",
    "n8n": "reachable"
  }
}
```

### 워크플로우 관리

```bash
# 모든 워크플로우 조회
GET /api/workflows
Header: X-API-Key: your-api-key

# 특정 워크플로우 조회
GET /api/workflows/:id
Header: X-API-Key: your-api-key

# 워크플로우 실행
POST /api/workflows/:id/execute
Header: X-API-Key: your-api-key
Content-Type: application/json
Body: {
  "inputData": { "key": "value" },
  "options": { "waitForExecution": false }
}

# 워크플로우 실행 기록 조회
GET /api/workflows/:id/executions?limit=10&skip=0
Header: X-API-Key: your-api-key
```

### n8n 웹훅

```bash
# n8n 웹훅 콜백 수신
POST /webhooks/n8n
Header: X-N8N-Signature: webhook-signature (optional)
Content-Type: application/json
Body: {
  "workflowId": "123",
  "executionId": "456",
  "event": "workflow.execute.success",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": { ... }
}
```

## 🔌 WebSocket 연결

### 연결

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('WebSocket connected');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', message);
});
```

### 메시지 타입

- `ping` / `pong`: 연결 유지 (30초마다)
- `execution.update`: 워크플로우 실행 상태 업데이트
- `workflow.update`: 워크플로우 변경 알림
- `error`: 에러 메시지

### 예시 메시지

```json
{
  "type": "execution.update",
  "data": {
    "executionId": "123",
    "workflowId": "456",
    "status": "running",
    "progress": 50
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔐 인증

모든 API 엔드포인트 (헬스체크 제외)는 API 키 인증이 필요합니다.

```bash
# 요청 헤더에 API 키 포함
X-API-Key: your-n8n-api-key
```

웹훅 엔드포인트는 선택적으로 시그니처 검증을 지원합니다:

```bash
# 웹훅 시그니처 (N8N_WEBHOOK_SECRET 설정 시)
X-N8N-Signature: webhook-secret
```

## 🛠️ 미들웨어

### 인증 (auth.middleware.ts)

- `authenticateN8nApiKey`: n8n API 키 검증 (필수)
- `verifyWebhookSignature`: 웹훅 시그니처 검증 (선택)
- `optionalAuth`: 선택적 인증

### 로깅 (request-logger.middleware.ts)

- Morgan 기반 HTTP 요청 로깅
- 개발 모드: `dev` 포맷 (간결)
- 프로덕션 모드: `combined` 포맷 (상세)

### 에러 핸들링 (error.middleware.ts)

- `errorHandler`: 전역 에러 핸들러
- `notFoundHandler`: 404 처리
- `asyncHandler`: 비동기 핸들러 래퍼
- `AppError`: 커스텀 에러 클래스

## 📝 로깅

Winston 기반 구조화된 로깅 시스템

### 로그 레벨

- `error`: 에러 발생
- `warn`: 경고 메시지
- `info`: 일반 정보
- `debug`: 디버그 정보

### 로그 위치

- `logs/combined.log`: 모든 로그
- `logs/error.log`: 에러 로그만
- 콘솔: 실시간 로그 출력

### 사용 예시

```typescript
import { log } from './utils/logger';

log.info('Server started', { port: 3000 });
log.error('Database connection failed', error, { uri: mongoUri });
log.debug('Processing request', { userId: '123' });
```

## 🐳 Docker 지원

```dockerfile
# Dockerfile (예시)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY apps/backend ./apps/backend
COPY infrastructure ./infrastructure
CMD ["npm", "run", "server"]
```

```bash
# Docker Compose (예시)
docker-compose up backend
```

## 🧪 테스트

```bash
# 서버 헬스체크
curl http://localhost:3000/health

# API 키로 워크플로우 조회
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/workflows

# WebSocket 연결 테스트
npm run test:websocket
```

## 🔧 개발 팁

### Hot Reload

nodemon이 파일 변경을 감지하면 자동으로 서버를 재시작합니다.

```bash
npm run server:dev
```

### 환경별 설정

```bash
# 개발 환경
NODE_ENV=development npm run server:dev

# 프로덕션 환경
NODE_ENV=production npm run server
```

### 디버깅

```bash
# 디버그 로그 활성화
LOG_LEVEL=debug npm run server:dev
```

## 📊 모니터링

### Graceful Shutdown

SIGTERM, SIGINT 신호를 받으면 다음 순서로 종료됩니다:

1. 새로운 연결 거부
2. 기존 연결 처리 완료 대기 (최대 5초)
3. WebSocket 연결 종료
4. 프로세스 종료

### 예외 처리

- `uncaughtException`: 예상치 못한 예외 포착
- `unhandledRejection`: 처리되지 않은 Promise rejection 포착

## 🚨 문제 해결

### MongoDB 연결 실패

```bash
# MongoDB 컨테이너 확인
docker ps | grep mongo

# 연결 URI 검증
echo $MONGODB_URI

# 인증 정보 확인
# /home/gon/docker-mongo-ubuntu/.env 참고
```

### n8n API 연결 실패

```bash
# n8n 상태 확인
curl http://localhost:5678/healthz

# API 키 확인
# n8n UI > Settings > API에서 생성
```

### 포트 충돌

```bash
# 포트 사용 확인
ss -tlnp | grep 3000

# .env에서 포트 변경
PORT=3001
```

## 📖 참고 자료

- [Express 공식 문서](https://expressjs.com/)
- [n8n API 문서](https://docs.n8n.io/api/)
- [MongoDB Driver 문서](https://www.mongodb.com/docs/drivers/node/)
- [WebSocket 문서](https://github.com/websockets/ws)
- [Winston 로거](https://github.com/winstonjs/winston)
