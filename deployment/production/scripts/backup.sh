#!/bin/bash
# =============================================================================
# 프로덕션 백업 스크립트
# =============================================================================
# gonsai2 시스템의 완전한 백업 수행
# - n8n 워크플로우 및 자격증명
# - MongoDB 데이터베이스
# - PostgreSQL 데이터베이스
# - 실행 이력
# =============================================================================

set -e

# 설정
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gonsai2_backup_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/logs/backup_${TIMESTAMP}.log"

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 로깅 함수
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# 디렉토리 생성
mkdir -p "${BACKUP_DIR}/"{logs,n8n,mongodb,postgres,archives}
mkdir -p "${BACKUP_DIR}/temp/${BACKUP_NAME}"

# 백업 시작
log "백업 시작: ${BACKUP_NAME}"

# =============================================================================
# 1. n8n 백업
# =============================================================================
log "n8n 워크플로우 및 자격증명 백업..."

# n8n 데이터 디렉토리 백업 (workflows, credentials, settings)
if docker cp n8n:/home/node/.n8n "${BACKUP_DIR}/temp/${BACKUP_NAME}/n8n-data"; then
    log "n8n 데이터 백업 완료"
else
    error "n8n 데이터 백업 실패"
    exit 1
fi

# n8n 파일 백업 (워크플로우에서 사용하는 파일)
if docker cp n8n:/files "${BACKUP_DIR}/temp/${BACKUP_NAME}/n8n-files"; then
    log "n8n 파일 백업 완료"
else
    warning "n8n 파일 백업 실패 (파일이 없을 수 있음)"
fi

# =============================================================================
# 2. PostgreSQL 백업 (n8n 데이터베이스)
# =============================================================================
log "PostgreSQL 데이터베이스 백업..."

# 환경 변수 로드
if [ -f .env.production ]; then
    source .env.production
fi

POSTGRES_BACKUP_FILE="${BACKUP_DIR}/temp/${BACKUP_NAME}/postgres_${TIMESTAMP}.sql"

if docker exec postgres pg_dump -U "${POSTGRES_USER:-n8n}" -d "${POSTGRES_DB:-n8n}" > "$POSTGRES_BACKUP_FILE"; then
    log "PostgreSQL 백업 완료: $(du -h $POSTGRES_BACKUP_FILE | cut -f1)"
else
    error "PostgreSQL 백업 실패"
    exit 1
fi

# PostgreSQL 글로벌 객체 백업 (사용자, 역할 등)
POSTGRES_GLOBALS_FILE="${BACKUP_DIR}/temp/${BACKUP_NAME}/postgres_globals_${TIMESTAMP}.sql"
if docker exec postgres pg_dumpall -U "${POSTGRES_USER:-n8n}" --globals-only > "$POSTGRES_GLOBALS_FILE"; then
    log "PostgreSQL 글로벌 객체 백업 완료"
else
    warning "PostgreSQL 글로벌 객체 백업 실패"
fi

# =============================================================================
# 3. MongoDB 백업 (애플리케이션 데이터베이스)
# =============================================================================
log "MongoDB 데이터베이스 백업..."

MONGO_BACKUP_DIR="${BACKUP_DIR}/temp/${BACKUP_NAME}/mongodb"
mkdir -p "$MONGO_BACKUP_DIR"

if docker exec mongodb mongodump \
    --username="${MONGO_ROOT_USER:-admin}" \
    --password="${MONGO_ROOT_PASSWORD}" \
    --authenticationDatabase=admin \
    --db="${MONGO_DATABASE:-gonsai2}" \
    --out="/tmp/mongodb_backup"; then

    # MongoDB 컨테이너에서 백업 파일 복사
    docker cp mongodb:/tmp/mongodb_backup "$MONGO_BACKUP_DIR"
    docker exec mongodb rm -rf /tmp/mongodb_backup

    log "MongoDB 백업 완료: $(du -sh $MONGO_BACKUP_DIR | cut -f1)"
else
    error "MongoDB 백업 실패"
    exit 1
fi

# =============================================================================
# 4. 설정 파일 백업
# =============================================================================
log "설정 파일 백업..."

CONFIG_BACKUP_DIR="${BACKUP_DIR}/temp/${BACKUP_NAME}/config"
mkdir -p "$CONFIG_BACKUP_DIR"

# 환경 변수 파일 (민감 정보 포함)
if [ -f .env.production ]; then
    cp .env.production "$CONFIG_BACKUP_DIR/"
    log ".env.production 백업 완료"
fi

# Docker Compose 파일
cp docker-compose.yml "$CONFIG_BACKUP_DIR/"

# Nginx 설정
cp -r nginx "$CONFIG_BACKUP_DIR/"

# PostgreSQL 설정
cp -r postgres-config "$CONFIG_BACKUP_DIR/"

# 모니터링 설정
cp -r monitoring "$CONFIG_BACKUP_DIR/"

log "설정 파일 백업 완료"

# =============================================================================
# 5. 백업 압축
# =============================================================================
log "백업 압축 중..."

ARCHIVE_FILE="${BACKUP_DIR}/archives/${BACKUP_NAME}.tar.gz"

if tar -czf "$ARCHIVE_FILE" -C "${BACKUP_DIR}/temp" "${BACKUP_NAME}"; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
    log "백업 압축 완료: ${ARCHIVE_FILE} (${ARCHIVE_SIZE})"
else
    error "백업 압축 실패"
    exit 1
fi

# 임시 디렉토리 정리
rm -rf "${BACKUP_DIR}/temp/${BACKUP_NAME}"
log "임시 파일 정리 완료"

# =============================================================================
# 6. 백업 검증
# =============================================================================
log "백업 검증 중..."

if tar -tzf "$ARCHIVE_FILE" > /dev/null 2>&1; then
    log "백업 파일 무결성 검증 완료"
else
    error "백업 파일이 손상되었습니다"
    exit 1
fi

# =============================================================================
# 7. S3 업로드 (선택사항)
# =============================================================================
if [ "${BACKUP_S3_ENABLED:-false}" = "true" ]; then
    log "S3 업로드 시작..."

    if command -v aws &> /dev/null; then
        if aws s3 cp "$ARCHIVE_FILE" \
            "s3://${BACKUP_S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz" \
            --region "${BACKUP_S3_REGION:-ap-northeast-2}"; then
            log "S3 업로드 완료"
        else
            warning "S3 업로드 실패"
        fi
    else
        warning "AWS CLI가 설치되지 않음. S3 업로드 건너뜀"
    fi
fi

# =============================================================================
# 8. 오래된 백업 정리
# =============================================================================
log "오래된 백업 정리 중 (${BACKUP_RETENTION_DAYS}일 이상)..."

find "${BACKUP_DIR}/archives" -name "gonsai2_backup_*.tar.gz" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete
find "${BACKUP_DIR}/logs" -name "backup_*.log" -type f -mtime +${BACKUP_RETENTION_DAYS} -delete

REMAINING_BACKUPS=$(find "${BACKUP_DIR}/archives" -name "gonsai2_backup_*.tar.gz" -type f | wc -l)
log "현재 백업 파일 수: ${REMAINING_BACKUPS}"

# =============================================================================
# 9. 백업 메타데이터 저장
# =============================================================================
METADATA_FILE="${BACKUP_DIR}/metadata/${BACKUP_NAME}.json"
mkdir -p "${BACKUP_DIR}/metadata"

cat > "$METADATA_FILE" << EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "archive_file": "${ARCHIVE_FILE}",
  "archive_size": "${ARCHIVE_SIZE}",
  "components": {
    "n8n_data": true,
    "n8n_files": true,
    "postgres": true,
    "mongodb": true,
    "config": true
  },
  "databases": {
    "postgres": "${POSTGRES_DB:-n8n}",
    "mongodb": "${MONGO_DATABASE:-gonsai2}"
  },
  "retention_days": ${BACKUP_RETENTION_DAYS},
  "s3_uploaded": ${BACKUP_S3_ENABLED:-false}
}
EOF

log "백업 메타데이터 저장 완료"

# =============================================================================
# 10. 백업 완료
# =============================================================================
log "============================================"
log "백업 완료!"
log "파일: ${ARCHIVE_FILE}"
log "크기: ${ARCHIVE_SIZE}"
log "메타데이터: ${METADATA_FILE}"
log "============================================"

# Prometheus 메트릭 업데이트 (선택사항)
if [ -f /var/lib/node_exporter/textfile_collector/backup.prom ]; then
    cat > /var/lib/node_exporter/textfile_collector/backup.prom << EOF
# HELP backup_last_success_timestamp Timestamp of last successful backup
# TYPE backup_last_success_timestamp gauge
backup_last_success_timestamp $(date +%s)

# HELP backup_success Whether the last backup was successful
# TYPE backup_success gauge
backup_success 1

# HELP backup_size_bytes Size of the last backup in bytes
# TYPE backup_size_bytes gauge
backup_size_bytes $(stat -c%s "$ARCHIVE_FILE")
EOF
fi

exit 0
