# gonsai2 포트 설정 가이드

> 마지막 업데이트: 2025-11-27
>
> **중요**: 이 문서는 gonsai2 프로젝트의 공식 포트 설정 기준입니다.
> 포트 변경 시 반드시 이 문서를 업데이트하세요.

---

## 📋 목차

1. [포트 구조 개요](#포트-구조-개요)
2. [개발 환경](#개발-환경)
3. [운영 환경 (Docker)](#운영-환경-docker)
4. [환경별 설정 파일](#환경별-설정-파일)
5. [CORS 설정](#cors-설정)
6. [문제 해결](#문제-해결)

---

## 포트 구조 개요

### 포트 할당 원칙

| 포트      | 용도              | 환경      | 비고                       |
| --------- | ----------------- | --------- | -------------------------- |
| **3000**  | Backend API       | 개발/운영 | Express 서버               |
| **3001**  | WebSocket         | 개발/운영 | 별도 WS 서버 (현재 미사용) |
| **3002**  | Frontend (Docker) | 운영      | Docker 내부 포트           |
| **3003**  | Frontend (개발)   | 개발      | 로컬 개발 서버             |
| **5678**  | n8n               | 공통      | 워크플로우 자동화          |
| **8081**  | Nginx             | 운영      | 리버스 프록시 (외부 접근)  |
| **27017** | MongoDB (내부)    | 운영      | Docker 내부                |
| **27018** | MongoDB (외부)    | 개발/운영 | 외부 접근용                |

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           개발 환경 (Development)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│  │  Frontend   │     │   Backend   │     │   MongoDB   │               │
│  │  (Next.js)  │────▶│  (Express)  │────▶│   (Docker)  │               │
│  │  :3003      │     │  :3000      │     │  :27018     │               │
│  └─────────────┘     └─────────────┘     └─────────────┘               │
│        │                   │                                            │
│        │                   ▼                                            │
│        │             ┌─────────────┐                                    │
│        └────────────▶│    n8n      │                                    │
│                      │  :5678      │                                    │
│                      └─────────────┘                                    │
│                                                                         │
│  접근 URL: http://192.168.0.5:3003 (또는 http://localhost:3003)        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           운영 환경 (Production)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                      ┌─────────────┐                                    │
│                      │   Nginx     │                                    │
│      외부 접근 ─────▶│   :8081     │                                    │
│                      └──────┬──────┘                                    │
│                             │                                           │
│              ┌──────────────┼──────────────┐                            │
│              ▼              ▼              ▼                            │
│       ┌───────────┐  ┌───────────┐  ┌───────────┐                      │
│       │ Frontend  │  │  Backend  │  │  MongoDB  │                      │
│       │ (Docker)  │  │ (Docker)  │  │ (Docker)  │                      │
│       │  :3002    │  │  :3000    │  │  :27017   │                      │
│       └───────────┘  └─────┬─────┘  └───────────┘                      │
│                            │                                            │
│                            ▼                                            │
│                      ┌───────────┐                                      │
│                      │   n8n     │                                      │
│                      │  :5678    │                                      │
│                      └───────────┘                                      │
│                                                                         │
│  접근 URL: http://서버IP:8081 (예: http://krdn.iptime.org:8081)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 개발 환경

### 서비스 시작 명령어

```bash
# 1. 백엔드 서버 시작 (포트 3000)
cd /home/gon/projects/n8n/gonsai2
npm run server:dev

# 2. 프론트엔드 개발 서버 시작 (포트 3003)
cd /home/gon/projects/n8n/gonsai2/apps/frontend
npm run dev -- -p 3003 -H 0.0.0.0

# 또는 루트에서
npm run frontend:dev -- -p 3003 -H 0.0.0.0
```

### 개발 환경 포트 정리

| 서비스   | 포트  | 바인딩    | 접근 URL                    |
| -------- | ----- | --------- | --------------------------- |
| Frontend | 3003  | 0.0.0.0   | http://192.168.0.5:3003     |
| Backend  | 3000  | 0.0.0.0   | http://192.168.0.5:3000     |
| MongoDB  | 27018 | 0.0.0.0   | mongodb://192.168.0.5:27018 |
| n8n      | 5678  | 127.0.0.1 | http://localhost:5678       |

### 필수 환경 파일

**`apps/frontend/.env.local`** (개발용)

```bash
# Backend API URL (서버 IP 사용, /api 없이)
NEXT_PUBLIC_API_URL=http://192.168.0.5:3000

# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://192.168.0.5:3000/ws

# Socket.io URL - 백엔드 서버 주소
NEXT_PUBLIC_SOCKET_URL=http://192.168.0.5:3000

# n8n Configuration
NEXT_PUBLIC_N8N_BASE_URL=http://localhost:5678
NEXT_PUBLIC_N8N_UI_URL=http://localhost:5678

# Development flags
NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
NEXT_PUBLIC_DEBUG_MODE=true
```

**`apps/backend/.env`** (개발용)

```bash
NODE_ENV=development
HOST=0.0.0.0
PORT=3000

# MongoDB - Docker 컨테이너 외부 포트
MONGODB_URI=mongodb://gonsai2:gonsai2_prod_password@localhost:27018/gonsai2?authSource=admin

# CORS - 개발 환경 URL 포함
CORS_ORIGINS=http://localhost:3002,http://localhost:3003,http://192.168.0.5:3002,http://192.168.0.5:3003

# n8n
N8N_BASE_URL=http://localhost:5678
```

---

## 운영 환경 (Docker)

### Docker Compose 시작

```bash
# 시작
docker-compose -f docker-compose.prod.yml up -d --build

# 종료
docker-compose -f docker-compose.prod.yml down

# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

### 운영 환경 포트 정리

| 서비스   | 내부 포트 | 외부 포트 | 설명          |
| -------- | --------- | --------- | ------------- |
| nginx    | 80        | 8081      | 리버스 프록시 |
| frontend | 3002      | -         | 내부 전용     |
| backend  | 3000      | 3000\*    | 내부 + 개발용 |
| mongodb  | 27017     | 27018     | 외부 접근용   |

> \*주의: 개발 환경에서 직접 API 테스트 시에만 backend 포트 3000 노출

### Nginx 라우팅 규칙

| 경로           | 대상          | 설명              |
| -------------- | ------------- | ----------------- |
| `/api/n8n/*`   | frontend:3002 | n8n 프록시 라우트 |
| `/api/*`       | backend:3000  | 백엔드 API        |
| `/ws`          | backend:3000  | WebSocket         |
| `/socket.io/*` | backend:3000  | Socket.io         |
| `/webhooks/*`  | backend:3000  | 웹훅              |
| `/*`           | frontend:3002 | 프론트엔드        |

### 필수 환경 파일

**`apps/frontend/.env.production`** (운영용)

```bash
NODE_ENV=production

# API URL - Nginx 리버스 프록시를 통해 접근
NEXT_PUBLIC_API_URL=http://localhost:8081/api

# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8081/ws

# Socket.io URL - 비워두면 window.location.origin 사용
NEXT_PUBLIC_SOCKET_URL=

# n8n
NEXT_PUBLIC_N8N_BASE_URL=http://localhost:5678
NEXT_PUBLIC_N8N_UI_URL=https://krdn-n8n.duckdns.org
```

**`apps/backend/.env.production`** (운영용)

```bash
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# MongoDB - Docker 내부 네트워크
MONGODB_URI=mongodb://gonsai2:gonsai2_prod_password@mongodb-prod:27017/gonsai2_prod?authSource=admin

# CORS - 운영 및 개발 환경 URL
CORS_ORIGINS=http://localhost:8081,http://192.168.0.50:8081,http://krdn.iptime.org:8081,http://192.168.0.5:3003,http://localhost:3003

# n8n - Docker 내부 네트워크
N8N_BASE_URL=http://host.docker.internal:5678
```

---

## 환경별 설정 파일

### 설정 파일 위치 및 용도

```
gonsai2/
├── apps/
│   ├── backend/
│   │   ├── .env                 # 개발 환경 (로컬 실행)
│   │   ├── .env.production      # 운영 환경 (Docker)
│   │   └── .env.example         # 템플릿
│   └── frontend/
│       ├── .env.local           # 개발 환경 (로컬 실행)
│       ├── .env.production      # 운영 환경 (Docker 빌드)
│       └── .env.local.example   # 템플릿
├── docker-compose.prod.yml      # 운영 Docker Compose
└── deployment/
    └── nginx/
        └── nginx.conf           # Nginx 설정
```

### 환경 변수 우선순위

**Next.js (Frontend)**

1. `.env.local` (개발 시 최우선)
2. `.env.production` (빌드 시)
3. `.env`

**Express (Backend)**

1. 환경 변수
2. `.env` 파일 (dotenv)
3. Docker Compose env_file

---

## CORS 설정

### CORS 허용 Origin 목록

**개발 환경**

```
http://localhost:3002
http://localhost:3003
http://192.168.0.5:3002
http://192.168.0.5:3003
```

**운영 환경**

```
http://localhost:8081
http://192.168.0.50:8081
http://krdn.iptime.org:8081
```

### CORS 오류 발생 시 체크리스트

1. [ ] 백엔드 `.env` 파일의 `CORS_ORIGINS`에 프론트엔드 URL 포함 확인
2. [ ] 프론트엔드 URL의 프로토콜(http/https) 일치 확인
3. [ ] 포트 번호 정확히 일치 확인
4. [ ] 백엔드 서버 재시작 여부 확인
5. [ ] Docker 환경일 경우 컨테이너 재생성 필요

---

## 문제 해결

### 포트 충돌 확인

```bash
# 특정 포트 사용 프로세스 확인
ss -tlnp | grep :3000
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 자주 발생하는 문제

#### 1. "Port already in use" 오류

```bash
# 원인: 이전 프로세스가 포트를 점유 중
# 해결:
ss -tlnp | grep :<포트>
kill -9 <PID>
```

#### 2. Docker 컨테이너 포트 바인딩 실패

```bash
# 원인: 로컬에서 같은 포트 사용 중
# 해결:
# 1. 로컬 프로세스 종료
# 2. 또는 docker-compose.prod.yml에서 포트 매핑 변경
```

#### 3. CORS 오류

```bash
# 원인: 프론트엔드 URL이 CORS_ORIGINS에 미포함
# 해결:
# 1. apps/backend/.env의 CORS_ORIGINS에 URL 추가
# 2. 백엔드 서버 재시작
```

#### 4. Socket.io 연결 실패

```bash
# 원인: NEXT_PUBLIC_SOCKET_URL 미설정 또는 잘못된 값
# 해결:
# 1. apps/frontend/.env.local에 NEXT_PUBLIC_SOCKET_URL 설정
# 2. 프론트엔드 서버 재시작 (환경 변수 리로드)
```

### 연결 테스트

```bash
# 백엔드 API 테스트
curl http://192.168.0.5:3000/health

# 프론트엔드 접근 테스트
curl http://192.168.0.5:3003

# MongoDB 연결 테스트
mongosh mongodb://gonsai2:gonsai2_prod_password@localhost:27018/gonsai2?authSource=admin

# n8n API 테스트
curl http://localhost:5678/api/v1/workflows
```

---

## 변경 이력

| 날짜       | 변경 내용      | 담당자 |
| ---------- | -------------- | ------ |
| 2025-11-27 | 초기 문서 작성 | Claude |

---

## 관련 이슈

- [#85 - 개발 환경 콘솔 오류 수정](https://github.com/krdn/gonsai2/issues/85)
