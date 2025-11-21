# n8n 자동 치유 시스템 가이드

n8n 실행 오류를 자동으로 감지하고 수정하는 자가 치유 시스템입니다.

## 📋 목차

- [개요](#개요)
- [시스템 아키텍처](#시스템-아키텍처)
- [설치 및 설정](#설치-및-설정)
- [사용 방법](#사용-방법)
- [작동 원리](#작동-원리)
- [문제 해결](#문제-해결)

---

## 개요

### 주요 기능

✅ **실시간 모니터링**: 5분마다 n8n 실행 오류 감지
✅ **자동 분석**: AI 기반 오류 패턴 분석 및 분류
✅ **자동 수정**: Claude API를 사용한 수정 코드 생성
✅ **자동 배포**: 테스트 → 커밋 → PR 생성 자동화
✅ **롤백 지원**: 백업 기반 안전한 롤백
✅ **알림 시스템**: Slack 통합 알림

### 시스템 구성

```
scripts/auto-healing/
├── monitor.sh              # 모니터링 스크립트 (5분마다)
├── analyze-errors.ts       # 오류 분석 (1시간마다)
├── fix-generator.ts        # 수정 생성 (Claude API)
├── deploy-fix.sh           # 자동 배포
├── systemd/                # systemd 서비스 파일
│   ├── n8n-auto-healing-monitor.service
│   ├── n8n-auto-healing-monitor.timer
│   ├── n8n-auto-healing-analyzer.service
│   ├── n8n-auto-healing-analyzer.timer
│   └── install-services.sh
├── logs/                   # 로그 파일
├── state/                  # 상태 파일
└── backups/                # 백업 파일
```

---

## 시스템 아키텍처

### 워크플로우

```
┌─────────────────┐
│  monitor.sh     │ ← 5분마다 실행
│  (모니터링)      │
└────────┬────────┘
         │ 오류 감지
         ↓
┌─────────────────┐
│ analyze-errors  │ ← 1시간마다 실행
│ (오류 분석)      │
└────────┬────────┘
         │ 패턴 분석
         ↓
┌─────────────────┐
│ fix-generator   │ ← 자동 트리거
│ (수정 생성)      │
└────────┬────────┘
         │ Claude API
         ↓
┌─────────────────┐
│  deploy-fix.sh  │ ← 자동 배포
│  (테스트&배포)   │
└────────┬────────┘
         │
         ↓
    ┌────────┐
    │   PR   │
    └────────┘
```

### 모니터링 (monitor.sh)

**실행 주기**: 5분마다 (systemd timer)

**모니터링 항목**:

- n8n 헬스 체크 (`/healthz`)
- 실패한 워크플로우 실행 조회
- MongoDB 오류 로그 확인

**트리거 조건**:

- 같은 오류 패턴이 5회 이상 발생
- 심각도가 critical 또는 high
- 마지막 치유 시도 후 30분 경과

### 오류 분석 (analyze-errors.ts)

**실행 주기**: 1시간마다 (systemd timer)

**분석 프로세스**:

1. **오류 분류**: 카테고리별 자동 분류
   - Database (MongoDB 관련)
   - Network (HTTP, 연결 오류)
   - Authentication (인증/권한)
   - Data (데이터 검증, 파싱)
   - Workflow (워크플로우 구조)
   - Resources (메모리, 디스크)

2. **빈도 분석**: 오류 발생 횟수 및 추세

3. **영향도 평가**: Impact Score 계산

   ```
   Impact Score = 빈도(50점) + 심각도(30점) + 영향범위(20점)
   ```

4. **수정 우선순위**: Impact Score 기반 정렬

### 수정 생성 (fix-generator.ts)

**실행**: 자동 트리거 (심각한 오류 감지 시)

**Claude API 활용**:

- Model: `claude-3-5-sonnet-20241022`
- Temperature: `0.2` (정확성 우선)
- Max Tokens: `4096`

**생성되는 수정**:

- **Workflow 수정**: n8n 워크플로우 JSON 패치
- **Code 수정**: TypeScript/JavaScript 코드 변경
- **Configuration 수정**: 환경 변수, 설정 파일

**각 수정에 포함**:

- 설명 (Description)
- 변경 사항 (Changes)
- 테스트 계획 (Test Plan)
- 롤백 계획 (Rollback Plan)
- 영향 평가 (Impact Assessment)

### 자동 배포 (deploy-fix.sh)

**배포 프로세스**:

1. **백업 생성**: 모든 변경 파일 백업
2. **테스트 실행**:
   - ESLint
   - TypeScript check
   - Unit tests
   - Build
3. **Git 작업**:
   - 새 브랜치 생성 (`auto-fix/YYYYMMDD_HHMMSS`)
   - 변경 사항 커밋
   - 원격 브랜치 푸시
4. **PR 생성**: GitHub CLI 사용
5. **실패 시 롤백**: 자동 브랜치 삭제

---

## 설치 및 설정

### 1. 사전 요구사항

```bash
# Node.js 20+ 및 npm
node --version  # v20.11.0+
npm --version

# TypeScript 및 ts-node
npm install -g typescript ts-node

# MongoDB CLI (mongosh)
mongosh --version

# Git
git --version

# GitHub CLI (선택사항, PR 생성용)
gh --version

# jq (JSON 처리)
jq --version
```

### 2. 환경 변수 설정

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing

# .env.example 복사
cp .env.example .env

# 환경 변수 편집
nano .env
```

**필수 환경 변수**:

```bash
# n8n API Key (필수)
N8N_API_KEY=your_n8n_api_key_here

# Claude API Key (필수)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# MongoDB URI
MONGODB_URI=mongodb://superadmin:password@localhost:27017/n8n?authSource=admin
```

**선택 환경 변수**:

```bash
# Slack 알림
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# 자동 병합 활성화
AUTO_MERGE_PR=true

# 최대 수정 개수
MAX_FIXES_PER_RUN=5
```

### 3. 의존성 설치

```bash
cd /home/gon/projects/gonsai2/apps/frontend

# Anthropic SDK 설치
npm install @anthropic-ai/sdk

# 타입 정의
npm install --save-dev @types/node
```

### 4. systemd 서비스 설치

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/systemd

# 서비스 설치 스크립트 실행
./install-services.sh
```

설치 스크립트는 다음을 수행합니다:

- 서비스 파일을 `~/.config/systemd/user/`에 복사
- systemd 데몬 리로드
- 타이머 활성화 및 시작
- 사용자 linger 활성화 (부팅 시 자동 시작)

### 5. 설치 확인

```bash
# 타이머 상태 확인
systemctl --user list-timers | grep n8n-auto-healing

# 모니터 서비스 상태
systemctl --user status n8n-auto-healing-monitor.timer

# 분석 서비스 상태
systemctl --user status n8n-auto-healing-analyzer.timer

# 로그 확인
journalctl --user -u n8n-auto-healing-monitor -f
```

---

## 사용 방법

### 자동 모드 (권장)

systemd 서비스가 설치되면 자동으로 실행됩니다.

- **모니터링**: 5분마다 자동 실행
- **분석**: 1시간마다 자동 실행
- **수정 생성 및 배포**: 심각한 오류 감지 시 자동 트리거

### 수동 실행

#### 1. 모니터링만 실행

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing
./monitor.sh
```

#### 2. 오류 분석 실행

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing
ts-node analyze-errors.ts logs/errors.json
```

#### 3. 수정 생성 실행

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing
ts-node fix-generator.ts state/analysis.json
```

#### 4. 수정 배포 실행

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing
./deploy-fix.sh
```

#### 5. 전체 파이프라인 수동 실행

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing

# 1. 모니터링
./monitor.sh

# 2. 오류 분석
ts-node analyze-errors.ts logs/errors.json

# 3. 수정 생성
ts-node fix-generator.ts state/analysis.json

# 4. 배포
./deploy-fix.sh
```

### 서비스 제어

```bash
# 타이머 시작
systemctl --user start n8n-auto-healing-monitor.timer
systemctl --user start n8n-auto-healing-analyzer.timer

# 타이머 중지
systemctl --user stop n8n-auto-healing-monitor.timer
systemctl --user stop n8n-auto-healing-analyzer.timer

# 타이머 재시작
systemctl --user restart n8n-auto-healing-monitor.timer

# 서비스 비활성화 (부팅 시 시작 안 함)
systemctl --user disable n8n-auto-healing-monitor.timer

# 서비스 다시 활성화
systemctl --user enable n8n-auto-healing-monitor.timer
```

### 로그 확인

```bash
# 실시간 모니터 로그
journalctl --user -u n8n-auto-healing-monitor -f

# 실시간 분석 로그
journalctl --user -u n8n-auto-healing-analyzer -f

# 최근 100줄
journalctl --user -u n8n-auto-healing-monitor -n 100

# 특정 시간 이후
journalctl --user -u n8n-auto-healing-monitor --since "1 hour ago"

# 파일 로그
tail -f /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/logs/monitor.log
tail -f /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/logs/deploy.log
```

---

## 작동 원리

### 오류 감지 메커니즘

#### 1. n8n API를 통한 실패 실행 조회

```bash
GET /api/v1/executions?status=error&limit=50
```

실패한 워크플로우 실행 정보:

- `executionId`: 실행 ID
- `workflowId`: 워크플로우 ID
- `workflowName`: 워크플로우 이름
- `error`: 오류 메시지
- `nodeType`: 실패한 노드 타입

#### 2. MongoDB 직접 조회

```javascript
db.executions.find({
  finished: false,
  stoppedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
});
```

최근 5분 내 미완료 실행 조회

### 오류 분류 시스템

#### 카테고리 정의

| 카테고리         | 서브카테고리       | 심각도   | 예시              |
| ---------------- | ------------------ | -------- | ----------------- |
| `database`       | connection         | critical | MongoNetworkError |
| `database`       | query              | high     | MongoServerError  |
| `database`       | performance        | high     | MongoTimeoutError |
| `network`        | connection_refused | high     | ECONNREFUSED      |
| `network`        | timeout            | medium   | ETIMEDOUT         |
| `network`        | dns                | high     | ENOTFOUND         |
| `authentication` | credentials        | high     | Unauthorized      |
| `authentication` | permissions        | high     | Forbidden         |
| `data`           | validation         | medium   | ValidationError   |
| `data`           | type               | medium   | TypeError         |
| `data`           | parsing            | medium   | JSON parse error  |
| `workflow`       | structure          | high     | Node not found    |
| `workflow`       | configuration      | medium   | Missing parameter |
| `resources`      | memory             | critical | Out of memory     |
| `resources`      | disk               | critical | Disk full         |

#### Impact Score 계산

```typescript
const impactScore =
  Math.min(frequency * 2, 50) + // 빈도 점수 (최대 50점)
  severityScore + // 심각도 점수 (최대 30점)
  Math.min(affectedWorkflows * 5, 20); // 범위 점수 (최대 20점)
```

**심각도별 점수**:

- `critical`: 30점
- `high`: 20점
- `medium`: 10점
- `low`: 5점

### 자동 수정 생성

#### Claude에게 전달되는 Prompt

```
You are an expert n8n workflow automation engineer. Analyze the following error and generate a fix.

## Error Information
- Pattern: [오류 패턴]
- Category: [카테고리]
- Severity: [심각도]
- Frequency: [발생 횟수]
- Fix Type: [수정 타입]
- Recommendation: [권장사항]

## Context
[전체 오류 컨텍스트]

## Task
Generate a detailed fix for this error...
```

#### 생성되는 JSON 형식

```json
{
  "description": "수정 설명",
  "changes": [
    {
      "type": "workflow|code|configuration",
      "target": "대상 워크플로우 또는 파일 경로",
      "action": "create|update|delete",
      "content": "실제 변경 내용"
    }
  ],
  "test_plan": ["테스트 단계 1", "테스트 단계 2"],
  "rollback_plan": "롤백 방법",
  "estimated_impact": "영향 평가"
}
```

### 백업 및 롤백

#### 백업 생성

모든 수정 전 자동 백업:

```
scripts/auto-healing/backups/[timestamp]/
├── workflow_[workflow-id]_[timestamp].json
├── config_[filename]_[timestamp]
└── code_[filename]_[timestamp]
```

#### 롤백 방법

##### 자동 롤백 (테스트 실패 시)

```bash
# deploy-fix.sh에서 자동 실행
git checkout main
git branch -D auto-fix/[timestamp]
```

##### 수동 롤백

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing

# 1. 백업 디렉토리 확인
ls -la backups/

# 2. 특정 타임스탬프 백업 복원
BACKUP_DIR="backups/1234567890"

# 3. 워크플로우 복원 (n8n API 사용)
# state/fixes.json에서 원본 워크플로우 ID 확인 후 복원

# 4. 코드/설정 파일 복원
cp "$BACKUP_DIR/code_[filename]" ../../src/[path]/[filename]
cp "$BACKUP_DIR/config_[filename]" ../../[path]/[filename]

# 5. Git 복원 (이미 병합된 경우)
git revert [commit-hash]
```

---

## 문제 해결

### 일반적인 문제

#### 1. systemd 타이머가 실행되지 않음

**증상**: `systemctl --user list-timers`에서 타이머가 보이지 않음

**해결**:

```bash
# 타이머 파일 확인
ls -la ~/.config/systemd/user/n8n-auto-healing-*.timer

# systemd 데몬 리로드
systemctl --user daemon-reload

# 타이머 활성화
systemctl --user enable n8n-auto-healing-monitor.timer
systemctl --user start n8n-auto-healing-monitor.timer

# linger 활성화
sudo loginctl enable-linger $USER
```

#### 2. 환경 변수를 찾을 수 없음

**증상**: "ANTHROPIC_API_KEY not set"

**해결**:

```bash
# .env 파일 위치 확인
ls -la /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/.env

# systemd 서비스 파일에 EnvironmentFile 추가
nano ~/.config/systemd/user/n8n-auto-healing-monitor.service

# 다음 줄 추가:
EnvironmentFile=/home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/.env

# 데몬 리로드
systemctl --user daemon-reload
```

#### 3. MongoDB 연결 실패

**증상**: "MongoNetworkError: connect ECONNREFUSED"

**해결**:

```bash
# MongoDB 상태 확인
docker ps | grep mongo

# MongoDB 연결 테스트
mongosh "mongodb://superadmin:password@localhost:27017/n8n?authSource=admin"

# MONGODB_URI 확인
echo $MONGODB_URI
```

#### 4. n8n API 401 Unauthorized

**증상**: "Failed to fetch workflow: Unauthorized"

**해결**:

```bash
# n8n API 키 확인
echo $N8N_API_KEY

# n8n UI에서 새 API 키 생성
# Settings → API → Create API Key

# .env 파일 업데이트
nano /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/.env
```

#### 5. Claude API 호출 실패

**증상**: "Error calling Claude API"

**해결**:

```bash
# API 키 확인
echo $ANTHROPIC_API_KEY

# API 키 테스트
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Rate limit 확인 (429 에러 발생 시)
# fix-generator.ts에서 대기 시간 증가
```

#### 6. Git 푸시 실패

**증상**: "Failed to push branch: Permission denied"

**해결**:

```bash
# Git 인증 확인
git config --global user.name
git config --global user.email

# SSH 키 확인
ssh -T git@github.com

# HTTPS 토큰 사용 (Personal Access Token)
git remote set-url origin https://YOUR_TOKEN@github.com/user/repo.git

# 또는 GitHub CLI 인증
gh auth login
```

#### 7. PR 생성 실패

**증상**: "gh pr create failed"

**해결**:

```bash
# GitHub CLI 설치 확인
gh --version

# 인증 상태 확인
gh auth status

# 재인증
gh auth login

# 수동 PR 생성
gh pr create --title "Auto-fix" --body "Description"
```

### 로그 분석

#### 모니터링 실패 로그

```bash
# 최근 오류 확인
journalctl --user -u n8n-auto-healing-monitor -p err -n 50

# 특정 시간대 로그
journalctl --user -u n8n-auto-healing-monitor --since "2024-01-01 10:00:00"
```

#### 파일 로그 확인

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing

# 모니터 로그
tail -100 logs/monitor.log

# 배포 로그
tail -100 logs/deploy.log

# 오류 패턴 확인
cat logs/errors.json | jq '.[-1].patterns'

# 최근 분석 결과
cat state/analysis.json | jq '.summary'

# 최근 수정 사항
cat state/fixes.json | jq '.fixes[0]'
```

### 성능 최적화

#### 1. 모니터링 주기 조정

```bash
# 타이머 파일 편집
nano ~/.config/systemd/user/n8n-auto-healing-monitor.timer

# OnUnitActiveSec 값 변경 (기본: 5분)
OnUnitActiveSec=10min  # 10분으로 변경

# 데몬 리로드 및 재시작
systemctl --user daemon-reload
systemctl --user restart n8n-auto-healing-monitor.timer
```

#### 2. 리소스 제한 조정

```bash
# 서비스 파일 편집
nano ~/.config/systemd/user/n8n-auto-healing-monitor.service

# 리소스 제한 수정
CPUQuota=75%      # CPU 사용률 증가
MemoryLimit=1G    # 메모리 제한 증가

# 데몬 리로드
systemctl --user daemon-reload
```

#### 3. 로그 정리

```bash
cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing

# 오래된 로그 삭제 (30일 이상)
find logs/ -name "*.log" -mtime +30 -delete

# 오래된 백업 삭제 (7일 이상)
find backups/ -type d -mtime +7 -exec rm -rf {} +

# 오류 로그 크기 제한 (최근 100개만 유지)
cat logs/errors.json | jq '.[-100:]' > logs/errors.json.tmp
mv logs/errors.json.tmp logs/errors.json
```

---

## 고급 설정

### Cron 대신 사용하기

systemd 대신 cron을 사용하려면:

```bash
# crontab 편집
crontab -e

# 다음 추가
# 5분마다 모니터링
*/5 * * * * cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing && ./monitor.sh >> logs/monitor.log 2>&1

# 1시간마다 분석
0 * * * * cd /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing && ts-node analyze-errors.ts logs/errors.json >> logs/analyzer.log 2>&1
```

### 알림 커스터마이징

#### Slack 메시지 형식 변경

[monitor.sh](scripts/auto-healing/monitor.sh)의 `send_notification` 함수 수정:

```bash
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
                        \"type\": \"header\",
                        \"text\": {
                            \"type\": \"plain_text\",
                            \"text\": \"${title}\"
                        }
                    },
                    {
                        \"type\": \"section\",
                        \"text\": {
                            \"type\": \"mrkdwn\",
                            \"text\": \"${message}\"
                        }
                    }
                ]
            }"
    fi
}
```

### 수정 필터링

특정 오류만 자동 수정하려면 [fix-generator.ts](scripts/auto-healing/fix-generator.ts) 수정:

```typescript
// 자동 수정 가능한 항목 필터링
const autoFixable = analysis.priority_fixes
  .filter((f) => {
    // 특정 카테고리만 허용
    const allowedCategories = ['workflow', 'configuration'];
    return f.automated_fix_available && allowedCategories.includes(f.category);
  })
  .filter((f) => {
    // Impact Score 임계값
    return f.impact_score >= 50;
  })
  .slice(0, 5);
```

---

## 보안 고려사항

### 1. API 키 보안

```bash
# .env 파일 권한
chmod 600 /home/gon/projects/gonsai2/apps/frontend/scripts/auto-healing/.env

# Git에서 제외
echo ".env" >> .gitignore
```

### 2. systemd 보안 설정

서비스 파일에 포함된 보안 설정:

- `PrivateTmp=yes`: 격리된 임시 디렉토리
- `NoNewPrivileges=true`: 권한 상승 방지
- `ProtectSystem=strict`: 시스템 파일 보호
- `ProtectHome=read-only`: 홈 디렉토리 읽기 전용

### 3. 자동 병합 제한

```bash
# .env 설정
AUTO_MERGE_PR=false  # 수동 검토 필수

# 또는 특정 조건에서만 병합
# deploy-fix.sh 수정
if [ "${AUTO_MERGE_PR}" = "true" ] && [ "$critical_count" -eq 0 ]; then
    # 심각한 오류가 없을 때만 자동 병합
    gh pr merge --auto --squash
fi
```

---

## 참고 자료

- [n8n API Documentation](https://docs.n8n.io/api/)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/)
- [systemd Documentation](https://www.freedesktop.org/software/systemd/man/)
- [GitHub CLI Documentation](https://cli.github.com/manual/)

---

**마지막 업데이트**: 2024-10-19
