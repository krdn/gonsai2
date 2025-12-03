# gonsai2 개발/운영 환경 구성 가이드

최종 업데이트: 2025-11-23

---

## 1. 환경 개요

| 환경     | 접속 URL              | 용도                |
| -------- | --------------------- | ------------------- |
| **개발** | http://localhost:3002 | 로컬 개발 및 테스트 |
| **운영** | http://localhost:8081 | 프로덕션 배포       |

---

## 2. 개발 환경

### 2.1 서비스 구성

| 서비스    | 포트 | 실행 명령              |
| --------- | ---- | ---------------------- |
| Frontend  | 3002 | `npx next dev -p 3002` |
| Backend   | 3000 | `npm run server:dev`   |
| WebSocket | 3001 | Backend와 함께 실행    |

### 2.2 환경 변수 파일

- **Backend**: `apps/backend/.env`
- **Frontend**: `apps/frontend/.env.local`

### 2.3 주요 설정

```bash
# Backend (.env)
NODE_ENV=development
PORT=3000
WS_PORT=3001
MONGODB_URI=mongodb://gonsai2:gonsai2_prod_password@localhost:27018/gonsai2?authSource=admin
N8N_BASE_URL=http://localhost:5678
CORS_ORIGINS=http://localhost:3002,http://192.168.0.50:3002,http://krdn.iptime.org:3002
FRONTEND_URL=http://localhost:3002

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NEXT_PUBLIC_N8N_BASE_URL=http://localhost:5678
```

### 2.4 개발 서버 시작

```bash
# 방법 1: 별도 터미널에서 실행
cd /home/gon/projects/gonsai2

# Backend 시작 (터미널 1)
npm run server:dev

# Frontend 시작 (터미널 2)
cd apps/frontend && npx next dev -p 3002
```

---

## 3. 운영 환경 (Docker)

### 3.1 서비스 구성

| 서비스   | 컨테이너명           | 내부 포트 | 외부 포트 |
| -------- | -------------------- | --------- | --------- |
| Frontend | gonsai2-frontend     | 3002      | -         |
| Backend  | gonsai2-backend      | 3000      | -         |
| MongoDB  | gonsai2-mongodb-prod | 27017     | 27018     |
| Nginx    | gonsai2-nginx        | 80        | 8081      |

### 3.2 환경 변수 파일

- **Backend**: `apps/backend/.env.production`

### 3.3 주요 설정

```bash
# Backend (.env.production)
NODE_ENV=production
PORT=3000
WS_PORT=3001
MONGODB_URI=mongodb://gonsai2:gonsai2_prod_password@mongodb-prod:27017/gonsai2_prod?authSource=admin
N8N_BASE_URL=http://localhost:5678
CORS_ORIGINS=http://localhost:8081,http://192.168.0.50:8081,http://krdn.iptime.org:8081
FRONTEND_URL=http://localhost:8081
```

### 3.4 운영 서버 관리

```bash
cd /home/gon/projects/gonsai2

# 전체 서비스 시작
docker compose -f docker-compose.prod.yml up -d

# 전체 서비스 중지
docker compose -f docker-compose.prod.yml down

# 특정 서비스 재시작
docker compose -f docker-compose.prod.yml restart gonsai2-backend

# 서비스 재빌드 후 시작
docker compose -f docker-compose.prod.yml build gonsai2-backend
docker compose -f docker-compose.prod.yml up -d gonsai2-backend

# 로그 확인
docker logs gonsai2-backend --tail 50 -f
docker logs gonsai2-nginx --tail 50 -f
```

---

## 4. 공유 서비스

다음 서비스는 개발/운영 환경에서 **공유**됩니다:

### 4.1 MongoDB

| 항목      | 값                   |
| --------- | -------------------- |
| 컨테이너  | gonsai2-mongodb-prod |
| 내부 포트 | 27017                |
| 외부 포트 | 27018                |
| 개발 DB   | gonsai2              |
| 운영 DB   | gonsai2_prod         |

**주의**: 개발 환경의 `.env`가 운영 MongoDB(27018)에 연결되어 있음. 데이터베이스 이름으로 구분됨.

### 4.2 n8n

| 항목 | 값                      |
| ---- | ----------------------- |
| 포트 | 5678 (localhost 바인딩) |
| 접속 | http://localhost:5678   |

---

## 5. 포트 맵

### 5.1 전체 포트 사용 현황

| 포트  | 서비스          | 환경      | 바인딩    |
| ----- | --------------- | --------- | --------- |
| 3000  | Backend (개발)  | 개발      | 0.0.0.0   |
| 3001  | WebSocket       | 개발/운영 | 0.0.0.0   |
| 3002  | Frontend (개발) | 개발      | \*        |
| 5678  | n8n             | 공유      | 127.0.0.1 |
| 8081  | Nginx           | 운영      | 0.0.0.0   |
| 27018 | MongoDB         | 공유      | 0.0.0.0   |

### 5.2 포트 충돌 방지

개발과 운영 환경은 다른 포트를 사용하므로 **병행 실행 가능**:

- 개발: 3002 (Frontend), 3000 (Backend)
- 운영: 8081 (Nginx를 통한 모든 접근)

---

## 6. 네트워크 구성

### 6.1 Docker 네트워크

```yaml
networks:
  gonsai2-network: # 내부 서비스 통신
    driver: bridge
  n8n-network: # n8n 연결용
    external: true
    name: docker-n8n_n8n-network
```

### 6.2 서비스 간 통신

| 출발     | 도착    | 호스트명        |
| -------- | ------- | --------------- |
| Frontend | Backend | gonsai2-backend |
| Backend  | MongoDB | mongodb-prod    |
| Backend  | n8n     | n8n             |

---

## 7. 문제 해결

### 7.1 502 Bad Gateway

**원인**: Nginx가 이전 컨테이너 IP를 캐시하고 있음

**해결**:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### 7.2 CORS 오류

**원인**: CORS_ORIGINS에 올바른 포트가 포함되지 않음

**해결**: `.env.production`의 `CORS_ORIGINS`에 포트 8081 추가

```bash
CORS_ORIGINS=http://localhost:8081,http://192.168.0.50:8081
```

### 7.3 MongoDB 연결 실패

**개발 환경**:

```bash
# 운영 MongoDB 컨테이너가 실행 중인지 확인
docker ps | grep mongodb-prod

# 연결 테스트
mongosh "mongodb://gonsai2:gonsai2_prod_password@localhost:27018/gonsai2?authSource=admin"
```

### 7.4 환경 변수 변경 후 적용

```bash
# 백엔드 재빌드 및 재시작
docker compose -f docker-compose.prod.yml build gonsai2-backend
docker compose -f docker-compose.prod.yml up -d gonsai2-backend

# Nginx도 재시작 (DNS 캐시 갱신)
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 8. 보안 체크리스트

### 8.1 필수 설정 항목

- [ ] JWT_SECRET: 32바이트 이상의 안전한 키
- [ ] SESSION_SECRET: 32바이트 이상의 안전한 키
- [ ] MongoDB 비밀번호: 강력한 비밀번호
- [ ] 이메일 SMTP 설정: 실제 이메일 계정

### 8.2 키 생성 방법

```bash
# 32바이트 랜덤 키 생성
openssl rand -hex 32
```

---

## 9. 빠른 참조

### 9.1 개발 환경 시작

```bash
cd /home/gon/projects/gonsai2
npm run server:dev  # Backend
# 별도 터미널
cd apps/frontend && npx next dev -p 3002  # Frontend
```

접속: http://localhost:3002

### 9.2 운영 환경 관리

```bash
cd /home/gon/projects/gonsai2

# 시작
docker compose -f docker-compose.prod.yml up -d

# 상태 확인
docker ps | grep gonsai2

# 로그
docker logs gonsai2-backend -f

# 재시작
docker compose -f docker-compose.prod.yml restart nginx gonsai2-backend
```

접속: http://localhost:8081

---

생성일: 2025-11-23
