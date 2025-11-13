#!/bin/bash
# =============================================================================
# 프로덕션 Health Check 스크립트
# =============================================================================
# 모든 서비스의 상태를 확인하고 보고합니다
# =============================================================================

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 카운터
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 로깅 함수
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# HTTP 응답 시간 측정
check_http_response_time() {
    local url=$1
    local name=$2
    local threshold=${3:-200}  # 기본 200ms

    local response_time=$(curl -o /dev/null -s -w '%{time_total}' "$url" 2>/dev/null || echo "0")
    local response_ms=$(echo "$response_time * 1000" | bc)
    local response_ms_int=${response_ms%.*}

    if [ "$response_ms_int" -lt "$threshold" ]; then
        pass "$name: ${response_ms_int}ms (< ${threshold}ms)"
    elif [ "$response_ms_int" -lt $((threshold * 2)) ]; then
        warn "$name: ${response_ms_int}ms (threshold: ${threshold}ms)"
    else
        fail "$name: ${response_ms_int}ms (> ${threshold}ms)"
    fi
}

# 시작
section "🏥 gonsai2 프로덕션 Health Check"
info "시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# =============================================================================
# 1. Docker 상태 확인
# =============================================================================
section "1️⃣  Docker 상태 확인"

if systemctl is-active --quiet docker; then
    pass "Docker 서비스: 실행 중"
else
    fail "Docker 서비스: 중지됨"
fi

if docker info > /dev/null 2>&1; then
    pass "Docker 데몬: 정상"
else
    fail "Docker 데몬: 응답 없음"
fi

# =============================================================================
# 2. 컨테이너 상태 확인
# =============================================================================
section "2️⃣  컨테이너 상태 확인"

CONTAINERS=(
    "gonsai2-app"
    "n8n"
    "n8n-worker"
    "postgres"
    "mongodb"
    "redis"
    "nginx"
    "prometheus"
    "grafana"
    "loki"
    "promtail"
    "alertmanager"
)

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        # 컨테이너 상태 확인
        status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")

        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ "$health" = "none" ]; then
                pass "컨테이너 $container: 실행 중 ($health)"
            else
                warn "컨테이너 $container: 실행 중이나 unhealthy ($health)"
            fi
        else
            fail "컨테이너 $container: 중지됨 ($status)"
        fi
    else
        fail "컨테이너 $container: 찾을 수 없음"
    fi
done

# =============================================================================
# 3. 데이터베이스 Health Check
# =============================================================================
section "3️⃣  데이터베이스 Health Check"

# PostgreSQL
if docker exec postgres pg_isready -U n8n > /dev/null 2>&1; then
    pass "PostgreSQL: 연결 가능"

    # 연결 수 확인
    conn_count=$(docker exec postgres psql -U n8n -d n8n -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    max_conn=$(docker exec postgres psql -U n8n -d n8n -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')

    if [ -n "$conn_count" ] && [ -n "$max_conn" ]; then
        conn_pct=$((conn_count * 100 / max_conn))
        if [ $conn_pct -lt 80 ]; then
            pass "PostgreSQL 연결: $conn_count/$max_conn (${conn_pct}%)"
        else
            warn "PostgreSQL 연결: $conn_count/$max_conn (${conn_pct}%) - 높음"
        fi
    fi
else
    fail "PostgreSQL: 연결 실패"
fi

# MongoDB
if docker exec mongodb mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    pass "MongoDB: 연결 가능"

    # 연결 수 확인
    mongo_conn=$(docker exec mongodb mongosh --quiet --eval "db.serverStatus().connections.current" 2>/dev/null || echo "0")
    if [ "$mongo_conn" -lt 100 ]; then
        pass "MongoDB 연결: $mongo_conn"
    else
        warn "MongoDB 연결: $mongo_conn - 많음"
    fi
else
    fail "MongoDB: 연결 실패"
fi

# Redis
if docker exec redis redis-cli ping > /dev/null 2>&1; then
    pass "Redis: 연결 가능"

    # 메모리 사용률 확인
    redis_used=$(docker exec redis redis-cli info memory | grep "used_memory:" | cut -d: -f2 | tr -d '\r')
    redis_max=$(docker exec redis redis-cli info memory | grep "maxmemory:" | cut -d: -f2 | tr -d '\r')

    if [ "$redis_max" != "0" ] && [ -n "$redis_used" ]; then
        redis_pct=$((redis_used * 100 / redis_max))
        if [ $redis_pct -lt 80 ]; then
            pass "Redis 메모리: ${redis_pct}%"
        else
            warn "Redis 메모리: ${redis_pct}% - 높음"
        fi
    fi
else
    fail "Redis: 연결 실패"
fi

# =============================================================================
# 4. 애플리케이션 Health Check
# =============================================================================
section "4️⃣  애플리케이션 Health Check"

# n8n
if curl -f http://localhost:5678/healthz > /dev/null 2>&1; then
    pass "n8n: Health check 통과"
    check_http_response_time "http://localhost:5678/healthz" "n8n 응답 시간" 200
else
    fail "n8n: Health check 실패"
fi

# Frontend
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    pass "Frontend: Health check 통과"
    check_http_response_time "http://localhost:3000/api/health" "Frontend 응답 시간" 200
else
    fail "Frontend: Health check 실패"
fi

# Prometheus
if curl -f http://localhost:9090/-/healthy > /dev/null 2>&1; then
    pass "Prometheus: Health check 통과"
else
    warn "Prometheus: Health check 실패"
fi

# Grafana
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    pass "Grafana: Health check 통과"
else
    warn "Grafana: Health check 실패"
fi

# =============================================================================
# 5. 리소스 사용률 확인
# =============================================================================
section "5️⃣  리소스 사용률 확인"

# CPU 사용률
cpu_usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
cpu_usage_int=${cpu_usage%.*}

if [ "$cpu_usage_int" -lt 70 ]; then
    pass "CPU 사용률: ${cpu_usage_int}%"
elif [ "$cpu_usage_int" -lt 90 ]; then
    warn "CPU 사용률: ${cpu_usage_int}% - 높음"
else
    fail "CPU 사용률: ${cpu_usage_int}% - 매우 높음"
fi

# 메모리 사용률
mem_total=$(free -m | awk 'NR==2{print $2}')
mem_used=$(free -m | awk 'NR==2{print $3}')
mem_pct=$((mem_used * 100 / mem_total))

if [ $mem_pct -lt 70 ]; then
    pass "메모리 사용률: ${mem_pct}% (${mem_used}MB / ${mem_total}MB)"
elif [ $mem_pct -lt 90 ]; then
    warn "메모리 사용률: ${mem_pct}% (${mem_used}MB / ${mem_total}MB) - 높음"
else
    fail "메모리 사용률: ${mem_pct}% (${mem_used}MB / ${mem_total}MB) - 매우 높음"
fi

# 디스크 사용률
disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

if [ "$disk_usage" -lt 70 ]; then
    pass "디스크 사용률: ${disk_usage}%"
elif [ "$disk_usage" -lt 90 ]; then
    warn "디스크 사용률: ${disk_usage}% - 높음"
else
    fail "디스크 사용률: ${disk_usage}% - 매우 높음"
fi

# =============================================================================
# 6. 네트워크 연결 확인
# =============================================================================
section "6️⃣  네트워크 연결 확인"

# 포트 리스닝 확인
PORTS=(
    "80:HTTP"
    "443:HTTPS"
    "3000:Frontend"
    "5678:n8n"
)

for port_info in "${PORTS[@]}"; do
    port=${port_info%%:*}
    name=${port_info#*:}

    if ss -tlnp | grep -q ":${port} "; then
        pass "포트 $port ($name): 리스닝 중"
    else
        fail "포트 $port ($name): 리스닝 없음"
    fi
done

# =============================================================================
# 7. 백업 상태 확인
# =============================================================================
section "7️⃣  백업 상태 확인"

BACKUP_DIR="/backups/archives"

if [ -d "$BACKUP_DIR" ]; then
    backup_count=$(find "$BACKUP_DIR" -name "gonsai2_backup_*.tar.gz" -mtime -1 | wc -l)

    if [ "$backup_count" -gt 0 ]; then
        pass "최근 24시간 내 백업: ${backup_count}개"

        latest_backup=$(find "$BACKUP_DIR" -name "gonsai2_backup_*.tar.gz" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)
        backup_size=$(du -h "$latest_backup" | cut -f1)
        backup_age=$(find "$latest_backup" -mmin +$((24*60)) > /dev/null 2>&1 && echo "old" || echo "recent")

        if [ "$backup_age" = "recent" ]; then
            pass "최신 백업: $(basename "$latest_backup") ($backup_size)"
        else
            warn "최신 백업이 24시간 이상 오래됨"
        fi
    else
        warn "최근 24시간 내 백업 없음"
    fi
else
    fail "백업 디렉토리 없음: $BACKUP_DIR"
fi

# =============================================================================
# 8. 로그 에러 확인 (최근 10분)
# =============================================================================
section "8️⃣  최근 로그 에러 확인"

error_count=0

for container in "gonsai2-app" "n8n" "n8n-worker"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        errors=$(docker logs --since=10m "$container" 2>&1 | grep -i "error" | grep -v "0 errors" | wc -l)

        if [ "$errors" -eq 0 ]; then
            pass "$container: 에러 없음 (최근 10분)"
        elif [ "$errors" -lt 5 ]; then
            warn "$container: 에러 ${errors}개 (최근 10분)"
            error_count=$((error_count + errors))
        else
            fail "$container: 에러 ${errors}개 (최근 10분)"
            error_count=$((error_count + errors))
        fi
    fi
done

# =============================================================================
# 결과 요약
# =============================================================================
section "📊 Health Check 결과 요약"

echo ""
info "총 검사 항목: $TOTAL_CHECKS"
echo -e "${GREEN}✓ 통과: $PASSED_CHECKS${NC}"
echo -e "${YELLOW}⚠ 경고: $WARNING_CHECKS${NC}"
echo -e "${RED}✗ 실패: $FAILED_CHECKS${NC}"
echo ""

# 전체 상태 판정
if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ 시스템 상태: 정상 (Healthy)${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠ 시스템 상태: 경고 (Warning)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ 시스템 상태: 비정상 (Unhealthy)${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 2
fi
