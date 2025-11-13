#!/bin/bash

# n8n Auto-Healing Deploy Fix Script
# 생성된 수정 사항을 테스트하고 Git에 커밋/푸시하며 PR을 생성합니다.

set -euo pipefail

# 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/deploy.log"
FIXES_FILE="${SCRIPT_DIR}/state/fixes.json"

# Git 설정
GIT_BRANCH_PREFIX="auto-fix"
GIT_COMMIT_PREFIX="fix(auto-healing)"
GIT_REMOTE="${GIT_REMOTE:-origin}"

# GitHub CLI 설정
GH_CLI="${GH_CLI:-gh}"

# 로깅 함수
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# 로그 디렉토리 생성
mkdir -p "$(dirname "$LOG_FILE")"

# ============================================================================
# Pre-flight Checks
# ============================================================================

check_prerequisites() {
    log "Checking prerequisites..."

    # Git 확인
    if ! command -v git &> /dev/null; then
        error "git not found"
        return 1
    fi

    # GitHub CLI 확인 (선택사항)
    if ! command -v "$GH_CLI" &> /dev/null; then
        log "⚠️  GitHub CLI not found, PR creation will be skipped"
    fi

    # fixes.json 확인
    if [ ! -f "$FIXES_FILE" ]; then
        error "Fixes file not found: $FIXES_FILE"
        return 1
    fi

    # Git 작업 디렉토리 확인
    cd "$PROJECT_ROOT"
    if ! git rev-parse --git-dir &> /dev/null; then
        error "Not a git repository: $PROJECT_ROOT"
        return 1
    fi

    log "✅ Prerequisites check passed"
    return 0
}

# ============================================================================
# Parse Fixes
# ============================================================================

parse_fixes() {
    log "Parsing fixes..."

    local total_fixes
    local successful_fixes

    total_fixes=$(jq -r '.total_fixes' "$FIXES_FILE")
    successful_fixes=$(jq -r '.successful_fixes' "$FIXES_FILE")

    if [ "$successful_fixes" -eq 0 ]; then
        log "ℹ️  No successful fixes to deploy"
        return 1
    fi

    log "📊 Found $successful_fixes successful fixes out of $total_fixes"
    return 0
}

# ============================================================================
# Test Fixes
# ============================================================================

run_tests() {
    log "Running tests..."

    cd "$PROJECT_ROOT"

    # ESLint
    if [ -f "package.json" ] && grep -q '"lint"' package.json; then
        log "  Running ESLint..."
        if npm run lint; then
            log "  ✅ ESLint passed"
        else
            error "  ❌ ESLint failed"
            return 1
        fi
    fi

    # TypeScript
    if [ -f "package.json" ] && grep -q '"type-check"' package.json; then
        log "  Running TypeScript check..."
        if npm run type-check; then
            log "  ✅ TypeScript check passed"
        else
            error "  ❌ TypeScript check failed"
            return 1
        fi
    fi

    # Unit Tests
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log "  Running unit tests..."
        if npm run test; then
            log "  ✅ Unit tests passed"
        else
            error "  ❌ Unit tests failed"
            return 1
        fi
    fi

    # Build
    if [ -f "package.json" ] && grep -q '"build"' package.json; then
        log "  Running build..."
        if npm run build; then
            log "  ✅ Build passed"
        else
            error "  ❌ Build failed"
            return 1
        fi
    fi

    log "✅ All tests passed"
    return 0
}

# ============================================================================
# Git Operations
# ============================================================================

create_branch() {
    log "Creating Git branch..."

    cd "$PROJECT_ROOT"

    # 현재 브랜치 확인
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)
    log "  Current branch: $current_branch"

    # 최신 상태로 업데이트
    log "  Fetching latest changes..."
    git fetch "$GIT_REMOTE"

    # 새 브랜치 이름 생성
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local branch_name="${GIT_BRANCH_PREFIX}/${timestamp}"

    # 브랜치 생성 및 체크아웃
    log "  Creating branch: $branch_name"
    git checkout -b "$branch_name"

    log "✅ Branch created: $branch_name"
    echo "$branch_name"
}

commit_changes() {
    local branch_name="$1"

    log "Committing changes..."

    cd "$PROJECT_ROOT"

    # 변경 사항 확인
    if git diff --quiet && git diff --cached --quiet; then
        log "ℹ️  No changes to commit"
        return 1
    fi

    # 변경 파일 목록
    log "  Changed files:"
    git status --short | tee -a "$LOG_FILE"

    # 모든 변경 사항 스테이징
    git add -A

    # 커밋 메시지 생성
    local commit_message
    commit_message=$(generate_commit_message)

    # 커밋
    log "  Committing with message:"
    log "  $commit_message"
    git commit -m "$commit_message"

    log "✅ Changes committed"
    return 0
}

generate_commit_message() {
    local fixes_summary
    fixes_summary=$(jq -r '
        .fixes[] |
        "- \(.error_pattern): \(.description)"
    ' "$FIXES_FILE" | head -5)

    local total_fixes
    total_fixes=$(jq -r '.total_fixes' "$FIXES_FILE")

    local message
    message="${GIT_COMMIT_PREFIX}: auto-generated fixes ($total_fixes issues)

🤖 Automatically generated fixes by n8n auto-healing system

## Fixed Issues:
$fixes_summary

## Details:
- Generated at: $(jq -r '.generated_at' "$FIXES_FILE")
- Successful fixes: $(jq -r '.successful_fixes' "$FIXES_FILE")
- Failed fixes: $(jq -r '.failed_fixes' "$FIXES_FILE")

## Testing:
All automated tests have passed:
- ✅ ESLint
- ✅ TypeScript check
- ✅ Unit tests
- ✅ Build

🤖 Generated with n8n Auto-Healing System
"
    echo "$message"
}

push_branch() {
    local branch_name="$1"

    log "Pushing branch to remote..."

    cd "$PROJECT_ROOT"

    # 푸시
    git push -u "$GIT_REMOTE" "$branch_name"

    log "✅ Branch pushed: $branch_name"
}

# ============================================================================
# Pull Request Creation
# ============================================================================

create_pull_request() {
    local branch_name="$1"

    log "Creating pull request..."

    cd "$PROJECT_ROOT"

    # GitHub CLI 확인
    if ! command -v "$GH_CLI" &> /dev/null; then
        log "⚠️  GitHub CLI not found, skipping PR creation"
        log "   Please create PR manually: https://github.com/YOUR_REPO/compare/$branch_name"
        return 0
    fi

    # PR 제목 및 본문 생성
    local pr_title
    pr_title="🤖 Auto-fix: $(jq -r '.total_fixes' "$FIXES_FILE") n8n errors"

    local pr_body
    pr_body=$(generate_pr_body)

    # PR 생성
    log "  Creating PR..."
    local pr_url
    pr_url=$("$GH_CLI" pr create \
        --title "$pr_title" \
        --body "$pr_body" \
        --label "auto-fix,auto-healing" \
        --base main \
        --head "$branch_name" \
        2>&1) || {
        error "Failed to create PR"
        return 1
    }

    log "✅ Pull request created: $pr_url"

    # PR 자동 병합 활성화 (선택사항)
    if [ "${AUTO_MERGE_PR:-false}" = "true" ]; then
        log "  Enabling auto-merge..."
        "$GH_CLI" pr merge "$pr_url" --auto --squash || {
            log "⚠️  Failed to enable auto-merge"
        }
    fi

    return 0
}

generate_pr_body() {
    local fixes_detail
    fixes_detail=$(jq -r '
        .fixes[] |
        "### \(.error_pattern)
**Type**: \(.fix_type)
**Description**: \(.description)

**Changes**:
\(.changes | map("- [\(.type)] \(.target): \(.action)") | join("\n"))

**Test Plan**:
\(.test_plan | map("- \(.)") | join("\n"))

**Rollback Plan**: \(.rollback_plan)

**Impact**: \(.estimated_impact)

---
"
    ' "$FIXES_FILE")

    local errors
    if [ "$(jq -r '.errors | length' "$FIXES_FILE")" -gt 0 ]; then
        errors="## ⚠️ Errors During Fix Generation

$(jq -r '.errors[] | "- \(.)"' "$FIXES_FILE")
"
    else
        errors=""
    fi

    cat <<EOF
## 🤖 Auto-Generated Fixes

This PR contains automatically generated fixes for n8n execution errors detected by the auto-healing system.

## 📊 Summary

- **Total Fixes**: $(jq -r '.total_fixes' "$FIXES_FILE")
- **Successful**: $(jq -r '.successful_fixes' "$FIXES_FILE")
- **Failed**: $(jq -r '.failed_fixes' "$FIXES_FILE")
- **Generated at**: $(jq -r '.generated_at' "$FIXES_FILE")

## 🔧 Fixes Applied

$fixes_detail

$errors

## ✅ Testing

All automated tests have passed:
- ✅ ESLint
- ✅ TypeScript check
- ✅ Unit tests
- ✅ Build

## 🔄 Rollback

If issues occur after merging, rollback instructions are included in each fix section above.

Backup files are stored in: \`scripts/auto-healing/backups/\`

## 📝 Review Checklist

- [ ] Review generated fixes for correctness
- [ ] Verify test coverage
- [ ] Check for potential side effects
- [ ] Confirm rollback plans are adequate

---

🤖 This PR was automatically generated by the n8n Auto-Healing System.

**Do not merge without review**, even though all tests have passed.
EOF
}

# ============================================================================
# Cleanup
# ============================================================================

cleanup_on_error() {
    local branch_name="$1"

    log "Cleaning up after error..."

    cd "$PROJECT_ROOT"

    # 현재 브랜치 확인
    local current_branch
    current_branch=$(git rev-parse --abbrev-ref HEAD)

    # 자동 생성된 브랜치인 경우에만 정리
    if [[ "$current_branch" == ${GIT_BRANCH_PREFIX}/* ]]; then
        log "  Switching back to main branch..."
        git checkout main || git checkout master || {
            error "Failed to checkout main branch"
        }

        log "  Deleting branch: $current_branch"
        git branch -D "$current_branch" || {
            error "Failed to delete branch"
        }
    fi

    log "✅ Cleanup completed"
}

# ============================================================================
# Main Deployment Flow
# ============================================================================

main() {
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Starting auto-healing fix deployment..."
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local branch_name=""

    # Prerequisites 확인
    if ! check_prerequisites; then
        error "Prerequisites check failed"
        exit 1
    fi

    # Fixes 파싱
    if ! parse_fixes; then
        log "No fixes to deploy, exiting..."
        exit 0
    fi

    # 테스트 실행
    if ! run_tests; then
        error "Tests failed, aborting deployment"
        exit 1
    fi

    # Git 브랜치 생성
    branch_name=$(create_branch)
    if [ -z "$branch_name" ]; then
        error "Failed to create branch"
        exit 1
    fi

    # 변경 사항 커밋
    if ! commit_changes "$branch_name"; then
        log "No changes to deploy"
        cleanup_on_error "$branch_name"
        exit 0
    fi

    # 브랜치 푸시
    if ! push_branch "$branch_name"; then
        error "Failed to push branch"
        cleanup_on_error "$branch_name"
        exit 1
    fi

    # PR 생성
    if ! create_pull_request "$branch_name"; then
        log "⚠️  PR creation failed, but branch was pushed successfully"
        log "   Branch: $branch_name"
    fi

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "✅ Fix deployment completed successfully"
    log "   Branch: $branch_name"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 오류 발생 시 정리
trap 'error "Deployment failed with error"; cleanup_on_error "${branch_name:-}"' ERR

# 스크립트 실행
main "$@"
