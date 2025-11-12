#!/bin/bash

###############################################################################
# n8n Health Check Script
#
# Description: n8n 시스템 전반의 상태를 확인하고 문제를 감지합니다.
# Author: gonsai2
# Usage: ./scripts/n8n-health-check.sh [--verbose] [--json]
###############################################################################

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 옵션 파싱
VERBOSE=false
JSON_OUTPUT=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --verbose) VERBOSE=true ;;
    --json) JSON_OUTPUT=true ;;
    *) echo "Unknown parameter: $1"; exit 1 ;;
  esac
  shift
done

# 결과 저장
declare -A RESULTS
OVERALL_STATUS="healthy"
ISSUES=()
RECOMMENDATIONS=()

###############################################################################
# 유틸리티 함수
###############################################################################

log_info() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${BLUE}[INFO]${NC} $1"
  fi
}

log_success() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${GREEN}[✓]${NC} $1"
  fi
}

log_warning() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${YELLOW}[!]${NC} $1"
  fi
  ISSUES+=("$1")
}

log_error() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${RED}[✗]${NC} $1"
  fi
  ISSUES+=("$1")
  OVERALL_STATUS="unhealthy"
}

check_command() {
  if command -v "$1" &> /dev/null; then
    return 0
  else
    return 1
  fi
}

###############################################################################
# 헬스체크 함수
###############################################################################

# 1. n8n API 연결 확인
check_n8n_api() {
  log_info "Checking n8n API..."

  N8N_URL="${N8N_BASE_URL:-http://localhost:5678}"

  if curl -f -s "${N8N_URL}/healthz" > /dev/null 2>&1; then
    log_success "n8n API is accessible"
    RESULTS["n8n_api"]="ok"
  else
    log_error "n8n API is not accessible at ${N8N_URL}"
    RESULTS["n8n_api"]="fail"
    RECOMMENDATIONS+=("Check if n8n container is running: docker ps | grep n8n")
  fi
}

# 2. Redis 연결 확인
check_redis() {
  log_info "Checking Redis..."

  if check_command "redis-cli"; then
    if redis-cli ping > /dev/null 2>&1; then
      log_success "Redis is running"
      RESULTS["redis"]="ok"

      # Redis 메모리 사용량 확인
      REDIS_MEMORY=$(redis-cli INFO memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
      if [ "$VERBOSE" = true ]; then
        log_info "Redis memory usage: $REDIS_MEMORY"
      fi
    else
      log_error "Redis is not responding"
      RESULTS["redis"]="fail"
      RECOMMENDATIONS+=("Start Redis: docker start redis or systemctl start redis")
    fi
  else
    log_warning "redis-cli command not found, skipping Redis check"
    RESULTS["redis"]="skip"
  fi
}

# 3. MongoDB 연결 확인
check_mongodb() {
  log_info "Checking MongoDB..."

  MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017}"

  if check_command "mongosh"; then
    if mongosh --eval "db.adminCommand('ping')" "$MONGODB_URI" > /dev/null 2>&1; then
      log_success "MongoDB is running"
      RESULTS["mongodb"]="ok"
    else
      log_error "MongoDB is not responding"
      RESULTS["mongodb"]="fail"
      RECOMMENDATIONS+=("Check MongoDB container: docker ps | grep mongodb")
    fi
  elif check_command "mongo"; then
    if mongo --eval "db.adminCommand('ping')" "$MONGODB_URI" > /dev/null 2>&1; then
      log_success "MongoDB is running"
      RESULTS["mongodb"]="ok"
    else
      log_error "MongoDB is not responding"
      RESULTS["mongodb"]="fail"
    fi
  else
    log_warning "mongosh/mongo command not found, skipping MongoDB check"
    RESULTS["mongodb"]="skip"
  fi
}

# 4. Docker 컨테이너 상태 확인
check_docker_containers() {
  log_info "Checking Docker containers..."

  if check_command "docker"; then
    # n8n 컨테이너
    if docker ps | grep -q "n8n"; then
      log_success "n8n container is running"
      RESULTS["docker_n8n"]="ok"
    else
      log_error "n8n container is not running"
      RESULTS["docker_n8n"]="fail"
      RECOMMENDATIONS+=("Start n8n: cd ~/docker-n8n && docker-compose up -d")
    fi

    # MongoDB 컨테이너
    if docker ps | grep -q "mongodb\|mongo"; then
      log_success "MongoDB container is running"
      RESULTS["docker_mongodb"]="ok"
    else
      log_warning "MongoDB container is not running"
      RESULTS["docker_mongodb"]="warn"
    fi

    # Redis 컨테이너
    if docker ps | grep -q "redis"; then
      log_success "Redis container is running"
      RESULTS["docker_redis"]="ok"
    else
      log_warning "Redis container is not running"
      RESULTS["docker_redis"]="warn"
    fi
  else
    log_warning "docker command not found, skipping container checks"
    RESULTS["docker"]="skip"
  fi
}

# 5. 최근 오류 확인
check_recent_errors() {
  log_info "Checking recent errors..."

  if [ -f "logs/error.log" ]; then
    ERROR_COUNT=$(wc -l < logs/error.log 2>/dev/null || echo "0")

    if [ "$ERROR_COUNT" -gt 100 ]; then
      log_warning "High number of errors in log: $ERROR_COUNT"
      RESULTS["recent_errors"]="warn"
      RECOMMENDATIONS+=("Review error logs: tail -n 50 logs/error.log")
    else
      log_success "Error count is normal: $ERROR_COUNT"
      RESULTS["recent_errors"]="ok"
    fi
  else
    log_info "No error log file found"
    RESULTS["recent_errors"]="skip"
  fi
}

# 6. 디스크 사용량 확인
check_disk_usage() {
  log_info "Checking disk usage..."

  DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ "$DISK_USAGE" -gt 90 ]; then
    log_error "Critical disk usage: ${DISK_USAGE}%"
    RESULTS["disk_usage"]="critical"
    RECOMMENDATIONS+=("Free up disk space immediately")
  elif [ "$DISK_USAGE" -gt 80 ]; then
    log_warning "High disk usage: ${DISK_USAGE}%"
    RESULTS["disk_usage"]="warn"
    RECOMMENDATIONS+=("Consider cleaning up old logs and backups")
  else
    log_success "Disk usage is normal: ${DISK_USAGE}%"
    RESULTS["disk_usage"]="ok"
  fi
}

# 7. 메모리 사용량 확인
check_memory_usage() {
  log_info "Checking memory usage..."

  if check_command "free"; then
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')

    if [ "$MEMORY_USAGE" -gt 90 ]; then
      log_warning "High memory usage: ${MEMORY_USAGE}%"
      RESULTS["memory_usage"]="warn"
      RECOMMENDATIONS+=("Review memory-intensive processes: top -o %MEM")
    else
      log_success "Memory usage is normal: ${MEMORY_USAGE}%"
      RESULTS["memory_usage"]="ok"
    fi
  else
    log_info "free command not available, skipping memory check"
    RESULTS["memory_usage"]="skip"
  fi
}

# 8. 프로세스 확인
check_processes() {
  log_info "Checking critical processes..."

  # Node.js 프로세스 확인
  if pgrep -f "node.*server" > /dev/null; then
    log_success "Backend server is running"
    RESULTS["backend_process"]="ok"
  else
    log_warning "Backend server process not found"
    RESULTS["backend_process"]="warn"
    RECOMMENDATIONS+=("Start backend server: npm run server")
  fi
}

###############################################################################
# 메인 실행
###############################################################################

main() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo "=================================="
    echo "n8n System Health Check"
    echo "$(date '+%Y-%m-%d %H:%M:%S')"
    echo "=================================="
    echo ""
  fi

  # 모든 체크 실행
  check_n8n_api
  check_redis
  check_mongodb
  check_docker_containers
  check_recent_errors
  check_disk_usage
  check_memory_usage
  check_processes

  # 결과 출력
  if [ "$JSON_OUTPUT" = true ]; then
    # JSON 형식 출력
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall_status": "$OVERALL_STATUS",
  "checks": $(jq -n '$ARGS.named' \
    --arg n8n_api "${RESULTS[n8n_api]}" \
    --arg redis "${RESULTS[redis]}" \
    --arg mongodb "${RESULTS[mongodb]}" \
    --arg docker_n8n "${RESULTS[docker_n8n]}" \
    --arg docker_mongodb "${RESULTS[docker_mongodb]}" \
    --arg docker_redis "${RESULTS[docker_redis]}" \
    --arg recent_errors "${RESULTS[recent_errors]}" \
    --arg disk_usage "${RESULTS[disk_usage]}" \
    --arg memory_usage "${RESULTS[memory_usage]}" \
    --arg backend_process "${RESULTS[backend_process]}" 2>/dev/null || echo '{}'),
  "issues": $(printf '%s\n' "${ISSUES[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]'),
  "recommendations": $(printf '%s\n' "${RECOMMENDATIONS[@]}" | jq -R . | jq -s . 2>/dev/null || echo '[]')
}
EOF
  else
    echo ""
    echo "=================================="
    echo "Health Check Summary"
    echo "=================================="
    echo "Overall Status: $OVERALL_STATUS"
    echo ""

    if [ ${#ISSUES[@]} -gt 0 ]; then
      echo "Issues Found:"
      for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
      done
      echo ""
    fi

    if [ ${#RECOMMENDATIONS[@]} -gt 0 ]; then
      echo "Recommendations:"
      for rec in "${RECOMMENDATIONS[@]}"; do
        echo "  - $rec"
      done
      echo ""
    fi

    if [ "$OVERALL_STATUS" = "healthy" ]; then
      echo -e "${GREEN}All checks passed!${NC}"
      exit 0
    else
      echo -e "${RED}Some checks failed. Please review the issues above.${NC}"
      exit 1
    fi
  fi
}

# 스크립트 실행
main
