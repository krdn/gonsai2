#!/bin/bash

# n8n Auto-Healing Monitor Script
# 5분마다 실행되어 n8n 실행 오류를 감지하고 자동 수정을 트리거합니다.

set -euo pipefail

# 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/monitor.log"
ERROR_LOG="${SCRIPT_DIR}/logs/errors.json"
STATE_FILE="${SCRIPT_DIR}/state/monitor.state"

# 환경 변수 로드
if [ -f "${PROJECT_ROOT}/.env.local" ]; then
    source "${PROJECT_ROOT}/.env.local"
fi

# 로그 디렉토리 생성
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$STATE_FILE")"
mkdir -p "${SCRIPT_DIR}/state"

# 로깅 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# n8n API URL 설정
N8N_URL="${NEXT_PUBLIC_N8N_URL:-http://localhost:5678}"
N8N_API_KEY="${N8N_API_KEY:-}"

# MongoDB 연결 정보
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"

# 알림 설정
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
NOTIFICATION_THRESHOLD=3  # 연속 실패 횟수

# 상태 파일에서 이전 실행 정보 읽기
read_state() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo '{
            "last_check": "1970-01-01T00:00:00Z",
            "consecutive_failures": 0,
            "total_errors": 0,
            "last_healing_attempt": "1970-01-01T00:00:00Z"
        }'
    fi
}

# 상태 파일 업데이트
write_state() {
    local state="$1"
    echo "$state" > "$STATE_FILE"
}

# n8n 헬스 체크
check_n8n_health() {
    log "Checking n8n health..."

    local response
    local status_code

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${N8N_URL}/healthz" || echo "000")

    if [ "$response" = "200" ]; then
        log "✅ n8n is healthy"
        return 0
    else
        error "❌ n8n health check failed with status: $response"
        return 1
    fi
}

# n8n 실행 로그 확인 (최근 5분)
check_execution_logs() {
    log "Checking n8n execution logs..."

    local executions
    local failed_count=0

    # n8n API로 최근 실패한 실행 조회
    if [ -n "$N8N_API_KEY" ]; then
        executions=$(curl -s -H "X-N8N-API-KEY: ${N8N_API_KEY}" \
            "${N8N_URL}/api/v1/executions?status=error&limit=50" || echo '{"data":[]}')

        failed_count=$(echo "$executions" | jq -r '.data | length')

        if [ "$failed_count" -gt 0 ]; then
            log "⚠️  Found $failed_count failed executions"

            # 오류 정보를 파일에 저장
            echo "$executions" > "${SCRIPT_DIR}/state/latest_errors.json"

            # 오류 패턴 분석 트리거
            analyze_execution_errors "$executions"

            return 1
        else
            log "✅ No failed executions found"
            return 0
        fi
    else
        log "⚠️  N8N_API_KEY not set, skipping execution log check"
        return 0
    fi
}

# MongoDB 오류 로그 조회
check_mongodb_logs() {
    log "Checking MongoDB error logs..."

    # MongoDB에 연결하여 n8n 관련 오류 조회
    local mongo_errors

    mongo_errors=$(mongosh "$MONGODB_URI/n8n" --quiet --eval '
        db.getCollection("executions").find({
            "finished": false,
            "stoppedAt": { $gte: new Date(Date.now() - 5 * 60 * 1000) }
        }).limit(50).toArray()
    ' 2>/dev/null || echo '[]')

    local error_count
    error_count=$(echo "$mongo_errors" | jq -r 'length')

    if [ "$error_count" -gt 0 ]; then
        log "⚠️  Found $error_count errors in MongoDB"
        echo "$mongo_errors" > "${SCRIPT_DIR}/state/mongodb_errors.json"
        return 1
    else
        log "✅ No MongoDB errors found"
        return 0
    fi
}

# 실행 오류 분석
analyze_execution_errors() {
    local executions="$1"

    log "Analyzing execution errors..."

    # 오류 패턴 추출
    local error_patterns
    error_patterns=$(echo "$executions" | jq -r '
        .data[] |
        {
            workflowId: .workflowId,
            workflowName: .workflowName,
            error: (.data.resultData.error // "Unknown error"),
            nodeType: (.data.resultData.lastNodeExecuted // "Unknown"),
            timestamp: .stoppedAt
        }
    ' | jq -s '.')

    # 패턴별로 그룹화
    local grouped_errors
    grouped_errors=$(echo "$error_patterns" | jq -r '
        group_by(.error) |
        map({
            error: .[0].error,
            count: length,
            workflows: map(.workflowName) | unique,
            nodes: map(.nodeType) | unique
        }) |
        sort_by(.count) |
        reverse
    ')

    log "Error patterns detected:"
    echo "$grouped_errors" | jq -r '.[] | "  - \(.error) (count: \(.count))"'

    # 오류 로그에 추가
    local timestamp
    timestamp=$(date -Iseconds)

    local error_entry
    error_entry=$(jq -n \
        --arg timestamp "$timestamp" \
        --argjson patterns "$grouped_errors" \
        '{
            timestamp: $timestamp,
            patterns: $patterns
        }')

    # 기존 오류 로그 읽기
    local existing_errors
    if [ -f "$ERROR_LOG" ]; then
        existing_errors=$(cat "$ERROR_LOG")
    else
        existing_errors='[]'
    fi

    # 새 오류 추가 (최근 100개만 유지)
    echo "$existing_errors" | jq --argjson new "$error_entry" '. + [$new] | .[-100:]' > "$ERROR_LOG"

    # 심각한 오류 감지 (같은 오류가 5회 이상 발생)
    local critical_errors
    critical_errors=$(echo "$grouped_errors" | jq -r '[.[] | select(.count >= 5)]')

    if [ "$(echo "$critical_errors" | jq -r 'length')" -gt 0 ]; then
        log "🚨 Critical errors detected!"
        echo "$critical_errors" | jq -r '.[] | "  - \(.error) (count: \(.count))"'

        # 자동 수정 트리거
        trigger_auto_healing "$critical_errors"
    fi
}

# 자동 수정 트리거
trigger_auto_healing() {
    local errors="$1"

    log "Triggering auto-healing process..."

    # 상태 읽기
    local state
    state=$(read_state)

    # 마지막 치유 시도 시간 확인 (최소 30분 간격)
    local last_healing
    last_healing=$(echo "$state" | jq -r '.last_healing_attempt')

    local last_healing_epoch
    last_healing_epoch=$(date -d "$last_healing" +%s 2>/dev/null || echo 0)

    local current_epoch
    current_epoch=$(date +%s)

    local time_diff
    time_diff=$((current_epoch - last_healing_epoch))

    if [ $time_diff -lt 1800 ]; then
        log "⏳ Last healing attempt was less than 30 minutes ago, skipping..."
        return 0
    fi

    # 오류 분석 스크립트 실행
    log "Running error analysis..."
    if command -v ts-node &> /dev/null; then
        ts-node "${SCRIPT_DIR}/analyze-errors.ts" "$ERROR_LOG" || {
            error "Error analysis failed"
            return 1
        }
    else
        error "ts-node not found, skipping analysis"
        return 1
    fi

    # 수정 생성 스크립트 실행
    log "Generating fixes..."
    if command -v ts-node &> /dev/null; then
        ts-node "${SCRIPT_DIR}/fix-generator.ts" "${SCRIPT_DIR}/state/analysis.json" || {
            error "Fix generation failed"
            return 1
        }
    else
        error "ts-node not found, skipping fix generation"
        return 1
    fi

    # 수정 배포 스크립트 실행
    log "Deploying fixes..."
    bash "${SCRIPT_DIR}/deploy-fix.sh" || {
        error "Fix deployment failed"
        return 1
    }

    # 상태 업데이트
    local new_state
    new_state=$(echo "$state" | jq \
        --arg timestamp "$(date -Iseconds)" \
        '.last_healing_attempt = $timestamp')

    write_state "$new_state"

    log "✅ Auto-healing process completed"

    # 알림 전송
    send_notification "🔧 Auto-healing triggered" "Fixed $(echo "$errors" | jq -r 'length') error patterns"
}

# Slack 알림 전송
send_notification() {
    local title="$1"
    local message="$2"

    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"${title}\",
                \"blocks\": [
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"*${title}*\n${message}\"
                        }
                    }
                ]
            }" 2>/dev/null || true
    fi
}

# 연속 실패 횟수 업데이트
update_failure_count() {
    local failed="$1"

    local state
    state=$(read_state)

    local consecutive_failures
    consecutive_failures=$(echo "$state" | jq -r '.consecutive_failures')

    if [ "$failed" = "true" ]; then
        consecutive_failures=$((consecutive_failures + 1))
    else
        consecutive_failures=0
    fi

    # 알림 임계값 도달 시 알림
    if [ $consecutive_failures -ge $NOTIFICATION_THRESHOLD ]; then
        send_notification "⚠️ n8n Monitoring Alert" \
            "n8n has failed health checks $consecutive_failures times consecutively"
    fi

    # 상태 업데이트
    local new_state
    new_state=$(echo "$state" | jq \
        --arg timestamp "$(date -Iseconds)" \
        --arg failures "$consecutive_failures" \
        '.last_check = $timestamp | .consecutive_failures = ($failures | tonumber)')

    write_state "$new_state"
}

# 메인 모니터링 루프
main() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Starting n8n auto-healing monitor..."
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local health_ok=true
    local execution_ok=true
    local mongodb_ok=true

    # n8n 헬스 체크
    if ! check_n8n_health; then
        health_ok=false
    fi

    # 실행 로그 확인
    if ! check_execution_logs; then
        execution_ok=false
    fi

    # MongoDB 로그 확인
    if ! check_mongodb_logs; then
        mongodb_ok=false
    fi

    # 전체 상태 평가
    if [ "$health_ok" = "false" ] || [ "$execution_ok" = "false" ] || [ "$mongodb_ok" = "false" ]; then
        log "❌ Monitoring detected issues"
        update_failure_count "true"
    else
        log "✅ All checks passed"
        update_failure_count "false"
    fi

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Monitor cycle completed"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 스크립트 실행
main "$@"
