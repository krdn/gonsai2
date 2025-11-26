# gonsai2 환경 설정 및 실행 가이드

이 문서는 gonsai2 프로젝트의 개발 환경과 운영 환경 설정 방법을 설명합니다.

---

## 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [개발 환경](#개발-환경)
3. [운영 환경](#운영-환경)
4. [환경 변수 설정](#환경-변수-설정)
5. [명령어 레퍼런스](#명령어-레퍼런스)
6. [문제 해결](#문제-해결)

---

## 아키텍처 개요

### 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼ (개발: 3000/3002)            ▼ (운영: 8081)
┌───────────────────┐          ┌───────────────────────────────┐
│   개발 환경       │          │   운영 환경 (Docker)          │
│                   │          │  ┌─────────────────────────┐  │
│  Backend: 3000    │          │  │ Nginx (리버스 프록시)   │  │
│  Frontend: 3002   │          │  │ - /api/* → Backend      │  │
│  MongoDB: 27017   │          │  │ - /ws → WebSocket       │  │
│  n8n: 5678        │          │  │ - /* → Frontend         │  │
│                   │          │  └─────────────────────────┘  │
└───────────────────┘          │           │                   │
                               │  ┌────────┴────────┐          │
                               │  ▼                ▼         │
                               │ Backend:3000  Frontend:3002   │
                               │       │                       │
                               │       ▼                      │
                               │ MongoDB:27017  n8n:5678       │
                               └───────────────────────────────┘
```

### 서비스 포트 매핑

| 서비스 | 개발 환경 | 운영 환경 (내부) | 운영 환경 (외부) |
|--------|----------|-----------------|-----------------|
| Frontend | 3002 | 3002 | 8081 (via Nginx) |
| Backend | 3000 | 3000 | 8081/api (via Nginx) |
| MongoDB | 27017 | 27017 | 27018 |
| n8n | 5678 | 5678 | 5678 |
| Nginx | - | 80 | 8081 |

---

## 개발 환경

### 필수 요구사항

- **Node.js**: v20 이상
- **npm**: v10 이상
- **MongoDB**: v7 이상 (Docker 또는 로컬 설치)
- **n8n**: 워크플로우 자동화 (Docker 권장)

### 초기 설정

#### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/krdn/gonsai2.git
cd gonsai2
npm install
```

#### 2. 환경 변수 설정

**Backend 환경 변수**:
```bash
cp apps/backend/.env.example apps/backend/.env
```

`apps/backend/.env` 파일 수정:
```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3000

# MongoDB
MONGODB_URI=mongodb://superadmin:YOUR_PASSWORD@localhost:27017/gonsai2?authSource=admin

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d

# n8n
N8N_API_KEY=your-n8n-api-key
N8N_BASE_URL=http://localhost:5678

# CORS
CORS_ORIGINS=http://localhost:3002
```

**Frontend 환경 변수**:
```bash
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

`apps/frontend/.env.local` 파일 수정:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NEXT_PUBLIC_N8N_BASE_URL=http://localhost:5678
NEXT_PUBLIC_N8N_API_KEY=your-n8n-api-key
```

#### 3. MongoDB 초기화

```bash
npm run init:mongodb
```

### 개발 서버 실행

#### Backend 서버 실행

```bash
# 방법 1: nodemon (자동 재시작)
npm run server:dev

# 방법 2: ts-node 직접 실행
npm run server
```

#### Frontend 서버 실행

```bash
cd apps/frontend
npm run dev
# 또는
npx next dev -p 3002
```

#### 전체 서비스 확인

| URL | 설명 |
|-----|------|
| http://localhost:3002 | Frontend (Next.js) |
| http://localhost:3000 | Backend API |
| http://localhost:3000/health | Backend 헬스체크 |
| http://localhost:5678 | n8n UI |

---

## 운영 환경

### Docker 기반 배포

운영 환경은 Docker Compose를 사용하여 모든 서비스를 컨테이너로 실행합니다.

### 서비스 구성

```yaml
# docker-compose.prod.yml 서비스 목록
services:
  gonsai2-backend    # Express API 서버
  gonsai2-frontend   # Next.js 프론트엔드
  mongodb-prod       # MongoDB 데이터베이스
  nginx              # 리버스 프록시
```

### 운영 서버 시작

#### 1. 환경 변수 확인

운영 환경 변수 파일이 올바르게 설정되었는지 확인:

- `apps/backend/.env.production`
- `apps/frontend/.env.production`

#### 2. Docker Compose로 시작

```bash
# 전체 서비스 시작 (빌드 포함)
docker compose -f docker-compose.prod.yml up -d --build

# 로그 확인
docker compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그만 확인
docker compose -f docker-compose.prod.yml logs -f gonsai2-backend
```

#### 3. 서비스 상태 확인

```bash
# 컨테이너 상태 확인
docker compose -f docker-compose.prod.yml ps

# 예상 출력:
# NAME                   STATUS          PORTS
# gonsai2-backend        Up (healthy)    3000/tcp
# gonsai2-frontend       Up (healthy)    3002/tcp
# gonsai2-mongodb-prod   Up (healthy)    0.0.0.0:27018->27017/tcp
# gonsai2-nginx          Up (healthy)    0.0.0.0:8081->80/tcp
```

#### 4. 접속 확인

| URL | 설명 |
|-----|------|
| http://YOUR_IP:8081 | 웹 애플리케이션 |
| http://YOUR_IP:8081/api/health | API 헬스체크 |
| mongodb://YOUR_IP:27018 | MongoDB 외부 접속 |

### 서비스 관리 명령어

```bash
# 서비스 중지
docker compose -f docker-compose.prod.yml down

# 특정 서비스만 재시작
docker compose -f docker-compose.prod.yml restart gonsai2-backend

# 서비스 중지 및 볼륨 삭제 (주의: 데이터 손실)
docker compose -f docker-compose.prod.yml down -v

# 이미지 다시 빌드
docker compose -f docker-compose.prod.yml build --no-cache
```

### Nginx 라우팅 규칙

| 경로 | 대상 | 설명 |
|------|------|------|
| `/api/*` | Backend (3000) | REST API |
| `/api/n8n/*` | Frontend (3002) | n8n 프록시 (Next.js API Routes) |
| `/ws` | Backend (3000) | WebSocket |
| `/socket.io/*` | Backend (3000) | Socket.io |
| `/webhooks/*` | Backend (3000) | 웹훅 |
| `/*` | Frontend (3002) | 웹 페이지 |

---

## 환경 변수 설정

### Backend 환경 변수 (`apps/backend/.env`)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 실행 환경 | `development` / `production` |
| `PORT` | 서버 포트 | `3000` |
| `MONGODB_URI` | MongoDB 연결 문자열 | `mongodb://user:pass@host:27017/db` |
| `JWT_SECRET` | JWT 서명 키 (32자 이상) | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | `7d` |
| `N8N_API_KEY` | n8n API 키 | n8n Settings에서 생성 |
| `N8N_BASE_URL` | n8n 서버 URL | `http://localhost:5678` |
| `CORS_ORIGINS` | 허용 Origin (쉼표 구분) | `http://localhost:3002` |
| `RATE_LIMIT_MAX_REQUESTS` | Rate Limit 요청 수 | `100` |

### Frontend 환경 변수 (`apps/frontend/.env.local`)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3000/ws` |
| `NEXT_PUBLIC_N8N_BASE_URL` | n8n API URL | `http://localhost:5678` |
| `NEXT_PUBLIC_N8N_API_KEY` | n8n API 키 | n8n Settings에서 생성 |
| `NEXT_PUBLIC_N8N_UI_URL` | n8n UI URL (외부 링크용) | `http://localhost:5678` |

> **주의**: `NEXT_PUBLIC_*` 변수는 클라이언트에 노출됩니다. 민감한 정보는 포함하지 마세요.

---

## 명령어 레퍼런스

### npm 스크립트

```bash
# ===== 개발 =====
npm run server:dev      # Backend 개발 서버 (nodemon)
npm run server          # Backend 서버 (ts-node)

# ===== 빌드 =====
npm run build           # TypeScript 컴파일

# ===== 테스트 =====
npm run test            # Jest 테스트 실행
npm run test:unit       # 단위 테스트
npm run test:integration # 통합 테스트
npm run test:e2e        # E2E 테스트 (Cypress)
npm run test:coverage   # 커버리지 리포트

# ===== 린트 =====
npm run lint            # ESLint 검사
npm run lint:fix        # ESLint 자동 수정
npm run format          # Prettier 포맷팅

# ===== 유틸리티 =====
npm run init:mongodb    # MongoDB 초기화
npm run test:mongodb    # MongoDB 연결 테스트
npm run test:connection # n8n 연결 테스트

# ===== 운영 (PM2) =====
npm run start:prod      # PM2로 프로덕션 시작
npm run stop:prod       # PM2 프로세스 중지
npm run restart:prod    # PM2 재시작
npm run logs:prod       # PM2 로그 확인
```

### Docker 명령어

```bash
# ===== 운영 환경 =====
docker compose -f docker-compose.prod.yml up -d --build   # 시작
docker compose -f docker-compose.prod.yml down            # 중지
docker compose -f docker-compose.prod.yml logs -f         # 로그
docker compose -f docker-compose.prod.yml ps              # 상태
docker compose -f docker-compose.prod.yml restart SERVICE # 재시작

# ===== 컨테이너 관리 =====
docker exec -it gonsai2-backend sh           # Backend 쉘 접속
docker exec -it gonsai2-mongodb-prod mongosh # MongoDB 접속

# ===== 이미지 관리 =====
docker images | grep gonsai2                 # 이미지 목록
docker system prune -f                       # 미사용 리소스 정리
```

---

## 문제 해결

### 포트가 이미 사용 중인 경우

```bash
# 포트 사용 프로세스 확인
lsof -i :3000
lsof -i :3002
lsof -i :8081

# 프로세스 종료
kill -9 <PID>
```

### Docker 컨테이너가 시작되지 않는 경우

```bash
# 상세 로그 확인
docker compose -f docker-compose.prod.yml logs --tail=100

# 헬스체크 상태 확인
docker inspect gonsai2-backend | grep -A 10 "Health"

# 컨테이너 재시작
docker compose -f docker-compose.prod.yml restart
```

### MongoDB 연결 오류

```bash
# MongoDB 컨테이너 상태 확인
docker exec gonsai2-mongodb-prod mongosh --eval "db.runCommand('ping')"

# 연결 문자열 테스트
npm run test:mongodb
```

### n8n 연결 오류

```bash
# n8n API 연결 테스트
npm run test:connection

# n8n 컨테이너 상태 확인
docker ps | grep n8n
```

### 브라우저에서 접속 불가

1. 방화벽 확인:
   ```bash
   sudo ufw status
   sudo ufw allow 8081
   ```

2. Docker 네트워크 확인:
   ```bash
   docker network ls
   docker network inspect gonsai2-network
   ```

3. Nginx 설정 확인:
   ```bash
   docker exec gonsai2-nginx nginx -t
   ```

---

## 부록: 디렉토리 구조

```
gonsai2/
├── apps/
│   ├── backend/              # Express + TypeScript 백엔드
│   │   ├── src/
│   │   ├── .env              # 개발 환경 변수
│   │   ├── .env.production   # 운영 환경 변수
│   │   └── Dockerfile
│   └── frontend/             # Next.js + TypeScript 프론트엔드
│       ├── src/
│       ├── .env.local        # 개발 환경 변수
│       ├── .env.production   # 운영 환경 변수
│       └── Dockerfile
├── deployment/
│   └── nginx/
│       └── nginx.conf        # Nginx 설정
├── docker-compose.prod.yml   # 운영 Docker Compose
├── package.json
└── README.md
```

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-11-26
