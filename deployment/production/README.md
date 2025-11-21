# gonsai2 프로덕션 배포 가이드

n8n 통합 Next.js 애플리케이션의 프로덕션 환경 배포 및 운영 가이드

---

## 목차

1. [시스템 아키텍처](#시스템-아키텍처)
2. [사전 요구사항](#사전-요구사항)
3. [설치 및 설정](#설치-및-설정)
4. [배포](#배포)
5. [운영](#운영)
6. [모니터링](#모니터링)
7. [백업 및 복구](#백업-및-복구)
8. [트러블슈팅](#트러블슈팅)

---

## 시스템 아키텍처

### 구성 요소

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (SSL)                         │
│                    Reverse Proxy & LB                       │
└───────────┬─────────────────────────────────────┬───────────┘
            │                                     │
    ┌───────▼──────┐                     ┌───────▼──────┐
    │   Frontend   │                     │     n8n      │
    │  (Next.js)   │◄────────────────────┤  (Workflow)  │
    │              │    API Calls        │              │
    └───────┬──────┘                     └───────┬──────┘
            │                                    │
            │                            ┌───────▼──────┐
            │                            │  n8n Worker  │
            │                            │  (x2 replicas)│
            │                            └───────┬──────┘
            │                                    │
    ┌───────▼──────────────────────────────────▼──────┐
    │                  Redis (Cache & Queue)           │
    └──────────────────────────────────────────────────┘
            │                                    │
    ┌───────▼──────┐                     ┌──────▼──────┐
    │   MongoDB    │                     │  PostgreSQL │
    │  (App Data)  │                     │  (n8n Data) │
    └──────────────┘                     └─────────────┘
```

### 모니터링 스택

- **Prometheus**: 메트릭 수집
- **Grafana**: 시각화 대시보드
- **Loki**: 로그 집계
- **Promtail**: 로그 수집
- **Alertmanager**: 알림 관리

---

## 사전 요구사항

### 하드웨어

**최소 사양**:

- CPU: 4 cores
- RAM: 8GB
- Disk: 100GB SSD
- Network: 100Mbps

**권장 사양**:

- CPU: 8 cores
- RAM: 16GB
- Disk: 500GB NVMe SSD
- Network: 1Gbps

### 소프트웨어

- **OS**: Ubuntu 22.04 LTS (권장) 또는 Debian 11+
- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **Git**: 2.30+

### 네트워크

- **포트 개방** (방화벽):
  - 80 (HTTP → HTTPS 리다이렉트)
  - 443 (HTTPS)

- **내부 포트** (localhost 바인딩):
  - 3000 (Frontend)
  - 5678 (n8n)
  - 5432 (PostgreSQL)
  - 27017 (MongoDB)
  - 6379 (Redis)
  - 9090 (Prometheus)
  - 3001 (Grafana)
  - 3100 (Loki)

### 도메인

- 메인: `yourdomain.com`
- n8n: `n8n.yourdomain.com`
- Grafana: `grafana.yourdomain.com`

---

## 설치 및 설정

### 1. 시스템 준비

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git
```

### 2. Docker 설치

```bash
# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker Compose 설치 (standalone)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 로그아웃 후 재로그인 필요
```

### 3. 프로젝트 클론

```bash
git clone <repository-url>
cd gonsai2/deployment/production
```

### 4. 환경 변수 설정

```bash
# .env 템플릿 복사
cp .env.example .env.production

# 환경 변수 편집
nano .env.production
```

**필수 설정 항목**:

```bash
# Application
APP_URL=https://yourdomain.com

# n8n
N8N_HOST=yourdomain.com
N8N_WEBHOOK_URL=https://yourdomain.com/webhook
N8N_ENCRYPTION_KEY=  # 32자 이상의 랜덤 문자열
N8N_JWT_SECRET=      # 32자 이상의 랜덤 문자열

# Databases
POSTGRES_PASSWORD=   # 강력한 비밀번호
MONGO_ROOT_PASSWORD= # 강력한 비밀번호
REDIS_PASSWORD=      # 강력한 비밀번호

# Security
JWT_SECRET=          # 32자 이상의 랜덤 문자열
ENCRYPTION_KEY=      # 32자 이상의 랜덤 문자열

# Monitoring
GRAFANA_ADMIN_PASSWORD=  # 강력한 비밀번호
```

**랜덤 키 생성 방법**:

```bash
# N8N_ENCRYPTION_KEY, JWT_SECRET 등
openssl rand -hex 32
```

### 5. SSL 인증서 설정

#### 옵션 A: Let's Encrypt (권장)

```bash
# Certbot 설치
sudo apt install -y certbot

# 인증서 발급 (standalone 모드)
sudo certbot certonly --standalone -d yourdomain.com -d n8n.yourdomain.com -d grafana.yourdomain.com

# 인증서 복사
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem nginx/ssl/chain.pem

# DH 파라미터 생성
sudo openssl dhparam -out nginx/ssl/dhparam.pem 2048

# 권한 설정
sudo chown $USER:$USER nginx/ssl/*
```

#### 옵션 B: 자체 서명 인증서 (테스트용)

```bash
# start.sh 실행 시 자동 생성되도록 선택
# 또는 수동 생성:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=Organization/CN=localhost"
```

### 6. Nginx 설정 수정

```bash
# 도메인 변경
sed -i 's/yourdomain.com/actual-domain.com/g' nginx/conf.d/*.conf
```

---

## 배포

### 초기 배포

```bash
# 1. 스크립트 실행 권한 부여
chmod +x scripts/*.sh

# 2. 배포 시작
./scripts/start.sh
```

스크립트는 다음을 자동으로 수행합니다:

1. 환경 검증
2. 필수 디렉토리 생성
3. SSL 인증서 확인
4. Docker 이미지 Pull
5. 서비스 단계별 시작
6. Health Check

### 수동 배포 (세밀한 제어)

```bash
# 1. 이미지 Pull
docker-compose pull

# 2. 데이터베이스 먼저 시작
docker-compose up -d postgres mongodb redis

# 3. 데이터베이스 준비 대기
sleep 30

# 4. n8n 시작
docker-compose up -d n8n n8n-worker

# 5. n8n 준비 대기
sleep 20

# 6. Frontend 시작
docker-compose up -d gonsai2-app

# 7. 나머지 서비스 시작
docker-compose up -d
```

### 배포 검증

```bash
# 1. 컨테이너 상태 확인
docker-compose ps

# 모든 서비스가 "Up (healthy)" 상태여야 함

# 2. Health Check
curl -f http://localhost:5678/healthz        # n8n
curl -f http://localhost:3000/api/health     # Frontend
curl -f http://localhost:9090/-/healthy      # Prometheus
curl -f http://localhost:3001/api/health     # Grafana

# 3. 로그 확인
docker-compose logs -f --tail=100
```

---

## 운영

### 서비스 관리

```bash
# 전체 서비스 중지
./scripts/stop.sh

# 전체 서비스 시작
./scripts/start.sh

# 특정 서비스 재시작
docker-compose restart [service-name]

# 로그 확인
docker-compose logs -f [service-name]

# 서비스 스케일링 (n8n 워커)
docker-compose up -d --scale n8n-worker=3
```

### 업데이트

```bash
# 1. 백업 생성
./scripts/backup.sh

# 2. 코드 업데이트
git pull origin main

# 3. 환경 변수 확인 (.env.example과 비교)
diff .env.production .env.example

# 4. 이미지 업데이트
docker-compose pull

# 5. 서비스 재시작
docker-compose down
docker-compose up -d

# 6. 검증
docker-compose ps
docker-compose logs -f
```

### 설정 변경

```bash
# 1. 백업
./scripts/backup.sh

# 2. 설정 수정
nano .env.production
# 또는
nano nginx/conf.d/frontend.conf

# 3. 영향받는 서비스 재시작
docker-compose restart [service-name]
# Nginx 설정 변경 시:
docker-compose restart nginx
```

---

## 모니터링

### Grafana 대시보드

**접속**: https://grafana.yourdomain.com

**기본 계정**:

- Username: admin
- Password: (GRAFANA_ADMIN_PASSWORD)

**주요 대시보드**:

1. **시스템 개요**: 전체 서비스 상태
2. **n8n 워크플로우**: 실행 통계, 성공/실패율
3. **데이터베이스**: 성능, 연결 수, 쿼리 시간
4. **컨테이너**: CPU, 메모리, 네트워크 사용량

### Prometheus 쿼리

**접속**: http://localhost:9090

**유용한 쿼리**:

```promql
# n8n 워크플로우 실행 실패율
rate(n8n_workflow_failed_total[5m]) / rate(n8n_workflow_executions_total[5m])

# 평균 워크플로우 실행 시간
histogram_quantile(0.95, sum(rate(n8n_workflow_execution_duration_seconds_bucket[5m])) by (le))

# 데이터베이스 연결 수
pg_stat_activity_count

# Redis 메모리 사용률
redis_memory_used_bytes / redis_memory_max_bytes
```

### 로그 조회 (Loki/Grafana)

1. Grafana → Explore
2. Data source: Loki 선택
3. LogQL 쿼리 예시:

```logql
# n8n 에러 로그
{job="n8n"} |= "error"

# 특정 워크플로우 로그
{job="n8n"} |= "workflow-name"

# HTTP 5xx 에러
{job="nginx"} | json | status =~ "5.."
```

### 알림

**알림 채널 설정**:

1. Slack:

   ```bash
   # .env.production에 추가
   ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   ```

2. 이메일:
   ```bash
   # alertmanager.yml 수정
   # monitoring/alertmanager/alertmanager.yml
   ```

**알림 규칙**:

- `monitoring/prometheus/rules/alerts.yml` 참조
- Critical 알림: 즉시 전송
- Warning 알림: 5분 대기 후 전송

---

## 백업 및 복구

### 자동 백업 설정

```bash
# Cron 작업 추가
crontab -e

# 매일 오전 2시 백업
0 2 * * * cd /path/to/deployment/production && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

### 수동 백업

```bash
./scripts/backup.sh
```

**백업 위치**: `/backups/archives/gonsai2_backup_YYYYMMDD_HHMMSS.tar.gz`

### S3 백업 설정

```bash
# .env.production
BACKUP_S3_ENABLED=true
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=ap-northeast-2
BACKUP_S3_ACCESS_KEY=your-access-key
BACKUP_S3_SECRET_KEY=your-secret-key
```

### 복구

```bash
# 1. 백업 파일 확인
ls -lh /backups/archives/

# 2. 복구 실행
./scripts/restore.sh /backups/archives/gonsai2_backup_YYYYMMDD_HHMMSS.tar.gz

# 3. 서비스 시작
./scripts/start.sh
```

자세한 내용은 [재해 복구 계획](DISASTER_RECOVERY.md) 참조

---

## 트러블슈팅

### 서비스가 시작되지 않음

```bash
# 1. 로그 확인
docker-compose logs [service-name]

# 2. 컨테이너 상태 확인
docker-compose ps

# 3. 환경 변수 확인
docker-compose config

# 4. 포트 충돌 확인
sudo netstat -tlnp | grep :3000
```

### n8n 워크플로우 실행 실패

```bash
# 1. n8n 로그 확인
docker-compose logs n8n

# 2. Worker 로그 확인
docker-compose logs n8n-worker

# 3. Redis 큐 확인
docker exec redis redis-cli --scan --match "bull:*"

# 4. PostgreSQL 연결 확인
docker exec postgres psql -U n8n -d n8n -c "SELECT 1;"
```

### 데이터베이스 연결 오류

```bash
# PostgreSQL
docker exec postgres pg_isready -U n8n

# MongoDB
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# Redis
docker exec redis redis-cli ping
```

### 메모리 부족

```bash
# 1. 현재 사용량 확인
docker stats

# 2. 리소스 제한 조정
# docker-compose.yml에서 deploy.resources.limits 수정

# 3. 서비스 재시작
docker-compose restart [service-name]
```

### SSL 인증서 오류

```bash
# 1. 인증서 확인
openssl x509 -in nginx/ssl/cert.pem -text -noout

# 2. 인증서 갱신 (Let's Encrypt)
sudo certbot renew

# 3. Nginx 재시작
docker-compose restart nginx
```

### 디스크 공간 부족

```bash
# 1. 사용량 확인
df -h

# 2. Docker 정리
docker system prune -a

# 3. 오래된 백업 삭제
find /backups/archives -name "*.tar.gz" -mtime +30 -delete

# 4. 로그 정리
docker-compose logs --tail=0 [service-name]
```

---

## 참고 문서

- [재해 복구 계획](DISASTER_RECOVERY.md)
- [Docker Compose 설정](docker-compose.yml)
- [환경 변수 템플릿](.env.example)
- [n8n 공식 문서](https://docs.n8n.io/)
- [Next.js 공식 문서](https://nextjs.org/docs)

---

## 라이선스

MIT License

---

## 지원

문제가 발생하면 다음으로 연락하세요:

- 이슈 트래커: [GitHub Issues]
- 이메일: support@yourdomain.com
- Slack: #gonsai2-support
