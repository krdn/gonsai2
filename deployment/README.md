# 🚀 Gonsai2 배포 가이드

> AI-Optimized n8n Integration Platform 배포 문서

## 📋 목차

1. [시스템 요구사항](#시스템-요구사항)
2. [환경 설정](#환경-설정)
3. [Docker 배포](#docker-배포)
4. [프로덕션 배포](#프로덕션-배포)
5. [CI/CD 파이프라인](#cicd-파이프라인)
6. [모니터링 및 로깅](#모니터링-및-로깅)
7. [보안 고려사항](#보안-고려사항)
8. [트러블슈팅](#트러블슈팅)

## 시스템 요구사항

### 최소 요구사항

- **OS**: Ubuntu 20.04 LTS 이상
- **CPU**: 2 Core 이상
- **RAM**: 4GB 이상
- **Storage**: 20GB 이상
- **Node.js**: v18.17.0 이상
- **MongoDB**: 6.0 이상
- **Docker**: 20.10 이상
- **Docker Compose**: v2.0 이상

### 권장 사양

- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 Core 이상
- **RAM**: 8GB 이상
- **Storage**: 50GB SSD
- **Network**: 100Mbps 이상

## 환경 설정

### 1. 환경 변수 설정

프로젝트 루트에 `.env.production` 파일을 생성:

```bash
# Backend Environment Variables
NODE_ENV=production
HOST=0.0.0.0
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://username:password@localhost:27017/gonsai2?authSource=admin
MONGODB_MAX_POOL_SIZE=100
MONGODB_MIN_POOL_SIZE=10

# JWT Configuration
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# n8n Integration
N8N_API_KEY=your-n8n-api-key
N8N_BASE_URL=https://n8n.yourdomain.com
N8N_WEBHOOK_SECRET=your-webhook-secret

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# WebSocket Configuration
WS_PORT=3001
WS_PATH=/ws

# Frontend URLs
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
```

### 2. SSL/TLS 인증서 설정

Let's Encrypt를 사용한 SSL 인증서 발급:

```bash
# Certbot 설치
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com

# 자동 갱신 설정
sudo systemctl enable certbot.timer
```

## Docker 배포

### 1. Docker 이미지 빌드

프로젝트 루트에서 실행:

```bash
# 백엔드 이미지 빌드
docker build -t gonsai2-backend:latest -f deployment/docker/backend.Dockerfile .

# 프론트엔드 이미지 빌드
docker build -t gonsai2-frontend:latest -f deployment/docker/frontend.Dockerfile .
```

### 2. Docker Compose로 실행

```bash
# 프로덕션 환경으로 실행
docker-compose -f deployment/docker/docker-compose.prod.yml up -d

# 로그 확인
docker-compose -f deployment/docker/docker-compose.prod.yml logs -f

# 서비스 중지
docker-compose -f deployment/docker/docker-compose.prod.yml down
```

### 3. 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 헬스체크
docker inspect gonsai2-backend --format='{{.State.Health.Status}}'

# 리소스 사용량 모니터링
docker stats
```

## 프로덕션 배포

### 1. PM2를 사용한 프로세스 관리

```bash
# PM2 설치
npm install -g pm2

# 백엔드 실행
cd apps/backend
pm2 start ecosystem.config.js --env production

# 프론트엔드 실행
cd apps/frontend
pm2 start npm --name "gonsai2-frontend" -- start

# PM2 프로세스 저장
pm2 save

# 시스템 재시작 시 자동 실행
pm2 startup
```

### 2. Nginx 리버스 프록시 설정

`/etc/nginx/sites-available/gonsai2` 파일 생성:

```nginx
# Backend API Server
upstream backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Frontend Next.js Server
upstream frontend {
    server 127.0.0.1:3002;
    keepalive 64;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Frontend Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS API Server
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API endpoints
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Request timeout
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

Nginx 설정 적용:

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/gonsai2 /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl reload nginx
```

### 3. 데이터베이스 백업 설정

자동 백업 스크립트 (`/home/gon/projects/gonsai2/scripts/backup.sh`):

```bash
#!/bin/bash

# 백업 디렉토리
BACKUP_DIR="/home/gon/backups/gonsai2"
DATE=$(date +%Y%m%d_%H%M%S)

# 디렉토리 생성
mkdir -p $BACKUP_DIR

# MongoDB 백업
mongodump --uri="mongodb://username:password@localhost:27017/gonsai2?authSource=admin" \
  --out="$BACKUP_DIR/mongodb_$DATE"

# 백업 압축
tar -czf "$BACKUP_DIR/gonsai2_backup_$DATE.tar.gz" \
  -C "$BACKUP_DIR" "mongodb_$DATE"

# 원본 백업 삭제
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# 30일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: gonsai2_backup_$DATE.tar.gz"
```

Cron 작업 설정:

```bash
# Crontab 편집
crontab -e

# 매일 새벽 2시 백업 실행
0 2 * * * /home/gon/projects/gonsai2/scripts/backup.sh >> /var/log/gonsai2-backup.log 2>&1
```

## CI/CD 파이프라인

### GitHub Actions 워크플로우

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: |
          docker build -t gonsai2-backend:${{ github.sha }} -f deployment/docker/backend.Dockerfile .
          docker build -t gonsai2-frontend:${{ github.sha }} -f deployment/docker/frontend.Dockerfile .

      - name: Push to Registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push gonsai2-backend:${{ github.sha }}
          docker push gonsai2-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /home/gon/projects/gonsai2
            git pull origin main
            docker-compose -f deployment/docker/docker-compose.prod.yml pull
            docker-compose -f deployment/docker/docker-compose.prod.yml up -d
            pm2 reload all
```

## 모니터링 및 로깅

### 1. 로그 관리

Winston 로거 설정이 이미 구성되어 있음:

- 로그 파일 위치: `apps/backend/logs/`
- 로그 레벨: error, warn, info, debug
- 자동 로테이션: 14일 보관, 20MB 제한

### 2. 헬스체크 엔드포인트

```bash
# API 서버 헬스체크
curl https://api.yourdomain.com/health

# MongoDB 연결 상태 확인
curl https://api.yourdomain.com/health/db

# 전체 시스템 상태
curl https://api.yourdomain.com/health/system
```

### 3. 성능 모니터링

PM2 모니터링:

```bash
# PM2 대시보드
pm2 monit

# 프로세스 상태
pm2 status

# 로그 스트리밍
pm2 logs

# 메트릭 확인
pm2 describe gonsai2-backend
```

## 보안 고려사항

### 1. 방화벽 설정

```bash
# UFW 설정
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. 환경 변수 보안

- `.env` 파일은 절대 Git에 커밋하지 않음
- 프로덕션 환경 변수는 별도 관리
- 민감한 정보는 환경 변수나 시크릿 관리 도구 사용

### 3. 보안 헤더

Nginx와 Express 미들웨어(Helmet)를 통한 보안 헤더 설정 완료

### 4. Rate Limiting

Express Rate Limit 미들웨어 설정 완료:

- API: 분당 100 요청
- 인증: 5분당 5 요청

## 트러블슈팅

### 일반적인 문제 해결

#### 1. MongoDB 연결 실패

```bash
# MongoDB 상태 확인
sudo systemctl status mongod

# 연결 테스트
mongosh --eval "db.adminCommand('ping')"

# 로그 확인
sudo tail -f /var/log/mongodb/mongod.log
```

#### 2. PM2 프로세스 충돌

```bash
# 프로세스 재시작
pm2 restart all

# 로그 확인
pm2 logs --lines 100

# 프로세스 삭제 후 재시작
pm2 delete all
pm2 start ecosystem.config.js --env production
```

#### 3. Nginx 502 Bad Gateway

```bash
# 백엔드 서버 상태 확인
curl http://localhost:3000/health

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# 서비스 재시작
pm2 restart gonsai2-backend
sudo systemctl reload nginx
```

#### 4. Docker 컨테이너 문제

```bash
# 컨테이너 로그 확인
docker logs gonsai2-backend

# 컨테이너 재시작
docker-compose -f deployment/docker/docker-compose.prod.yml restart

# 전체 재배포
docker-compose -f deployment/docker/docker-compose.prod.yml down
docker-compose -f deployment/docker/docker-compose.prod.yml up -d
```

## 유용한 스크립트

### 배포 스크립트 (`scripts/deploy.sh`)

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Git pull
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build
echo "🔨 Building application..."
npm run build

# Database migration (if needed)
echo "🗄️ Running database migrations..."
npm run migrate:prod

# Restart services
echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Deployment completed!"
```

### 롤백 스크립트 (`scripts/rollback.sh`)

```bash
#!/bin/bash
set -e

echo "⏪ Starting rollback..."

# 이전 버전으로 체크아웃
PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
git checkout $PREVIOUS_COMMIT

# Dependencies 재설치
npm ci

# 빌드
npm run build

# 서비스 재시작
pm2 restart all

echo "✅ Rollback completed to commit: $PREVIOUS_COMMIT"
```

## 연락처

문제 발생 시 연락처:

- Email: support@gonsai2.com
- GitHub Issues: https://github.com/yourusername/gonsai2/issues

---

최종 업데이트: 2024-01-13
