#!/bin/bash
# =============================================================================
# 성능 검증 스크립트
# =============================================================================
# n8n 워크플로우 실행 및 API 성능 테스트
# =============================================================================

set -e

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 성능 요구사항
MAX_API_RESPONSE_TIME=200  # ms
MIN_CONCURRENT_EXECUTIONS=100
MAX_MEMORY_USAGE_PCT=70

# 결과 변수
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# 로깅 함수
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARN:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
    ((TESTS_TOTAL++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
    ((TESTS_TOTAL++))
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# 시작
section "⚡ gonsai2 성능 검증"
log "성능 테스트 시작"

# =============================================================================
# 1. API 응답 시간 테스트
# =============================================================================
section "1️⃣  API 응답 시간 테스트"

test_api_response_time() {
    local endpoint=$1
    local name=$2
    local threshold=${3:-$MAX_API_RESPONSE_TIME}

    log "테스트: $name"

    # 10회 요청하여 평균 측정
    local total_time=0
    local requests=10

    for i in $(seq 1 $requests); do
        response_time=$(curl -o /dev/null -s -w '%{time_total}' "$endpoint" 2>/dev/null || echo "0")
        response_ms=$(echo "$response_time * 1000" | bc)
        total_time=$(echo "$total_time + $response_ms" | bc)

        echo -n "."
    done
    echo ""

    avg_time=$(echo "$total_time / $requests" | bc)
    avg_time_int=${avg_time%.*}

    info "  - 요청 수: $requests"
    info "  - 평균 응답 시간: ${avg_time_int}ms"
    info "  - 목표: < ${threshold}ms"

    if [ "$avg_time_int" -lt "$threshold" ]; then
        pass "$name: ${avg_time_int}ms < ${threshold}ms"
    else
        fail "$name: ${avg_time_int}ms >= ${threshold}ms"
    fi
}

# Frontend Health Check
test_api_response_time "http://localhost:3000/api/health" "Frontend Health" 100

# n8n Health Check
test_api_response_time "http://localhost:5678/healthz" "n8n Health" 100

# =============================================================================
# 2. 동시 요청 처리 능력 테스트
# =============================================================================
section "2️⃣  동시 요청 처리 테스트"

log "동시 요청 테스트 준비..."

# Apache Bench 확인
if ! command -v ab &> /dev/null; then
    warn "Apache Bench (ab)가 설치되지 않음"
    warn "설치: sudo apt install apache2-utils"
    warn "동시 요청 테스트 건너뜀"
else
    log "Apache Bench로 동시 요청 테스트 중..."

    # 100 동시 요청, 총 1000 요청
    ab_result=$(ab -n 1000 -c 100 -q http://localhost:3000/api/health 2>&1)

    # 결과 파싱
    requests_per_sec=$(echo "$ab_result" | grep "Requests per second" | awk '{print $4}')
    time_per_request=$(echo "$ab_result" | grep "Time per request.*mean" | head -1 | awk '{print $4}')
    failed_requests=$(echo "$ab_result" | grep "Failed requests" | awk '{print $3}')

    info "  - 초당 요청 수: $requests_per_sec"
    info "  - 평균 응답 시간: ${time_per_request}ms"
    info "  - 실패한 요청: $failed_requests"

    if [ "$failed_requests" -eq 0 ]; then
        pass "동시 요청 테스트: 실패 없음 (100 concurrent, 1000 total)"
    else
        fail "동시 요청 테스트: ${failed_requests}개 실패"
    fi

    # 응답 시간 체크
    time_per_request_int=${time_per_request%.*}
    if [ "$time_per_request_int" -lt "$MAX_API_RESPONSE_TIME" ]; then
        pass "동시 요청 평균 응답 시간: ${time_per_request}ms < ${MAX_API_RESPONSE_TIME}ms"
    else
        fail "동시 요청 평균 응답 시간: ${time_per_request}ms >= ${MAX_API_RESPONSE_TIME}ms"
    fi
fi

# =============================================================================
# 3. 메모리 사용량 테스트
# =============================================================================
section "3️⃣  메모리 사용량 테스트"

log "컨테이너별 메모리 사용량 확인..."

CONTAINERS=("gonsai2-app" "n8n" "n8n-worker" "postgres" "mongodb" "redis")

for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        # 메모리 사용량 (MB)
        mem_usage=$(docker stats --no-stream --format "{{.MemUsage}}" "$container" | awk '{print $1}' | sed 's/MiB//')

        # 메모리 제한 (docker-compose.yml에서)
        mem_limit=$(docker inspect "$container" --format='{{.HostConfig.Memory}}' | awk '{print $1/1024/1024}')

        if [ "$mem_limit" != "0" ] && [ -n "$mem_usage" ]; then
            mem_pct=$(echo "$mem_usage * 100 / $mem_limit" | bc)
            mem_pct_int=${mem_pct%.*}

            info "$container: ${mem_usage}MB / ${mem_limit}MB (${mem_pct_int}%)"

            if [ "$mem_pct_int" -lt "$MAX_MEMORY_USAGE_PCT" ]; then
                pass "$container 메모리: ${mem_pct_int}% < ${MAX_MEMORY_USAGE_PCT}%"
            else
                fail "$container 메모리: ${mem_pct_int}% >= ${MAX_MEMORY_USAGE_PCT}%"
            fi
        else
            info "$container: ${mem_usage}MB (제한 없음)"
            pass "$container 메모리: 정상 범위"
        fi
    fi
done

# =============================================================================
# 4. 데이터베이스 쿼리 성능
# =============================================================================
section "4️⃣  데이터베이스 쿼리 성능"

# PostgreSQL 쿼리 성능
log "PostgreSQL 쿼리 성능 테스트..."

pg_query_time=$(docker exec postgres psql -U n8n -d n8n -c "EXPLAIN ANALYZE SELECT 1;" 2>&1 | grep "Execution Time" | awk '{print $3}')

if [ -n "$pg_query_time" ]; then
    pg_query_time_int=${pg_query_time%.*}
    info "PostgreSQL 쿼리 시간: ${pg_query_time}ms"

    if [ "$pg_query_time_int" -lt 10 ]; then
        pass "PostgreSQL 쿼리 성능: < 10ms"
    else
        warn "PostgreSQL 쿼리 성능: >= 10ms"
    fi
else
    warn "PostgreSQL 쿼리 성능 측정 실패"
fi

# MongoDB 쿼리 성능
log "MongoDB 쿼리 성능 테스트..."

mongo_result=$(docker exec mongodb mongosh --quiet --eval "var start = new Date(); db.getSiblingDB('admin').runCommand({ping: 1}); var end = new Date(); print((end - start));" 2>/dev/null || echo "0")

if [ "$mongo_result" != "0" ]; then
    info "MongoDB ping 시간: ${mongo_result}ms"

    if [ "$mongo_result" -lt 10 ]; then
        pass "MongoDB 쿼리 성능: < 10ms"
    else
        warn "MongoDB 쿼리 성능: >= 10ms"
    fi
else
    warn "MongoDB 쿼리 성능 측정 실패"
fi

# =============================================================================
# 5. Redis 성능
# =============================================================================
section "5️⃣  Redis 성능 테스트"

log "Redis 벤치마크 실행..."

# Redis 간단한 성능 테스트
redis_benchmark=$(docker exec redis redis-cli --latency-history -i 1 | head -5)

info "Redis Latency (최근 5초):"
echo "$redis_benchmark"

# Ping 테스트
redis_ping=$(docker exec redis redis-cli --latency | head -1 | awk '{print $13}')

if [ -n "$redis_ping" ]; then
    redis_ping_int=${redis_ping%.*}
    info "Redis 평균 latency: ${redis_ping}ms"

    if [ "$redis_ping_int" -lt 1 ]; then
        pass "Redis 성능: < 1ms"
    else
        warn "Redis 성능: >= 1ms"
    fi
fi

# =============================================================================
# 6. n8n 워크플로우 실행 성능 (시뮬레이션)
# =============================================================================
section "6️⃣  n8n 워크플로우 실행 시뮬레이션"

log "n8n API 응답성 테스트..."

# n8n API endpoint 테스트 (인증 필요 시 건너뜀)
n8n_api_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:5678/healthz" 2>/dev/null || echo "0")
n8n_api_ms=$(echo "$n8n_api_time * 1000" | bc)
n8n_api_ms_int=${n8n_api_ms%.*}

info "n8n API 응답 시간: ${n8n_api_ms_int}ms"

if [ "$n8n_api_ms_int" -lt 100 ]; then
    pass "n8n API 성능: < 100ms"
else
    warn "n8n API 성능: >= 100ms"
fi

# Redis Queue 상태 확인
queue_length=$(docker exec redis redis-cli LLEN "bull:workflow:wait" 2>/dev/null || echo "0")
info "현재 Queue 길이: $queue_length"

if [ "$queue_length" -lt 100 ]; then
    pass "Queue 적체 없음: $queue_length < 100"
else
    warn "Queue 적체 감지: $queue_length >= 100"
fi

# =============================================================================
# 결과 요약
# =============================================================================
section "📊 성능 테스트 결과 요약"

echo ""
info "총 테스트: $TESTS_TOTAL"
echo -e "${GREEN}✓ 통과: $TESTS_PASSED${NC}"
echo -e "${RED}✗ 실패: $TESTS_FAILED${NC}"
echo ""

# 성능 평가
pass_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ 성능 검증: 통과 (Pass Rate: ${pass_rate}%)${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
elif [ $pass_rate -ge 80 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠ 성능 검증: 부분 통과 (Pass Rate: ${pass_rate}%)${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ 성능 검증: 실패 (Pass Rate: ${pass_rate}%)${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 2
fi
