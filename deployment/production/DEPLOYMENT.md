# gonsai2 최종 배포 가이드

프로덕션 환경 배포를 위한 완전한 가이드

---

## 목차

1. [배포 전 체크리스트](#배포-전-체크리스트)
2. [시스템 요구사항](#시스템-요구사항)
3. [단계별 배포 절차](#단계별-배포-절차)
4. [배포 후 검증](#배포-후-검증)
5. [롤백 계획](#롤백-계획)
6. [운영 가이드](#운영-가이드)
7. [트러블슈팅](#트러블슈팅)

---

## 배포 전 체크리스트

### 📋 필수 준비사항

#### 인프라 준비

- [ ] **서버 준비 완료**
  - [ ] OS: Ubuntu 22.04 LTS 설치
  - [ ] CPU: 최소 4 cores (권장 8 cores)
  - [ ] RAM: 최소 8GB (권장 16GB)
  - [ ] Disk: 최소 100GB SSD (권장 500GB NVMe)
  - [ ] Network: 안정적인 인터넷 연결

- [ ] **도메인 및 DNS 설정**
  - [ ] 메인 도메인 등록: `yourdomain.com`
  - [ ] 서브도메인 DNS A 레코드:
    - [ ] `n8n.yourdomain.com` → 서버 IP
    - [ ] `grafana.yourdomain.com` → 서버 IP
  - [ ] DNS 전파 확인 (`nslookup`, `dig`)

- [ ] **방화벽 설정**
  - [ ] 클라우드 보안 그룹 / 방화벽 규칙:
    - [ ] 22/tcp (SSH - 관리 IP만)
    - [ ] 80/tcp (HTTP - 전체 허용)
    - [ ] 443/tcp (HTTPS - 전체 허용)
  - [ ] 내부 포트는 localhost 바인딩 (외부 노출 금지)

#### 소프트웨어 준비

- [ ] **Docker 설치**
  - [ ] Docker Engine 24.0+
  - [ ] Docker Compose 2.20+
  - [ ] `docker --version` 확인
  - [ ] `docker-compose --version` 확인

- [ ] **Git 설치**
  - [ ] Git 2.30+
  - [ ] GitHub/GitLab 접근 권한

- [ ] **필수 유틸리티**
  - [ ] `curl`, `wget`
  - [ ] `openssl`
  - [ ] `bc` (계산기)
  - [ ] `apache2-utils` (선택사항 - 성능 테스트용)

#### 보안 준비

- [ ] **SSL/TLS 인증서**
  - [ ] Let's Encrypt 설정 준비
  - [ ] 또는 상용 인증서 준비
  - [ ] DH 파라미터 생성 계획

- [ ] **비밀번호 생성**
  - [ ] N8N_ENCRYPTION_KEY (32자 이상)
  - [ ] N8N_JWT_SECRET (32자 이상)
  - [ ] POSTGRES_PASSWORD (16자 이상)
  - [ ] MONGO_ROOT_PASSWORD (16자 이상)
  - [ ] REDIS_PASSWORD (16자 이상)
  - [ ] JWT_SECRET (32자 이상)
  - [ ] ENCRYPTION_KEY (32자 이상)
  - [ ] GRAFANA_ADMIN_PASSWORD (16자 이상)

#### 백업 준비

- [ ] **백업 저장소**
  - [ ] 로컬 백업 디렉토리 (`/backups`)
  - [ ] S3 버킷 생성 (선택사항)
  - [ ] S3 액세스 키 발급 (선택사항)

- [ ] **Cron 작업 계획**
  - [ ] 백업 스케줄 결정 (예: 매일 02:00)
  - [ ] 로그 로테이션 설정

#### 문서 및 팀

- [ ] **문서 검토**
  - [ ] README.md 읽기
  - [ ] SECURITY_AUDIT.md 검토
  - [ ] DISASTER_RECOVERY.md 이해

- [ ] **팀 준비**
  - [ ] 배포 담당자 지정
  - [ ] 긴급 연락망 구성
  - [ ] 배포 시간 공지 (예: 주말 새벽)

---

## 시스템 요구사항

### 최소 사양

| 구성 요소 | 최소      | 권장           |
| --------- | --------- | -------------- |
| CPU       | 4 cores   | 8 cores        |
| RAM       | 8GB       | 16GB           |
| Disk      | 100GB SSD | 500GB NVMe SSD |
| Network   | 100Mbps   | 1Gbps          |

### 리소스 할당

```yaml
# docker-compose.yml에 정의된 리소스 제한
총 CPU 할당: ~12 cores
총 메모리 할당: ~16GB

주요 서비스:
  - gonsai2-app: 2 CPU, 2GB RAM
  - n8n: 2 CPU, 4GB RAM
  - n8n-worker (x2): 1.5 CPU, 3GB RAM (per replica)
  - postgres: 2 CPU, 2GB RAM
  - mongodb: 2 CPU, 2GB RAM
  - redis: 1 CPU, 2GB RAM
```

---

## 단계별 배포 절차

### Phase 1: 시스템 준비 (30분)

#### 1.1 서버 접속 및 업데이트

```bash
# SSH 접속
ssh user@your-server-ip

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 필수 패키지 설치
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    bc \
    apache2-utils
```

#### 1.2 Docker 설치

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

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인
exit
ssh user@your-server-ip

# Docker 확인
docker --version
docker-compose --version
```

#### 1.3 방화벽 설정

```bash
# UFW 설치 (Ubuntu에 기본 포함)
sudo apt install -y ufw

# 기본 정책
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 필요한 포트 허용
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# UFW 활성화
sudo ufw enable

# 상태 확인
sudo ufw status verbose
```

### Phase 2: 프로젝트 설정 (30분)

#### 2.1 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# Git 클론
git clone <repository-url>
cd gonsai2/deployment/production
```

#### 2.2 환경 변수 설정

```bash
# .env 템플릿 복사
cp .env.example .env.production

# 환경 변수 편집
nano .env.production
```

**필수 설정 항목** (반드시 변경):

```bash
# Application
APP_URL=https://yourdomain.com

# n8n
N8N_HOST=yourdomain.com
N8N_WEBHOOK_URL=https://yourdomain.com/webhook
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
N8N_JWT_SECRET=$(openssl rand -hex 32)
N8N_API_KEY=$(openssl rand -hex 32)

# PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# MongoDB
MONGO_ROOT_PASSWORD=$(openssl rand -base64 32)

# Redis
REDIS_PASSWORD=$(openssl rand -base64 32)

# Security
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Monitoring
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
```

**⚠️ 중요**:

- N8N_ENCRYPTION_KEY는 한번 설정하면 절대 변경하지 마세요!
- 모든 비밀번호를 안전한 곳에 백업하세요 (KeePass, 1Password 등)

#### 2.3 Nginx 도메인 설정

```bash
# 도메인 일괄 변경
sed -i 's/yourdomain.com/actual-domain.com/g' nginx/conf.d/*.conf
sed -i 's/yourdomain.com/actual-domain.com/g' nginx/nginx.conf
```

### Phase 3: SSL 인증서 설정 (20분)

#### 옵션 A: Let's Encrypt (권장)

```bash
# Certbot 설치
sudo apt install -y certbot

# 인증서 발급 (standalone 모드 - Nginx가 아직 실행 중이지 않을 때)
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d n8n.yourdomain.com \
  -d grafana.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# 인증서를 프로젝트 디렉토리로 복사
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/chain.pem nginx/ssl/chain.pem

# 각 서브도메인용 인증서도 복사 (있는 경우)
sudo cp /etc/letsencrypt/live/n8n.yourdomain.com/fullchain.pem nginx/ssl/n8n-cert.pem
sudo cp /etc/letsencrypt/live/n8n.yourdomain.com/privkey.pem nginx/ssl/n8n-key.pem
sudo cp /etc/letsencrypt/live/n8n.yourdomain.com/chain.pem nginx/ssl/n8n-chain.pem

sudo cp /etc/letsencrypt/live/grafana.yourdomain.com/fullchain.pem nginx/ssl/grafana-cert.pem
sudo cp /etc/letsencrypt/live/grafana.yourdomain.com/privkey.pem nginx/ssl/grafana-key.pem
sudo cp /etc/letsencrypt/live/grafana.yourdomain.com/chain.pem nginx/ssl/grafana-chain.pem

# 소유권 변경
sudo chown -R $USER:$USER nginx/ssl/

# DH 파라미터 생성 (보안 강화)
openssl dhparam -out nginx/ssl/dhparam.pem 2048
```

#### 옵션 B: 자체 서명 인증서 (테스트용)

```bash
# start.sh 실행 시 자동 생성 옵션 선택
# 또는 수동 생성:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=KR/ST=Seoul/L=Seoul/O=Organization/CN=yourdomain.com"

openssl dhparam -out nginx/ssl/dhparam.pem 2048
```

### Phase 4: 배포 실행 (20분)

#### 4.1 사전 검증

```bash
# 환경 변수 파일 존재 확인
ls -la .env.production

# SSL 인증서 확인
ls -la nginx/ssl/

# 스크립트 실행 권한 확인
chmod +x scripts/*.sh
```

#### 4.2 배포 시작

```bash
# 배포 스크립트 실행
./scripts/start.sh
```

스크립트는 다음을 자동으로 수행합니다:

1. ✅ 환경 검증 (Docker, Docker Compose, .env)
2. ✅ 필수 디렉토리 생성
3. ✅ SSL 인증서 확인
4. ✅ 환경 변수 검증
5. ✅ Docker 이미지 Pull
6. ✅ 서비스 단계별 시작 (DB → n8n → Frontend → Monitoring)
7. ✅ Health Check

**예상 소요 시간**: 15-20분 (첫 실행 시 이미지 다운로드 포함)

#### 4.3 배포 로그 모니터링

```bash
# 별도 터미널에서 로그 확인
docker-compose logs -f

# 또는 특정 서비스만
docker-compose logs -f gonsai2-app n8n
```

---

## 배포 후 검증

### 자동 검증 스크립트 실행

```bash
# Health Check
./scripts/health-check.sh

# 성능 검증
./scripts/performance-test.sh
```

### 수동 검증

#### 1. 컨테이너 상태 확인

```bash
docker-compose ps

# 모든 서비스가 "Up (healthy)" 상태여야 함
```

**예상 출력**:

```
NAME                  STATUS
gonsai2-app          Up (healthy)
n8n                  Up (healthy)
n8n-worker           Up (healthy)
postgres             Up (healthy)
mongodb              Up (healthy)
redis                Up (healthy)
nginx                Up (healthy)
prometheus           Up
grafana              Up
loki                 Up
promtail             Up
alertmanager         Up
```

#### 2. Health Endpoint 확인

```bash
# n8n
curl -f http://localhost:5678/healthz
# 응답: {"status":"ok"}

# Frontend
curl -f http://localhost:3000/api/health
# 응답: {"status":"healthy"}

# Prometheus
curl -f http://localhost:9090/-/healthy
# 응답: Prometheus is Healthy.

# Grafana
curl -f http://localhost:3001/api/health
# 응답: {"commit":"...","database":"ok","version":"..."}
```

#### 3. 웹 UI 접속 확인

| 서비스   | URL                            | 기본 로그인                      |
| -------- | ------------------------------ | -------------------------------- |
| Frontend | https://yourdomain.com         | (설정한 사용자 계정)             |
| n8n      | https://n8n.yourdomain.com     | (n8n 초기 설정 필요)             |
| Grafana  | https://grafana.yourdomain.com | admin / (GRAFANA_ADMIN_PASSWORD) |

#### 4. 데이터베이스 연결 확인

```bash
# PostgreSQL
docker exec postgres psql -U n8n -d n8n -c "SELECT version();"

# MongoDB
docker exec mongodb mongosh --eval "db.version()"

# Redis
docker exec redis redis-cli ping
# 응답: PONG
```

#### 5. 로그 에러 확인

```bash
# 최근 로그에서 에러 검색
docker-compose logs --tail=100 | grep -i error

# 에러가 없거나 무시 가능한 것만 있어야 함
```

#### 6. 리소스 사용량 확인

```bash
# 컨테이너별 리소스 사용량
docker stats --no-stream

# 시스템 리소스
free -h
df -h
top -n 1
```

### 배포 성공 기준

- [ ] ✅ 모든 컨테이너 "healthy" 상태
- [ ] ✅ Health endpoints 모두 200 OK
- [ ] ✅ 웹 UI 모두 접속 가능
- [ ] ✅ 데이터베이스 모두 연결 가능
- [ ] ✅ 로그에 critical 에러 없음
- [ ] ✅ CPU < 70%, Memory < 70%, Disk < 70%
- [ ] ✅ API 응답 시간 < 200ms
- [ ] ✅ SSL 인증서 유효

---

## 롤백 계획

### 롤백 시나리오

#### 시나리오 1: 서비스 시작 실패

```bash
# 1. 즉시 중지
./scripts/stop.sh

# 2. 로그 확인
docker-compose logs

# 3. 문제 수정 (.env, 설정 파일 등)
# 4. 재시작
./scripts/start.sh
```

#### 시나리오 2: 데이터 문제 발생

```bash
# 1. 서비스 중지
./scripts/stop.sh

# 2. 최신 백업 확인
ls -lh /backups/archives/

# 3. 복원
./scripts/restore.sh /backups/archives/gonsai2_backup_YYYYMMDD_HHMMSS.tar.gz

# 4. 재시작
./scripts/start.sh
```

#### 시나리오 3: 완전 롤백 (이전 버전으로)

```bash
# 1. 현재 상태 백업
./scripts/backup.sh

# 2. 서비스 중지
docker-compose down

# 3. 이전 버전 체크아웃
git log --oneline -n 10
git checkout <previous-commit-hash>

# 4. 재배포
./scripts/start.sh
```

### 롤백 결정 기준

**즉시 롤백**:

- Critical 서비스 3개 이상 실패
- 데이터 손상 감지
- 보안 침해 의심

**재시도 후 롤백**:

- 1-2개 서비스 실패
- 성능 저하 (응답 시간 >500ms)
- 높은 에러율 (>5%)

**모니터링 후 결정**:

- 경미한 경고
- 성능 저하 (<30%)
- 낮은 에러율 (<1%)

---

## 운영 가이드

### 일일 점검 (5분)

```bash
# Health Check 실행
./scripts/health-check.sh

# 리소스 사용량 확인
docker stats --no-stream

# 최근 에러 로그 확인
docker-compose logs --since=24h | grep -i error
```

### 주간 점검 (30분)

```bash
# 1. 백업 확인
ls -lh /backups/archives/
# 최근 7일 백업 존재 확인

# 2. 성능 테스트
./scripts/performance-test.sh

# 3. 보안 업데이트 확인
sudo apt update
sudo apt list --upgradable

# 4. Grafana 대시보드 검토
# https://grafana.yourdomain.com

# 5. 로그 리뷰
# 비정상적인 패턴 확인
```

### 월간 점검 (2시간)

```bash
# 1. 전체 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Docker 이미지 업데이트
cd ~/gonsai2/deployment/production
docker-compose pull

# 3. 백업 복원 테스트
# 테스트 환경에서 최신 백업 복원 확인

# 4. SSL 인증서 갱신
sudo certbot renew

# 5. 보안 감사
# SECURITY_AUDIT.md 체크리스트 재검토

# 6. 용량 정리
docker system prune -a
find /backups/archives -name "*.tar.gz" -mtime +30 -delete

# 7. 재해 복구 테스트
# DISASTER_RECOVERY.md 시나리오 1개 실행
```

### 백업 관리

```bash
# 수동 백업
./scripts/backup.sh

# 백업 목록
ls -lh /backups/archives/

# 백업 메타데이터 확인
cat /backups/metadata/gonsai2_backup_*.json | jq

# 오래된 백업 삭제 (30일 이상)
find /backups/archives -name "gonsai2_backup_*.tar.gz" -mtime +30 -delete
```

### 모니터링

```bash
# Grafana 대시보드
https://grafana.yourdomain.com

# Prometheus 쿼리
http://localhost:9090

# 컨테이너 로그
docker-compose logs -f [service-name]

# 시스템 로그
journalctl -u docker -f
```

---

## 트러블슈팅

### 문제: 컨테이너가 시작되지 않음

**증상**: `docker-compose ps`에서 "Exited" 또는 "Restarting" 상태

**해결**:

```bash
# 1. 로그 확인
docker-compose logs [service-name]

# 2. 환경 변수 확인
docker-compose config

# 3. 개별 서비스 재시작
docker-compose restart [service-name]

# 4. 완전 재시작
docker-compose down
docker-compose up -d
```

### 문제: 웹 UI 접속 불가

**증상**: ERR_CONNECTION_REFUSED 또는 504 Gateway Timeout

**해결**:

```bash
# 1. Nginx 상태 확인
docker-compose logs nginx

# 2. Nginx 설정 테스트
docker exec nginx nginx -t

# 3. 포트 확인
sudo netstat -tlnp | grep :443

# 4. 방화벽 확인
sudo ufw status

# 5. Nginx 재시작
docker-compose restart nginx
```

### 문제: 데이터베이스 연결 오류

**증상**: "Connection refused" 또는 "Authentication failed"

**PostgreSQL**:

```bash
# 연결 확인
docker exec postgres pg_isready -U n8n

# 비밀번호 재설정 (필요 시)
docker exec -it postgres psql -U postgres
ALTER USER n8n PASSWORD 'new_password';

# 재시작
docker-compose restart postgres
```

**MongoDB**:

```bash
# 연결 확인
docker exec mongodb mongosh --eval "db.adminCommand('ping')"

# 로그 확인
docker-compose logs mongodb

# 재시작
docker-compose restart mongodb
```

### 문제: 높은 메모리 사용량

**증상**: OOM Killer, 컨테이너 재시작

**해결**:

```bash
# 1. 메모리 사용량 확인
docker stats

# 2. 메모리 많이 사용하는 컨테이너 식별

# 3. 리소스 제한 조정 (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 4G  # 증가

# 4. 재배포
docker-compose down
docker-compose up -d
```

### 문제: SSL 인증서 만료

**증상**: NET::ERR_CERT_DATE_INVALID

**해결**:

```bash
# 1. 인증서 확인
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"

# 2. Let's Encrypt 갱신
sudo certbot renew

# 3. 인증서 복사
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# 4. Nginx 재시작
docker-compose restart nginx
```

### 긴급 연락처

- **시스템 관리자**: [이름] - [전화번호]
- **데이터베이스 관리자**: [이름] - [전화번호]
- **보안 담당자**: [이름] - [전화번호]

---

## 부록

### A. 환경 변수 전체 목록

[.env.example](. env.example) 파일 참조

### B. 포트 목록

| 서비스       | 내부 포트 | 외부 포트 | 프로토콜   |
| ------------ | --------- | --------- | ---------- |
| gonsai2-app  | 3000      | -         | HTTP       |
| n8n          | 5678      | -         | HTTP       |
| postgres     | 5432      | -         | PostgreSQL |
| mongodb      | 27017     | -         | MongoDB    |
| redis        | 6379      | -         | Redis      |
| nginx        | -         | 80, 443   | HTTP/HTTPS |
| prometheus   | 9090      | -         | HTTP       |
| grafana      | 3001      | -         | HTTP       |
| loki         | 3100      | -         | HTTP       |
| alertmanager | 9093      | -         | HTTP       |

### C. 유용한 명령어

```bash
# 모든 컨테이너 재시작
docker-compose restart

# 특정 컨테이너 재시작
docker-compose restart [service-name]

# 로그 확인 (실시간)
docker-compose logs -f [service-name]

# 리소스 사용량
docker stats

# 컨테이너 내부 접속
docker exec -it [container-name] /bin/sh

# 환경 변수 확인
docker-compose config
```

---

**문서 버전**: 1.0
**최종 업데이트**: 2024년 11월
**작성자**: gonsai2 팀
**다음 리뷰**: 배포 후 1주일
