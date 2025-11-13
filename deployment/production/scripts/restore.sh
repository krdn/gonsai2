#!/bin/bash
# =============================================================================
# 프로덕션 복원 스크립트
# =============================================================================
# 백업에서 gonsai2 시스템 복원
# =============================================================================

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 사용법
usage() {
    echo "사용법: $0 <backup-file>"
    echo ""
    echo "예시:"
    echo "  $0 /backups/archives/gonsai2_backup_20240101_120000.tar.gz"
    echo ""
    exit 1
}

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

# 인자 확인
if [ $# -eq 0 ]; then
    error "백업 파일을 지정해주세요"
    usage
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    error "백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
    exit 1
fi

log "복원 시작: $BACKUP_FILE"

# 확인 메시지
warning "⚠️  주의: 이 작업은 현재 데이터를 백업으로 덮어씁니다!"
echo -n "계속하시겠습니까? (yes/no): "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "복원 취소됨"
    exit 0
fi

# 임시 디렉토리
RESTORE_DIR="/tmp/restore_$(date +%s)"
mkdir -p "$RESTORE_DIR"

# =============================================================================
# 1. 백업 파일 추출
# =============================================================================
log "백업 파일 추출 중..."

if tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"; then
    log "백업 파일 추출 완료"
else
    error "백업 파일 추출 실패"
    exit 1
fi

# 백업 디렉토리 찾기
BACKUP_DIR=$(find "$RESTORE_DIR" -maxdepth 1 -type d -name "gonsai2_backup_*" | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
    error "백업 디렉토리를 찾을 수 없습니다"
    exit 1
fi

log "백업 디렉토리: $BACKUP_DIR"

# =============================================================================
# 2. 서비스 중지
# =============================================================================
log "서비스 중지 중..."

docker-compose down

log "모든 서비스가 중지되었습니다"

# =============================================================================
# 3. PostgreSQL 복원
# =============================================================================
log "PostgreSQL 복원 중..."

# PostgreSQL 서비스만 시작
docker-compose up -d postgres

# PostgreSQL 준비될 때까지 대기
log "PostgreSQL 시작 대기 중..."
sleep 10

# 환경 변수 로드
if [ -f .env.production ]; then
    source .env.production
fi

# 기존 데이터베이스 삭제 및 재생성
docker exec postgres psql -U "${POSTGRES_USER:-n8n}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB:-n8n};"
docker exec postgres psql -U "${POSTGRES_USER:-n8n}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB:-n8n};"

# 글로벌 객체 복원
GLOBALS_FILE=$(find "$BACKUP_DIR" -name "postgres_globals_*.sql" | head -n 1)
if [ -n "$GLOBALS_FILE" ]; then
    docker exec -i postgres psql -U "${POSTGRES_USER:-n8n}" -d postgres < "$GLOBALS_FILE"
    log "PostgreSQL 글로벌 객체 복원 완료"
fi

# 데이터베이스 덤프 복원
DB_DUMP=$(find "$BACKUP_DIR" -name "postgres_*.sql" ! -name "*globals*" | head -n 1)
if [ -n "$DB_DUMP" ]; then
    docker exec -i postgres psql -U "${POSTGRES_USER:-n8n}" -d "${POSTGRES_DB:-n8n}" < "$DB_DUMP"
    log "PostgreSQL 데이터 복원 완료"
else
    error "PostgreSQL 덤프 파일을 찾을 수 없습니다"
    exit 1
fi

docker-compose stop postgres

# =============================================================================
# 4. MongoDB 복원
# =============================================================================
log "MongoDB 복원 중..."

# MongoDB 서비스만 시작
docker-compose up -d mongodb

# MongoDB 준비될 때까지 대기
log "MongoDB 시작 대기 중..."
sleep 10

# MongoDB 복원 디렉토리 찾기
MONGO_BACKUP_DIR=$(find "$BACKUP_DIR" -type d -name "mongodb_backup" | head -n 1)

if [ -n "$MONGO_BACKUP_DIR" ]; then
    # 백업 파일을 MongoDB 컨테이너로 복사
    docker cp "$MONGO_BACKUP_DIR" mongodb:/tmp/

    # MongoDB 복원
    docker exec mongodb mongorestore \
        --username="${MONGO_ROOT_USER:-admin}" \
        --password="${MONGO_ROOT_PASSWORD}" \
        --authenticationDatabase=admin \
        --db="${MONGO_DATABASE:-gonsai2}" \
        --drop \
        /tmp/mongodb_backup/"${MONGO_DATABASE:-gonsai2}"

    # 임시 파일 정리
    docker exec mongodb rm -rf /tmp/mongodb_backup

    log "MongoDB 복원 완료"
else
    warning "MongoDB 백업을 찾을 수 없습니다. 건너뜀"
fi

docker-compose stop mongodb

# =============================================================================
# 5. n8n 데이터 복원
# =============================================================================
log "n8n 데이터 복원 중..."

# n8n 데이터 디렉토리 확인
N8N_DATA_DIR="$BACKUP_DIR/n8n-data"

if [ -d "$N8N_DATA_DIR" ]; then
    # 기존 데이터 백업 (안전을 위해)
    if [ -d "./data/n8n" ]; then
        mv ./data/n8n "./data/n8n.backup.$(date +%s)"
        log "기존 n8n 데이터를 백업했습니다"
    fi

    # 새 데이터 복사
    mkdir -p ./data/n8n
    cp -r "$N8N_DATA_DIR"/* ./data/n8n/

    log "n8n 데이터 복원 완료"
else
    error "n8n 데이터 백업을 찾을 수 없습니다"
    exit 1
fi

# n8n 파일 복원
N8N_FILES_DIR="$BACKUP_DIR/n8n-files"

if [ -d "$N8N_FILES_DIR" ]; then
    mkdir -p ./data/n8n-files
    cp -r "$N8N_FILES_DIR"/* ./data/n8n-files/
    log "n8n 파일 복원 완료"
fi

# =============================================================================
# 6. 설정 파일 복원 (선택사항)
# =============================================================================
log "설정 파일 복원 확인..."

echo -n "설정 파일도 복원하시겠습니까? (yes/no): "
read -r RESTORE_CONFIG

if [ "$RESTORE_CONFIG" = "yes" ]; then
    CONFIG_DIR="$BACKUP_DIR/config"

    if [ -d "$CONFIG_DIR" ]; then
        # .env 파일
        if [ -f "$CONFIG_DIR/.env.production" ]; then
            cp "$CONFIG_DIR/.env.production" .env.production
            log ".env.production 복원 완료"
        fi

        # Nginx 설정
        if [ -d "$CONFIG_DIR/nginx" ]; then
            cp -r "$CONFIG_DIR/nginx" ./
            log "Nginx 설정 복원 완료"
        fi

        # PostgreSQL 설정
        if [ -d "$CONFIG_DIR/postgres-config" ]; then
            cp -r "$CONFIG_DIR/postgres-config" ./
            log "PostgreSQL 설정 복원 완료"
        fi

        # 모니터링 설정
        if [ -d "$CONFIG_DIR/monitoring" ]; then
            cp -r "$CONFIG_DIR/monitoring" ./
            log "모니터링 설정 복원 완료"
        fi
    fi
fi

# =============================================================================
# 7. 권한 설정
# =============================================================================
log "권한 설정 중..."

# n8n 데이터 디렉토리 권한 (n8n은 UID 1000으로 실행)
chown -R 1000:1000 ./data/n8n 2>/dev/null || true
chown -R 1000:1000 ./data/n8n-files 2>/dev/null || true

log "권한 설정 완료"

# =============================================================================
# 8. 서비스 재시작
# =============================================================================
log "서비스 재시작 중..."

docker-compose up -d

log "서비스 시작 대기 중..."
sleep 20

# =============================================================================
# 9. Health Check
# =============================================================================
log "서비스 상태 확인 중..."

docker-compose ps

# n8n health check
if curl -f http://localhost:5678/healthz > /dev/null 2>&1; then
    log "✓ n8n: 정상"
else
    warning "✗ n8n: 응답 없음"
fi

# Frontend health check
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    log "✓ Frontend: 정상"
else
    warning "✗ Frontend: 응답 없음"
fi

# =============================================================================
# 10. 정리
# =============================================================================
log "임시 파일 정리 중..."
rm -rf "$RESTORE_DIR"

log "============================================"
log "복원 완료!"
log "============================================"
log ""
log "다음 단계:"
log "1. 모든 서비스가 정상적으로 시작되었는지 확인"
log "2. n8n UI에서 워크플로우가 제대로 복원되었는지 확인"
log "3. 애플리케이션 기능 테스트"
log ""

exit 0
