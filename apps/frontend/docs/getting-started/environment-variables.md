---
sidebar_position: 4
title: 환경 변수 설정
---

# 환경 변수 설정

프로젝트에서 사용하는 모든 환경 변수에 대한 상세 가이드입니다.

## 환경 변수 파일

### 개발 환경: `.env.local`

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```bash
# .env.local
# 개발 환경 전용 - Git에 커밋하지 마세요!
```

### 프로덕션 환경: `.env.production`

```bash
# .env.production
# 프로덕션 배포 시 사용
```

### 템플릿: `.env.example`

공유 가능한 템플릿 파일 (Git에 커밋됨):

```bash
# .env.example
# 이 파일을 복사하여 .env.local을 만드세요
```

## 필수 환경 변수

### n8n 연결 설정

```bash
# n8n API URL
# n8n REST API 엔드포인트
NEXT_PUBLIC_N8N_API_URL=http://localhost:5678/api/v1

# n8n API 키
# n8n 웹 UI → Settings → API에서 생성
NEXT_PUBLIC_N8N_API_KEY=your-n8n-api-key-here

# n8n Webhook URL
# 워크플로우에서 사용할 Webhook 기본 URL
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook

# n8n WebSocket URL
# 실시간 업데이트를 위한 WebSocket 연결
NEXT_PUBLIC_N8N_WEBSOCKET_URL=ws://localhost:5678
```

**프로덕션 예시:**

```bash
NEXT_PUBLIC_N8N_API_URL=https://n8n.yourdomain.com/api/v1
NEXT_PUBLIC_N8N_API_KEY=n8n_api_xxxxxxxxxxxxx
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook
NEXT_PUBLIC_N8N_WEBSOCKET_URL=wss://n8n.yourdomain.com
```

### MongoDB 연결

```bash
# MongoDB 연결 문자열
# 워크플로우 메타데이터 및 실행 이력 저장
MONGODB_URI=mongodb://localhost:27017/n8n_frontend

# MongoDB 데이터베이스 이름
MONGODB_DB=n8n_frontend

# MongoDB 인증 (프로덕션 필수)
MONGODB_USER=admin
MONGODB_PASSWORD=secure-password-here
```

**프로덕션 예시 (MongoDB Atlas):**

```bash
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/n8n_frontend?retryWrites=true&w=majority
```

### Redis 연결

```bash
# Redis 호스트
REDIS_HOST=localhost

# Redis 포트
REDIS_PORT=6379

# Redis 비밀번호 (프로덕션 필수)
REDIS_PASSWORD=

# Redis 데이터베이스 번호
REDIS_DB=0
```

**프로덕션 예시:**

```bash
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=secure-redis-password
REDIS_DB=0
```

## 선택적 환경 변수

### n8n 고급 설정

```bash
# API 요청 타임아웃 (밀리초)
# 기본값: 30000 (30초)
N8N_API_TIMEOUT=30000

# API 재시도 횟수
# 기본값: 3
N8N_API_RETRIES=3

# Basic 인증 (n8n에서 활성화된 경우)
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=password
```

### 애플리케이션 설정

```bash
# Next.js 서버 포트
# 기본값: 3000
PORT=3000

# Node.js 환경
# development | production | test
NODE_ENV=development

# 애플리케이션 URL
# 프로덕션 배포 시 실제 URL 사용
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 로깅 및 모니터링

```bash
# 로그 레벨
# error | warn | info | debug
LOG_LEVEL=info

# 에러 추적 (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# 애널리틱스 (Google Analytics)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 보안 설정

```bash
# JWT 시크릿 (인증 사용 시)
JWT_SECRET=your-jwt-secret-here

# Webhook 시크릿 (Webhook 인증)
WEBHOOK_SECRET=your-webhook-secret-here

# CORS 허용 도메인
CORS_ORIGIN=https://your-frontend.com,https://www.your-frontend.com
```

### 성능 최적화

```bash
# 캐시 TTL (초)
# Redis 캐시 유효 기간
CACHE_TTL=3600

# 페이지네이션 기본 크기
# 기본값: 20
DEFAULT_PAGE_SIZE=20

# 최대 페이지 크기
# 기본값: 100
MAX_PAGE_SIZE=100

# 워크플로우 실행 폴링 간격 (밀리초)
# 기본값: 2000 (2초)
EXECUTION_POLL_INTERVAL=2000
```

## 환경별 설정 예시

### 개발 환경 (`.env.local`)

```bash
# ===========================================
# 개발 환경 설정
# ===========================================

# Next.js
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# n8n (로컬 Docker)
NEXT_PUBLIC_N8N_API_URL=http://localhost:5678/api/v1
NEXT_PUBLIC_N8N_API_KEY=test-api-key
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://localhost:5678/webhook
NEXT_PUBLIC_N8N_WEBSOCKET_URL=ws://localhost:5678

# MongoDB (로컬)
MONGODB_URI=mongodb://localhost:27017/n8n_frontend
MONGODB_DB=n8n_frontend

# Redis (로컬)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# 로깅
LOG_LEVEL=debug

# 개발자 도구
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
```

### 스테이징 환경 (`.env.staging`)

```bash
# ===========================================
# 스테이징 환경 설정
# ===========================================

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://staging.yourdomain.com

# n8n (스테이징 서버)
NEXT_PUBLIC_N8N_API_URL=https://n8n-staging.yourdomain.com/api/v1
NEXT_PUBLIC_N8N_API_KEY=staging-api-key-xxxxxxxxx
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n-staging.yourdomain.com/webhook
NEXT_PUBLIC_N8N_WEBSOCKET_URL=wss://n8n-staging.yourdomain.com

# MongoDB (Atlas Staging)
MONGODB_URI=mongodb+srv://user:password@staging-cluster.mongodb.net/n8n_frontend?retryWrites=true&w=majority
MONGODB_DB=n8n_frontend

# Redis (Staging)
REDIS_HOST=redis-staging.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=staging-redis-password
REDIS_DB=0

# 보안
JWT_SECRET=staging-jwt-secret-xxxxxxxxxxxxx
WEBHOOK_SECRET=staging-webhook-secret-xxxxxxxxxxxxx
CORS_ORIGIN=https://staging.yourdomain.com

# 로깅
LOG_LEVEL=info
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### 프로덕션 환경 (`.env.production`)

```bash
# ===========================================
# 프로덕션 환경 설정
# ===========================================

# Next.js
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# n8n (프로덕션 서버)
NEXT_PUBLIC_N8N_API_URL=https://n8n.yourdomain.com/api/v1
NEXT_PUBLIC_N8N_API_KEY=prod-api-key-xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook
NEXT_PUBLIC_N8N_WEBSOCKET_URL=wss://n8n.yourdomain.com

# n8n 고급 설정
N8N_API_TIMEOUT=60000
N8N_API_RETRIES=5

# MongoDB (Atlas Production)
MONGODB_URI=mongodb+srv://produser:strongpassword@prod-cluster.mongodb.net/n8n_frontend?retryWrites=true&w=majority
MONGODB_DB=n8n_frontend
MONGODB_USER=produser
MONGODB_PASSWORD=strongpassword

# Redis (Production)
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=strong-redis-password
REDIS_DB=0

# 보안
JWT_SECRET=production-jwt-secret-long-random-string
WEBHOOK_SECRET=production-webhook-secret-long-random-string
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# 성능
CACHE_TTL=7200
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
EXECUTION_POLL_INTERVAL=5000

# 로깅 및 모니터링
LOG_LEVEL=warn
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# 개발자 도구 비활성화
NEXT_PUBLIC_ENABLE_DEVTOOLS=false
```

## 환경 변수 검증

### 런타임 검증

`lib/env.ts`:

```typescript
/**
 * 환경 변수 검증 및 타입 안전성 보장
 */

export const env = {
  // n8n
  n8n: {
    apiUrl: requireEnv('NEXT_PUBLIC_N8N_API_URL'),
    apiKey: requireEnv('NEXT_PUBLIC_N8N_API_KEY'),
    webhookUrl: requireEnv('NEXT_PUBLIC_N8N_WEBHOOK_URL'),
    websocketUrl: requireEnv('NEXT_PUBLIC_N8N_WEBSOCKET_URL'),
    timeout: parseInt(process.env.N8N_API_TIMEOUT || '30000'),
    retries: parseInt(process.env.N8N_API_RETRIES || '3'),
  },

  // MongoDB
  mongodb: {
    uri: requireEnv('MONGODB_URI'),
    db: requireEnv('MONGODB_DB'),
  },

  // Redis
  redis: {
    host: requireEnv('REDIS_HOST'),
    port: parseInt(requireEnv('REDIS_PORT')),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // App
  app: {
    url: requireEnv('NEXT_PUBLIC_APP_URL'),
    env: process.env.NODE_ENV || 'development',
  },
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

// 타입 체크
export type Env = typeof env;
```

### 빌드 타임 검증

`next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 환경 변수 검증
  env: {
    NEXT_PUBLIC_N8N_API_URL: process.env.NEXT_PUBLIC_N8N_API_URL,
    NEXT_PUBLIC_N8N_WEBSOCKET_URL: process.env.NEXT_PUBLIC_N8N_WEBSOCKET_URL,
  },

  // 빌드 시 필수 환경 변수 체크
  webpack: (config, { isServer }) => {
    if (isServer) {
      const requiredEnvVars = [
        'NEXT_PUBLIC_N8N_API_URL',
        'NEXT_PUBLIC_N8N_API_KEY',
        'MONGODB_URI',
        'REDIS_HOST',
      ];

      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }
    }

    return config;
  },
};

module.exports = nextConfig;
```

## 보안 모범 사례

### 1. 민감한 정보 보호

```bash
# ❌ 잘못된 예시 - API 키를 Git에 커밋
NEXT_PUBLIC_N8N_API_KEY=n8n_api_1234567890

# ✅ 올바른 예시 - .env.local 사용 (Git에서 제외)
# .gitignore에 .env.local 추가
```

### 2. 환경별 분리

```bash
# 개발
.env.local

# 스테이징
.env.staging

# 프로덕션
.env.production

# 템플릿 (Git 커밋 가능)
.env.example
```

### 3. 시크릿 생성

안전한 랜덤 문자열 생성:

```bash
# OpenSSL 사용
openssl rand -base64 32

# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4. 환경 변수 암호화

프로덕션 배포 시 환경 변수를 암호화하여 저장:

```bash
# AWS Secrets Manager, Azure Key Vault, Google Secret Manager 사용 권장
```

## 트러블슈팅

### 환경 변수가 로드되지 않음

1. 파일 이름 확인 (`.env.local`, `.env.production`)
2. Next.js 서버 재시작
3. `NEXT_PUBLIC_` 접두사 확인 (클라이언트에서 접근 필요 시)

```bash
# 서버 재시작
npm run dev
```

### 빌드 시 환경 변수 누락

```bash
# 빌드 전 환경 변수 확인
node -e "console.log(process.env.NEXT_PUBLIC_N8N_API_URL)"

# 환경 변수와 함께 빌드
NEXT_PUBLIC_N8N_API_URL=https://n8n.yourdomain.com/api/v1 npm run build
```

### Docker 환경에서 환경 변수 전달

`docker-compose.yml`:

```yaml
services:
  frontend:
    build: .
    environment:
      - NEXT_PUBLIC_N8N_API_URL=${NEXT_PUBLIC_N8N_API_URL}
      - NEXT_PUBLIC_N8N_API_KEY=${NEXT_PUBLIC_N8N_API_KEY}
      - MONGODB_URI=${MONGODB_URI}
    env_file:
      - .env.production
```

## 다음 단계

1. [첫 워크플로우 실행](./first-workflow) - 워크플로우 생성 및 실행
2. [n8n 통합 가이드](/n8n-integration/overview) - 고급 통합 기능
3. [운영 가이드](/operations/monitoring) - 프로덕션 운영 설정

## 참고 자료

- [Next.js 환경 변수 문서](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [n8n 환경 변수 가이드](https://docs.n8n.io/hosting/environment-variables/)
- [MongoDB 연결 문자열](https://www.mongodb.com/docs/manual/reference/connection-string/)
