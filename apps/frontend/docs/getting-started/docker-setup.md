---
sidebar_position: 2
title: Docker 환경 설정
---

# Docker 환경 설정

n8n 워크플로우 관리 시스템을 실행하기 위한 Docker 환경을 구성합니다.

## 사전 요구사항

### Docker 설치

**Ubuntu/Debian:**

```bash
# 이전 버전 제거
sudo apt-get remove docker docker-engine docker.io containerd runc

# 필요한 패키지 설치
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Docker GPG 키 추가
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

**macOS:**

```bash
# Homebrew 사용
brew install --cask docker

# Docker Desktop 실행 후 Docker 아이콘 확인
```

**Windows:**

1. [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) 다운로드
2. WSL 2 백엔드 활성화
3. Docker Desktop 설치 및 실행

### Docker Compose 설치

Docker Desktop을 설치한 경우 Docker Compose가 포함되어 있습니다. 별도 설치가 필요한 경우:

```bash
# Linux (standalone)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 설치 확인
docker-compose --version
```

### 설치 확인

```bash
# Docker 버전 확인
docker --version
# Docker version 24.0.0 이상

# Docker Compose 버전 확인
docker-compose --version
# Docker Compose version v2.24.0 이상

# Docker 실행 테스트
docker run hello-world
```

## 프로젝트 구조

```
project-root/
├── docker-compose.yml       # Docker 서비스 정의
├── .env                      # 환경 변수 (비공개)
├── .env.example              # 환경 변수 템플릿
├── nginx.conf                # Nginx 설정
└── volumes/
    ├── n8n/                  # n8n 데이터
    ├── postgres/             # PostgreSQL 데이터
    ├── redis/                # Redis 데이터
    └── mongodb/              # MongoDB 데이터
```

## Docker Compose 설정

### 기본 docker-compose.yml

프로젝트 루트에 `docker-compose.yml` 파일을 생성합니다:

```yaml
version: '3.8'

services:
  # n8n Main Service
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - '5678:5678'
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=${WEBHOOK_URL}
      - GENERIC_TIMEZONE=${TIMEZONE}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}

      # Database Configuration
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
      - DB_POSTGRESDB_USER=${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}

      # Queue Configuration
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - QUEUE_BULL_REDIS_DB=0

      # Performance Settings
      - N8N_PAYLOAD_SIZE_MAX=16
      - EXECUTIONS_TIMEOUT=300
      - EXECUTIONS_TIMEOUT_MAX=600
    volumes:
      - ./volumes/n8n:/home/node/.n8n
      - ./volumes/local-files:/files
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'wget --spider -q http://localhost:5678/healthz || exit 1']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    networks:
      - n8n-network

  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - ./volumes/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - n8n-network

  # Redis Cache & Queue
  redis:
    image: redis:7-alpine
    container_name: n8n-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - ./volumes/redis:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - n8n-network

  # MongoDB (for frontend metadata)
  mongodb:
    image: mongo:7
    container_name: n8n-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
      - MONGO_INITDB_DATABASE=${MONGO_DATABASE}
    volumes:
      - ./volumes/mongodb:/data/db
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - n8n-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - n8n
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge

volumes:
  n8n-data:
  postgres-data:
  redis-data:
  mongodb-data:
```

### 환경 변수 설정

`.env.example`을 `.env`로 복사하고 값을 설정합니다:

```bash
cp .env.example .env
```

`.env` 파일 내용:

```bash
# n8n Configuration
N8N_HOST=localhost
WEBHOOK_URL=http://localhost:5678/
TIMEZONE=Asia/Seoul

# 중요: 첫 실행 전 랜덤 키 생성
# openssl rand -base64 32
N8N_ENCRYPTION_KEY=your-encryption-key-here

# PostgreSQL Configuration
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=n8n

# MongoDB Configuration
MONGO_USER=admin
MONGO_PASSWORD=your-mongo-password
MONGO_DATABASE=n8n_frontend

# Optional: Basic Authentication
N8N_BASIC_AUTH_ACTIVE=false
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin
```

### 암호화 키 생성

**중요**: `N8N_ENCRYPTION_KEY`는 한 번 설정한 후 절대 변경하면 안 됩니다!

```bash
# 안전한 랜덤 키 생성
openssl rand -base64 32
```

## 개발 환경 시작

### 서비스 시작

```bash
# 백그라운드에서 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f n8n
```

### 헬스 체크

```bash
# 모든 서비스 상태 확인
docker-compose ps

# 개별 서비스 헬스 체크
docker-compose exec n8n wget -q --spider http://localhost:5678/healthz
docker-compose exec postgres pg_isready -U n8n
docker-compose exec redis redis-cli ping
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

### 서비스 중지

```bash
# 모든 서비스 중지 (데이터 유지)
docker-compose down

# 볼륨까지 삭제 (완전 초기화)
docker-compose down -v
```

## 프로덕션 환경 설정

### SSL/TLS 설정

#### Let's Encrypt 사용

```bash
# Certbot 설치
sudo apt-get install certbot

# SSL 인증서 발급
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com

# 인증서를 프로젝트로 복사
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/
```

#### Nginx SSL 설정

`nginx.conf` 파일:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream n8n {
        server n8n:5678;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # SSL 보안 설정
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 보안 헤더
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location / {
            proxy_pass http://n8n;
            proxy_http_version 1.1;

            # WebSocket 지원
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            # 프록시 헤더
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # 타임아웃 설정
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
```

### 리소스 제한 설정

프로덕션 환경에서는 리소스 제한을 추가합니다:

```yaml
services:
  n8n:
    # ... 기존 설정 ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  postgres:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          memory: 1G

  redis:
    deploy:
      resources:
        limits:
          memory: 1G
```

## 트러블슈팅

### 포트 충돌

```bash
# 포트 사용 확인
sudo lsof -i :5678
sudo lsof -i :5432
sudo lsof -i :6379

# 프로세스 종료
sudo kill -9 <PID>
```

### 볼륨 권한 문제

```bash
# 볼륨 디렉토리 권한 설정
sudo chown -R $USER:$USER ./volumes
chmod -R 755 ./volumes
```

### 컨테이너 로그 확인

```bash
# 전체 로그 출력
docker-compose logs

# 마지막 100줄만
docker-compose logs --tail=100

# 실시간 로그
docker-compose logs -f --tail=50
```

### 컨테이너 재시작

```bash
# 특정 서비스만 재시작
docker-compose restart n8n

# 모든 서비스 재시작
docker-compose restart
```

### 데이터베이스 연결 실패

```bash
# PostgreSQL 컨테이너 접속
docker-compose exec postgres psql -U n8n -d n8n

# 연결 테스트
docker-compose exec n8n ping postgres
```

## 다음 단계

1. [n8n 연동](./n8n-connection) - n8n 인스턴스 연결 설정
2. [환경 변수 설정](./environment-variables) - 상세 환경 변수 가이드
3. [첫 워크플로우 실행](./first-workflow) - 간단한 워크플로우 생성

## 추가 리소스

- [Docker 공식 문서](https://docs.docker.com/)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [n8n Docker 가이드](https://docs.n8n.io/hosting/installation/docker/)
- [PostgreSQL Docker 이미지](https://hub.docker.com/_/postgres)
