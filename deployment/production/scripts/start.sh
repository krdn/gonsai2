#!/bin/bash
# =============================================================================
# 프로덕션 환경 시작 스크립트
# =============================================================================

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# =============================================================================
# 1. 환경 확인
# =============================================================================
log "환경 확인 중..."

# Docker 확인
if ! command -v docker &> /dev/null; then
    error "Docker가 설치되지 않았습니다"
    exit 1
fi

# Docker Compose 확인
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose가 설치되지 않았습니다"
    exit 1
fi

# 환경 변수 파일 확인
if [ ! -f .env.production ]; then
    error ".env.production 파일이 없습니다"
    error "deployment/production/.env.example을 복사하고 값을 설정하세요"
    exit 1
fi

log "✓ Docker: $(docker --version)"
log "✓ Docker Compose: $(docker-compose --version)"
log "✓ 환경 변수 파일 존재"

# =============================================================================
# 2. 필수 디렉토리 확인
# =============================================================================
log "필수 디렉토리 확인 및 생성..."

REQUIRED_DIRS=(
    "data/n8n"
    "data/postgres"
    "data/mongodb"
    "data/redis"
    "data/n8n-files"
    "backups/archives"
    "backups/logs"
    "backups/metadata"
    "logs"
    "nginx/ssl"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log "✓ 디렉토리 생성: $dir"
    fi
done

# =============================================================================
# 3. SSL 인증서 확인
# =============================================================================
log "SSL 인증서 확인..."

if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    warning "SSL 인증서가 없습니다"
    warning "자체 서명 인증서를 생성하거나 Let's Encrypt를 사용하세요"

    echo -n "자체 서명 인증서를 생성하시겠습니까? (yes/no): "
    read -r CREATE_CERT

    if [ "$CREATE_CERT" = "yes" ]; then
        log "자체 서명 인증서 생성 중..."

        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=KR/ST=Seoul/L=Seoul/O=Organization/CN=localhost"

        # DH 파라미터 생성
        openssl dhparam -out nginx/ssl/dhparam.pem 2048

        log "✓ 자체 서명 인증서 생성 완료"
    fi
fi

# =============================================================================
# 4. 환경 변수 검증
# =============================================================================
log "환경 변수 검증 중..."

source .env.production

REQUIRED_VARS=(
    "N8N_ENCRYPTION_KEY"
    "N8N_JWT_SECRET"
    "POSTGRES_PASSWORD"
    "MONGO_ROOT_PASSWORD"
    "REDIS_PASSWORD"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    error "다음 필수 환경 변수가 설정되지 않았습니다:"
    for var in "${MISSING_VARS[@]}"; do
        error "  - $var"
    done
    exit 1
fi

log "✓ 모든 필수 환경 변수 설정됨"

# =============================================================================
# 5. Docker 이미지 Pull
# =============================================================================
log "Docker 이미지 Pull 중..."

docker-compose pull

log "✓ Docker 이미지 Pull 완료"

# =============================================================================
# 6. 기존 컨테이너 정리 (선택사항)
# =============================================================================
if docker-compose ps | grep -q "Up"; then
    warning "실행 중인 컨테이너가 있습니다"
    echo -n "기존 컨테이너를 중지하고 다시 시작하시겠습니까? (yes/no): "
    read -r RESTART

    if [ "$RESTART" = "yes" ]; then
        log "기존 컨테이너 중지 중..."
        docker-compose down
    else
        log "기존 컨테이너 유지"
    fi
fi

# =============================================================================
# 7. 서비스 시작
# =============================================================================
log "============================================"
log "서비스 시작 중..."
log "============================================"

# 단계별 시작 (의존성 순서)

# 1단계: 데이터베이스
log "1/4 데이터베이스 서비스 시작..."
docker-compose up -d postgres mongodb redis

log "데이터베이스 준비 대기 중 (30초)..."
sleep 30

# 2단계: n8n 및 워커
log "2/4 n8n 서비스 시작..."
docker-compose up -d n8n n8n-worker

log "n8n 준비 대기 중 (20초)..."
sleep 20

# 3단계: 프론트엔드
log "3/4 프론트엔드 서비스 시작..."
docker-compose up -d gonsai2-app

log "프론트엔드 준비 대기 중 (15초)..."
sleep 15

# 4단계: 나머지 서비스 (Nginx, 모니터링)
log "4/4 프록시 및 모니터링 서비스 시작..."
docker-compose up -d

log "모든 서비스 시작 대기 중 (10초)..."
sleep 10

# =============================================================================
# 8. Health Check
# =============================================================================
log "============================================"
log "서비스 상태 확인 중..."
log "============================================"

# 컨테이너 상태
docker-compose ps

echo ""
log "Health Check 결과:"

# PostgreSQL
if docker exec postgres pg_isready -U "${POSTGRES_USER:-n8n}" > /dev/null 2>&1; then
    log "✓ PostgreSQL: 정상"
else
    error "✗ PostgreSQL: 응답 없음"
fi

# MongoDB
if docker exec mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log "✓ MongoDB: 정상"
else
    error "✗ MongoDB: 응답 없음"
fi

# Redis
if docker exec redis redis-cli ping > /dev/null 2>&1; then
    log "✓ Redis: 정상"
else
    error "✗ Redis: 응답 없음"
fi

# n8n
sleep 5  # 추가 대기
if curl -f http://localhost:5678/healthz > /dev/null 2>&1; then
    log "✓ n8n: 정상"
else
    warning "✗ n8n: 응답 없음 (시작 중일 수 있음)"
fi

# Frontend
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✓ Frontend: 정상"
else
    warning "✗ Frontend: 응답 없음 (빌드 중일 수 있음)"
fi

# Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    log "✓ Prometheus: 정상"
else
    warning "✗ Prometheus: 응답 없음"
fi

# Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    log "✓ Grafana: 정상"
else
    warning "✗ Grafana: 응답 없음"
fi

# =============================================================================
# 9. 접속 정보 출력
# =============================================================================
echo ""
log "============================================"
log "시작 완료!"
log "============================================"
echo ""
info "접속 URL:"
info "  - Frontend:   https://${N8N_HOST:-localhost}:443"
info "  - n8n UI:     https://n8n.${N8N_HOST:-localhost}:443"
info "  - Grafana:    https://grafana.${N8N_HOST:-localhost}:443"
echo ""
info "로컬 접속 (개발용):"
info "  - Frontend:   http://localhost:3000"
info "  - n8n:        http://localhost:5678"
info "  - Grafana:    http://localhost:3001"
info "  - Prometheus: http://localhost:9090"
echo ""
info "로그 확인:"
info "  docker-compose logs -f [service-name]"
echo ""
info "서비스 재시작:"
info "  docker-compose restart [service-name]"
echo ""
info "전체 중지:"
info "  ./scripts/stop.sh"
echo ""

exit 0
