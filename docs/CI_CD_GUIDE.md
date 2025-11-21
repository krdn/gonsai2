# CI/CD 환경 설정 가이드

이 문서는 gonsai2 프로젝트의 CI/CD 파이프라인 설정 및 사용 방법을 설명합니다.

---

## 📋 목차

1. [개요](#개요)
2. [워크플로우 구조](#워크플로우-구조)
3. [GitHub 설정](#github-설정)
4. [워크플로우 상세](#워크플로우-상세)
5. [배포 설정](#배포-설정)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

### 파이프라인 흐름

```
Push/PR → Lint → Test → Security → Build → Deploy
```

### 주요 기능

- ✅ **코드 품질**: ESLint, Prettier, TypeScript 검사
- ✅ **보안 스캔**: CodeQL, Trivy, npm audit
- ✅ **자동 테스트**: Unit, Integration, E2E
- ✅ **Docker 빌드**: 멀티스테이지 + 캐싱
- ✅ **자동 배포**: 헬스체크 + 롤백
- ✅ **성능 모니터링**: Lighthouse CI
- ✅ **릴리스 자동화**: Changelog 생성

---

## 워크플로우 구조

```
.github/
├── workflows/
│   ├── test.yml          # 테스트 (Unit/Integration/E2E)
│   ├── lint.yml          # 코드 품질 검사
│   ├── security.yml      # 보안 스캔
│   ├── build.yml         # Docker 이미지 빌드
│   ├── deploy.yml        # 프로덕션 배포
│   ├── performance.yml   # 성능 모니터링
│   └── release.yml       # 릴리스 자동화
├── dependabot.yml        # 의존성 자동 업데이트
└── CODEOWNERS            # 코드 소유자
```

---

## GitHub 설정

### 1. Secrets 설정

**Repository Settings → Secrets and variables → Actions → Secrets**

| Secret 이름         | 설명                                         | 필수 |
| ------------------- | -------------------------------------------- | ---- |
| `DEPLOY_SSH_KEY`    | 배포 서버 SSH 프라이빗 키                    | ✅   |
| `DEPLOY_HOST`       | 배포 서버 호스트 (예: `192.168.1.100`)       | ✅   |
| `DEPLOY_USER`       | 배포 서버 사용자 (예: `gon`)                 | ✅   |
| `DEPLOY_PATH`       | 배포 경로 (예: `/home/gon/projects/gonsai2`) | ✅   |
| `CODECOV_TOKEN`     | Codecov 업로드 토큰                          | 선택 |
| `SLACK_WEBHOOK_URL` | Slack 알림 웹훅                              | 선택 |

### 2. Variables 설정

**Repository Settings → Secrets and variables → Actions → Variables**

| Variable 이름         | 설명               | 예시                          |
| --------------------- | ------------------ | ----------------------------- |
| `NEXT_PUBLIC_API_URL` | 프론트엔드 API URL | `https://api.example.com`     |
| `NEXT_PUBLIC_WS_URL`  | WebSocket URL      | `wss://ws.example.com`        |
| `PRODUCTION_URL`      | 프로덕션 URL       | `https://gonsai2.example.com` |
| `SLACK_WEBHOOK_URL`   | Slack 웹훅 URL     | `https://hooks.slack.com/...` |

### 3. Environments 설정

**Repository Settings → Environments**

#### Production 환경

1. **Environment name**: `production`
2. **Protection rules**:
   - ✅ Required reviewers (승인 필요)
   - ✅ Wait timer: 5분 (선택)
3. **Deployment branches**: `main` only

### 4. Branch Protection Rules

**Repository Settings → Branches → Add rule**

#### main 브랜치

```yaml
Branch name pattern: main

Protect matching branches:
  ✅ Require a pull request before merging
    ✅ Require approvals: 1
  ✅ Require status checks to pass before merging
    Required checks:
      - ESLint & TypeScript
      - Prettier Format Check
      - Unit Tests (Node 20.x)
      - Integration Tests
  ✅ Require conversation resolution before merging
  ✅ Include administrators
```

#### develop 브랜치

```yaml
Branch name pattern: develop

Protect matching branches: ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
```

---

## 워크플로우 상세

### 1. Lint (lint.yml)

**트리거**: Push/PR to `main`, `develop`, `feature/*`

**작업**:

- ESLint 실행
- Prettier 포맷 검사
- TypeScript 타입 체크 (Backend/Frontend)
- 빌드 검증
- 커밋 메시지 검사 (PR만)

**성공 조건**:

- 모든 lint 규칙 통과
- 포맷팅 검사 통과
- 타입 에러 없음

### 2. Security (security.yml)

**트리거**: Push/PR to `main`, `develop` + 주간 스케줄

**작업**:

- CodeQL 정적 분석
- npm audit (의존성 취약점)
- Trivy 파일시스템 스캔
- TruffleHog 시크릿 검출
- 라이센스 검사

**결과**: GitHub Security 탭에서 확인 가능

### 3. Build (build.yml)

**트리거**: Push/PR (apps/, package.json, Dockerfile 변경 시)

**작업**:

- Docker Buildx로 이미지 빌드
- GitHub Container Registry에 푸시
- 멀티 플랫폼 지원 (amd64/arm64)
- Trivy 이미지 스캔

**이미지 태그**:

```
ghcr.io/{owner}/{repo}/backend:{tag}
ghcr.io/{owner}/{repo}/frontend:{tag}
```

### 4. Deploy (deploy.yml)

**트리거**: Push to `main` 또는 수동 실행

**단계**:

1. Pre-deployment checks (lint, typecheck, unit tests)
2. Docker 이미지 빌드 & 푸시
3. SSH로 서버 접속
4. 이미지 Pull & 배포
5. 헬스 체크 (10회 재시도)
6. 실패 시 자동 롤백

**수동 실행**:

```
Actions → Deploy → Run workflow
  - Environment: production
  - Skip tests: false
```

### 5. Performance (performance.yml)

**트리거**: Push/PR to `main`, `develop`

**작업**:

- Lighthouse CI (성능, 접근성, SEO)
- 번들 사이즈 분석
- API 벤치마크 (k6)

**결과**: PR 코멘트로 점수 리포트

### 6. Release (release.yml)

**트리거**: `v*.*.*` 태그 푸시

**작업**:

1. 버전 검증
2. 테스트 실행
3. Docker 이미지 빌드 (버전 태그)
4. Changelog 자동 생성
5. GitHub Release 생성

**사용법**:

```bash
# 릴리스 생성
git tag v1.0.0
git push origin v1.0.0

# 또는 수동 실행
Actions → Release → Run workflow
  - Version: 1.0.0
  - Prerelease: false
```

---

## 배포 설정

### 서버 준비

#### 1. SSH 키 설정

```bash
# 로컬에서 SSH 키 생성 (배포용)
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# 서버에 공개키 추가
ssh-copy-id -i ~/.ssh/github_deploy.pub user@server

# 프라이빗 키를 GitHub Secret에 추가
cat ~/.ssh/github_deploy
# → DEPLOY_SSH_KEY에 전체 내용 복사
```

#### 2. 서버 디렉토리 구조

```bash
# 배포 경로 생성
mkdir -p /home/gon/projects/gonsai2
cd /home/gon/projects/gonsai2

# Docker Compose 파일 복사
# (초기 배포 시 필요)
```

#### 3. Docker 로그인

```bash
# GitHub Container Registry 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### 배포 환경 변수

서버의 `/home/gon/projects/gonsai2/.env`:

```bash
# Database
MONGODB_URI=mongodb://...
REDIS_HOST=localhost
REDIS_PORT=6379

# n8n Integration
N8N_API_KEY=your-api-key
N8N_BASE_URL=http://localhost:5678

# Security
JWT_SECRET=your-secret-key

# Application
NODE_ENV=production
PORT=3000
WS_PORT=3001
```

### 헬스 체크 엔드포인트

배포 후 확인되는 엔드포인트:

```
GET /api/health
→ { "status": "ok", "timestamp": "..." }
```

---

## 트러블슈팅

### 일반적인 문제

#### 1. 워크플로우가 실행되지 않음

**원인**: 트리거 조건 불일치

```yaml
# 브랜치 이름 확인
on:
  push:
    branches: [main, develop, feature/*]
```

#### 2. Docker 빌드 실패

**원인**: 캐시 문제

```bash
# 캐시 없이 재빌드
Actions → Build → Re-run jobs → Re-run all jobs
```

#### 3. 배포 헬스 체크 실패

**원인**: 서버 시작 지연

```yaml
# 대기 시간 증가
sleep 30 # → sleep 60
```

#### 4. CodeQL 분석 실패

**원인**: 메모리 부족

```yaml
# 러너 업그레이드 고려
runs-on: ubuntu-latest-4-cores
```

### 디버깅 방법

#### 워크플로우 로그 확인

```
Actions → 워크플로우 선택 → 실행 선택 → 작업 선택 → 로그 확인
```

#### 아티팩트 다운로드

```
Actions → 실행 선택 → Artifacts 섹션 → 다운로드
```

#### 수동 실행으로 테스트

```
Actions → 워크플로우 → Run workflow → 파라미터 설정
```

---

## 모니터링 대시보드

### GitHub Actions 메트릭

**Actions → Insights**

- 워크플로우 성공률
- 평균 실행 시간
- 실패 트렌드

### Security 대시보드

**Security → Overview**

- 취약점 알림
- Dependabot 알림
- CodeQL 스캔 결과

### 권장 지표

| 지표            | 목표     |
| --------------- | -------- |
| 빌드 성공률     | > 95%    |
| 테스트 커버리지 | > 70%    |
| 배포 빈도       | 주 2-3회 |
| 변경 실패율     | < 10%    |
| 평균 복구 시간  | < 1시간  |

---

## 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Docker Build 최적화](https://docs.docker.com/build/cache/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**생성일**: 2025-11-21
**버전**: 1.0.0
