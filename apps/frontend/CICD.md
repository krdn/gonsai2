# CI/CD 파이프라인 가이드

n8n 통합을 포함한 CI/CD 파이프라인 설정 및 사용 가이드입니다.

## 📋 목차

- [워크플로우 개요](#워크플로우-개요)
- [GitHub Secrets 설정](#github-secrets-설정)
- [워크플로우 사용 방법](#워크플로우-사용-방법)
- [문제 해결](#문제-해결)

---

## 워크플로우 개요

### 1. CI Pipeline ([ci.yml](.github/workflows/ci.yml))

**트리거**: Push/PR to `main` or `develop` 브랜치

**작업 흐름**:
1. **코드 품질 검사**: ESLint, TypeScript, Tests
2. **n8n 컨테이너 연결 테스트**: n8n, PostgreSQL, Redis 연결 확인
3. **API 통합 테스트**: n8n API 엔드포인트 테스트
4. **워크플로우 실행 테스트**: 테스트 워크플로우 생성 및 실행
5. **빌드 테스트**: Next.js 애플리케이션 빌드

**주요 기능**:
- n8n 서비스와의 완전한 통합 테스트
- 자동화된 워크플로우 실행 검증
- 데이터베이스 및 큐 연결 테스트

### 2. Deploy Pipeline ([cd.yml](.github/workflows/cd.yml))

**트리거**:
- Push to `main` 브랜치 (자동 배포)
- Manual dispatch (환경 선택 가능)

**작업 흐름**:
1. **도커 이미지 빌드**: GitHub Container Registry에 푸시
2. **통합 테스트**: n8n과의 연동 확인
3. **배포 준비**: docker-compose 매니페스트 생성
4. **배포 실행**: SSH를 통한 서버 배포
5. **헬스 체크**: 배포 후 상태 확인
6. **롤백**: 실패 시 자동 롤백

**주요 기능**:
- 기존 n8n 컨테이너와 네트워크 공유
- 자동 백업 및 롤백 전략
- 배포 후 자동 헬스 체크

### 3. n8n Health Check ([n8n-health.yml](.github/workflows/n8n-health.yml))

**트리거**:
- 5분마다 자동 실행
- Manual dispatch

**작업 흐름**:
1. **n8n API 상태 확인**: 헬스 엔드포인트 및 API 엔드포인트
2. **워크플로우 상태 검증**: 활성 워크플로우 및 실패한 실행 확인
3. **데이터베이스 연결 확인**: PostgreSQL, Redis 연결
4. **디스크 사용량 확인**: 서버 디스크 사용률 모니터링
5. **메모리 사용량 확인**: 서버 및 Docker 컨테이너 메모리 모니터링
6. **오류 자동 수정**: 감지된 문제 자동 해결

**자동 수정 기능**:
- n8n 서비스 재시작
- 데이터베이스 재시작
- 디스크 공간 정리
- 메모리 최적화

### 4. Auto Fix Errors ([auto-fix.yml](.github/workflows/auto-fix.yml))

**트리거**:
- 매일 새벽 3시 (UTC)
- Manual dispatch
- Issue 생성/라벨링 시

**작업 흐름**:
1. **오류 로그 분석**: ESLint, TypeScript, Test, Dependency 오류 감지
2. **ESLint 자동 수정**: `--fix` 플래그로 자동 수정
3. **TypeScript 오류 분석**: 수정 가능 여부 판단, 이슈 생성
4. **의존성 취약점 수정**: `npm audit fix` 실행, PR 생성
5. **테스트 실패 분석**: 실패한 테스트 분석, 이슈 생성
6. **자동 병합**: 모든 테스트 통과 시 PR 자동 병합

**주요 기능**:
- 자동 코드 수정 및 커밋
- 보안 취약점 자동 업데이트
- 수정 결과 PR 자동 생성

---

## GitHub Secrets 설정

### 필수 Secrets

GitHub 리포지토리 설정에서 다음 Secrets를 추가해야 합니다:

**Settings → Secrets and variables → Actions → New repository secret**

#### 1. n8n 관련

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `N8N_ENCRYPTION_KEY` | n8n 암호화 키 (기존 n8n 설정에서 가져오기) | `a1b2c3d4e5f6...` |
| `NEXT_PUBLIC_N8N_URL` | n8n 접속 URL | `https://n8n.yourdomain.com` |
| `N8N_API_KEY` | n8n API 키 (선택사항) | `n8n_api_...` |

#### 2. 데이터베이스 관련

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `POSTGRES_USER` | PostgreSQL 사용자명 | `n8n` |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `secure_password` |
| `POSTGRES_DB` | PostgreSQL 데이터베이스명 | `n8n` |
| `POSTGRES_HOST` | PostgreSQL 호스트 (옵션) | `localhost` or `postgres.example.com` |
| `N8N_DB_TYPE` | 데이터베이스 타입 | `postgresdb` or `sqlite` |
| `REDIS_HOST` | Redis 호스트 (옵션) | `localhost` or `redis.example.com` |

#### 3. 배포 관련

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `DEPLOY_HOST` | 배포 대상 서버 호스트 | `your-server.com` |
| `DEPLOY_USER` | SSH 사용자명 | `ubuntu` or `deploy` |
| `DEPLOY_SSH_KEY` | SSH 개인키 (전체 내용) | `-----BEGIN RSA PRIVATE KEY-----\n...` |
| `DEPLOY_PORT` | SSH 포트 (옵션, 기본값: 22) | `22` or `2222` |

#### 4. 애플리케이션 환경 변수

| Secret 이름 | 설명 | 예시 |
|-------------|------|------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io 서버 URL | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `wss://api.yourdomain.com` |
| `APP_URL` | 프론트엔드 애플리케이션 URL | `https://app.yourdomain.com` |

---

## Secrets 설정 단계별 가이드

### 1. n8n Encryption Key 가져오기

기존 n8n 서버에서:

```bash
# docker-compose 환경 변수 확인
cd ~/docker-n8n
cat .env | grep N8N_ENCRYPTION_KEY

# 또는 컨테이너에서 직접 확인
docker-compose exec n8n env | grep N8N_ENCRYPTION_KEY
```

⚠️ **주의**: 이 키는 절대 변경하면 안 됩니다. 모든 자격 증명이 이 키로 암호화되어 있습니다.

### 2. SSH 키 생성 및 설정

배포 자동화를 위한 SSH 키 생성:

```bash
# 로컬에서 SSH 키 생성 (비밀번호 없이)
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github-actions-deploy -N ""

# 개인키 내용 복사 (GitHub Secret으로 사용)
cat ~/.ssh/github-actions-deploy

# 공개키를 서버에 추가
ssh-copy-id -i ~/.ssh/github-actions-deploy.pub user@your-server.com

# 또는 수동으로 추가
cat ~/.ssh/github-actions-deploy.pub
# → 서버의 ~/.ssh/authorized_keys에 붙여넣기
```

GitHub Secret에 등록:
- Secret 이름: `DEPLOY_SSH_KEY`
- Value: `cat ~/.ssh/github-actions-deploy` 출력 전체 (-----BEGIN RSA PRIVATE KEY----- 부터 -----END RSA PRIVATE KEY----- 까지)

### 3. n8n API 키 생성 (선택사항)

n8n UI에서:
1. Settings → API
2. "Create API Key" 클릭
3. 생성된 키를 `N8N_API_KEY` Secret으로 추가

### 4. PostgreSQL 정보 확인

기존 n8n 서버에서:

```bash
cd ~/docker-n8n
cat .env | grep POSTGRES
```

### 5. GitHub에 Secrets 추가

1. GitHub 리포지토리 페이지로 이동
2. **Settings** 탭 클릭
3. **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 버튼 클릭
5. Secret 이름과 값 입력
6. **Add secret** 버튼 클릭

---

## 워크플로우 사용 방법

### CI 파이프라인 실행

**자동 실행**:
- `main` 또는 `develop` 브랜치에 push
- Pull Request 생성

**확인 방법**:
```bash
# GitHub Actions 페이지에서 확인
# https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

### 배포 파이프라인 실행

**자동 배포**:
```bash
git checkout main
git merge develop
git push origin main
# → 자동으로 production 배포 시작
```

**수동 배포**:
1. GitHub Actions 페이지로 이동
2. "Deploy" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 환경 선택 (production/staging)
5. "Run workflow" 확인

### n8n Health Check 실행

**자동 실행**: 5분마다 자동 실행

**수동 실행**:
1. GitHub Actions 페이지로 이동
2. "n8n Health Check" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. Auto-fix 옵션 선택 (true/false)
5. "Run workflow" 확인

### Auto Fix 워크플로우 실행

**자동 실행**: 매일 새벽 3시 (UTC)

**수동 실행**:
1. GitHub Actions 페이지로 이동
2. "Auto Fix Errors" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 수정할 오류 타입 선택 (all/eslint/typescript/test/dependency)
5. "Run workflow" 확인

---

## 배포 프로세스 상세

### 1. 서버 준비

배포 대상 서버에서 다음 준비 작업 수행:

```bash
# Docker 및 Docker Compose 설치 확인
docker --version
docker-compose --version

# n8n 네트워크 생성 (아직 없는 경우)
docker network create n8n-network

# n8n 컨테이너가 이 네트워크를 사용하도록 설정
cd ~/docker-n8n
# docker-compose.yml에 다음 추가:
# networks:
#   default:
#     name: n8n-network
#     external: true

# n8n 재시작
docker-compose up -d
```

### 2. 첫 배포 실행

```bash
# 로컬에서
git checkout main
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions에서 자동 배포 실행
# 또는 수동으로 "Run workflow" 클릭
```

### 3. 배포 확인

```bash
# 서버에서
cd ~/gonsai2-frontend
docker-compose ps

# 로그 확인
docker-compose logs -f frontend

# 헬스 체크
curl http://localhost:3000/api/health

# n8n 연동 확인
docker exec gonsai2-frontend curl -f http://n8n:5678/healthz
```

---

## 문제 해결

### CI 파이프라인 실패

#### 1. n8n 컨테이너 연결 실패

**증상**: "n8n API connection failed"

**해결 방법**:
```bash
# N8N_ENCRYPTION_KEY Secret 확인
# GitHub Settings → Secrets에서 올바르게 설정되었는지 확인

# n8n 서비스 헬스 체크 대기 시간 증가
# ci.yml에서 timeout 값을 60에서 120으로 증가
```

#### 2. TypeScript 오류

**증상**: "TypeScript check failed"

**해결 방법**:
```bash
# 로컬에서 타입 체크
npm run type-check

# 오류 수정 후 커밋
git add .
git commit -m "fix: resolve TypeScript errors"
git push
```

#### 3. 테스트 실패

**증상**: "Test failures detected"

**해결 방법**:
```bash
# 로컬에서 테스트 실행
npm run test

# 실패한 테스트 확인 및 수정
npm run test -- --verbose

# 수정 후 커밋
git add .
git commit -m "fix: resolve test failures"
git push
```

### 배포 파이프라인 실패

#### 1. SSH 연결 실패

**증상**: "Permission denied (publickey)"

**해결 방법**:
```bash
# SSH 키 확인
ssh -i ~/.ssh/github-actions-deploy user@your-server.com

# authorized_keys 확인
cat ~/.ssh/authorized_keys | grep github-actions

# GitHub Secret 재확인
# DEPLOY_SSH_KEY에 개인키 전체가 올바르게 입력되었는지 확인
```

#### 2. Docker 이미지 빌드 실패

**증상**: "Build and push Docker image failed"

**해결 방법**:
```bash
# Dockerfile 확인
cat Dockerfile

# 로컬에서 빌드 테스트
docker build -t test-frontend .

# 빌드 아규먼트 확인
# cd.yml의 build-args 섹션 확인
```

#### 3. 헬스 체크 실패

**증상**: "Health check failed"

**해결 방법**:
```bash
# 서버에서 헬스 엔드포인트 확인
curl http://localhost:3000/api/health

# 컨테이너 로그 확인
docker-compose logs frontend

# n8n 연결 확인
docker exec gonsai2-frontend curl http://n8n:5678/healthz

# 네트워크 확인
docker network inspect n8n-network
```

#### 4. 롤백 실패

**증상**: "Rollback failed - no backup found"

**해결 방법**:
- 첫 배포인 경우 백업이 없는 것이 정상
- 수동으로 이전 버전 배포:

```bash
# 서버에서
cd ~/gonsai2-frontend
docker-compose down

# 이전 이미지로 변경
# docker-compose.yml의 image 태그를 이전 버전으로 수정

docker-compose up -d
```

### n8n Health Check 실패

#### 1. n8n API 응답 없음

**증상**: "n8n API is unhealthy"

**해결 방법**:
```bash
# 서버에서 n8n 상태 확인
cd ~/docker-n8n
docker-compose ps

# n8n 로그 확인
docker-compose logs n8n

# n8n 재시작
docker-compose restart n8n
```

#### 2. 데이터베이스 연결 실패

**증상**: "PostgreSQL connection failed"

**해결 방법**:
```bash
# PostgreSQL 상태 확인
docker-compose exec postgres pg_isready -U n8n

# PostgreSQL 재시작
docker-compose restart postgres

# 데이터베이스 연결 정보 확인
cat .env | grep POSTGRES
```

#### 3. 디스크 사용량 경고

**증상**: "Critical: Disk usage above 90%"

**해결 방법**:
```bash
# 디스크 사용량 확인
df -h

# Docker 정리
docker system prune -af --volumes

# 오래된 백업 정리
find ~/docker-n8n/backup -name "*.tar.gz" -mtime +30 -delete

# 로그 정리
find ~/docker-n8n/logs -mtime +7 -delete
```

### Auto Fix 워크플로우 문제

#### 1. ESLint 자동 수정 실패

**증상**: "ESLint auto-fix failed"

**해결 방법**:
```bash
# 로컬에서 ESLint 실행
npm run lint -- --fix

# 수동으로 수정이 필요한 오류 확인
npm run lint

# 수정 후 커밋
git add .
git commit -m "fix: resolve ESLint errors"
git push
```

#### 2. 의존성 업데이트 실패

**증상**: "npm audit fix failed"

**해결 방법**:
```bash
# 로컬에서 취약점 확인
npm audit

# 수동으로 주요 버전 업데이트
npm audit fix --force

# package-lock.json 확인
git diff package-lock.json

# 빌드 테스트
npm run build

# 커밋
git add package-lock.json
git commit -m "fix: update dependencies to fix vulnerabilities"
git push
```

---

## 모니터링 및 알림

### GitHub Actions 상태 확인

```bash
# GitHub CLI 사용
gh run list

# 특정 워크플로우 상태 확인
gh run list --workflow=ci.yml

# 실패한 워크플로우 재실행
gh run rerun <run-id>
```

### 배포 상태 모니터링

1. GitHub Actions 페이지에서 실시간 로그 확인
2. 워크플로우 Summary 확인
3. 서버에서 직접 확인:

```bash
# 컨테이너 상태
docker ps

# 애플리케이션 로그
docker-compose logs -f frontend

# n8n 연동 상태
curl http://localhost:3000/api/health
```

### 알림 설정 (선택사항)

GitHub에서 알림 설정:
1. Watch → Custom → Actions 체크
2. 실패한 워크플로우에 대한 이메일 알림 받기

Slack 통합 (선택사항):
- Slack Webhook URL을 Secret으로 추가
- 워크플로우에 Slack 알림 step 추가

---

## 보안 고려사항

### 1. Secrets 관리

- ✅ **절대 Secrets를 코드에 하드코딩하지 마세요**
- ✅ **정기적으로 SSH 키 로테이션**
- ✅ **최소 권한 원칙 적용**
- ✅ **개발/스테이징/프로덕션 환경 분리**

### 2. SSH 키 보안

```bash
# SSH 키 권한 설정
chmod 600 ~/.ssh/github-actions-deploy
chmod 644 ~/.ssh/github-actions-deploy.pub

# 서버에서 authorized_keys 권한
chmod 600 ~/.ssh/authorized_keys
```

### 3. Docker 이미지 보안

- ✅ **최신 베이스 이미지 사용**
- ✅ **정기적인 취약점 스캔**
- ✅ **비밀 정보를 이미지에 포함하지 않기**

---

## 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Docker Compose 문서](https://docs.docker.com/compose/)
- [n8n 문서](https://docs.n8n.io/)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)

---

## 문의 및 지원

문제가 발생하거나 추가 도움이 필요한 경우:

1. **GitHub Issues**: 버그 리포트 및 기능 요청
2. **GitHub Discussions**: 질문 및 토론
3. **워크플로우 로그**: 상세한 오류 정보 확인

---

**마지막 업데이트**: 2024-10-19
