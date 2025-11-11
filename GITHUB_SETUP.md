# GitHub 저장소 연동 가이드

이 문서는 gonsai2 프로젝트를 GitHub와 연동하는 방법을 설명합니다.

## 📋 목차

1. [GitHub 저장소 생성](#1-github-저장소-생성)
2. [브랜치 보호 규칙 설정](#2-브랜치-보호-규칙-설정)
3. [GitHub Actions Secrets 설정](#3-github-actions-secrets-설정)
4. [로컬 저장소 연동](#4-로컬-저장소-연동)
5. [초기 커밋 및 푸시](#5-초기-커밋-및-푸시)

---

## 1. GitHub 저장소 생성

### 옵션 A: GitHub CLI 사용 (권장)

```bash
# GitHub CLI 설치 확인
gh --version

# GitHub 로그인 (아직 안 했다면)
gh auth login

# 저장소 생성 (private)
gh repo create gonsai2 \
  --private \
  --description "AI-Optimized Project with n8n and MongoDB integration" \
  --add-readme=false

# 또는 public으로 생성
gh repo create gonsai2 \
  --public \
  --description "AI-Optimized Project with n8n and MongoDB integration" \
  --add-readme=false
```

### 옵션 B: GitHub 웹 인터페이스 사용

1. https://github.com/new 방문
2. Repository name: `gonsai2`
3. Description: `AI-Optimized Project with n8n and MongoDB integration`
4. Visibility: Private 또는 Public 선택
5. **중요**: "Initialize this repository with a README" 체크 해제
6. "Create repository" 클릭

---

## 2. 브랜치 보호 규칙 설정

### GitHub CLI로 설정

```bash
# main 브랜치 보호 규칙 활성화
gh api repos/:owner/gonsai2/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["build","test"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}' \
  --field restrictions=null
```

### GitHub 웹 인터페이스로 설정

1. 저장소 페이지 → **Settings** 탭
2. 왼쪽 메뉴 → **Branches**
3. "Branch protection rules" → **Add rule**

#### 권장 설정:

**Branch name pattern**: `main`

**Protect matching branches** 섹션:
- ✅ **Require a pull request before merging**
  - Required approvals: 1
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks: `build`, `test`, `lint`

- ✅ **Require conversation resolution before merging**

- ✅ **Require linear history**

- ✅ **Include administrators** (선택사항)

4. **Create** 버튼 클릭

---

## 3. GitHub Actions Secrets 설정

민감한 환경 변수를 GitHub Actions에서 사용하기 위해 Secrets를 설정합니다.

### GitHub CLI로 설정

```bash
# Secret 추가 (예시)
gh secret set N8N_API_KEY --body "your-n8n-api-key"
gh secret set MONGODB_PASSWORD --body "your-mongodb-password"
gh secret set JWT_SECRET --body "your-jwt-secret"
```

### GitHub 웹 인터페이스로 설정

1. 저장소 페이지 → **Settings** 탭
2. 왼쪽 메뉴 → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭

#### 필수 Secrets:

| Secret Name | Description | 값 가져오는 방법 |
|------------|-------------|---------------|
| `N8N_API_KEY` | n8n API 인증 키 | n8n UI → Settings → API → Create new API key |
| `MONGODB_PASSWORD` | MongoDB superadmin 비밀번호 | `/home/gon/docker-mongo-ubuntu/.env` 파일 참조 |
| `JWT_SECRET` | JWT 토큰 시크릿 | `openssl rand -base64 32` 명령으로 생성 |
| `ANTHROPIC_API_KEY` | Claude API 키 (선택) | Anthropic Console에서 발급 |
| `OPENAI_API_KEY` | OpenAI API 키 (선택) | OpenAI Platform에서 발급 |

#### Secret 추가 방법:

각 Secret에 대해:
1. "Name" 입력 (예: `N8N_API_KEY`)
2. "Secret" 입력 (실제 값)
3. **Add secret** 클릭

---

## 4. 로컬 저장소 연동

### 원격 저장소 추가

```bash
# GitHub 사용자 이름 확인
GITHUB_USER=$(gh api user -q .login)

# 원격 저장소 추가
git remote add origin https://github.com/$GITHUB_USER/gonsai2.git

# 또는 SSH 사용 (권장)
git remote add origin git@github.com:$GITHUB_USER/gonsai2.git

# 원격 저장소 확인
git remote -v
```

출력 예시:
```
origin  git@github.com:yourusername/gonsai2.git (fetch)
origin  git@github.com:yourusername/gonsai2.git (push)
```

---

## 5. 초기 커밋 및 푸시

### 파일 스테이징 및 커밋

```bash
# 모든 파일 추가
git add .

# 초기 커밋
git commit -m "feat: initial project setup with AI-optimized structure

- Add .gitignore for Node.js and Docker
- Add .env.example with all required environment variables
- Add comprehensive README.md with Docker integration guide
- Add docker-compose.override.yml for existing service integration
- Add GitHub setup guide for repository configuration

Follows Kent Beck's Augmented Coding principles for AI collaboration."

# main 브랜치로 푸시
git push -u origin main
```

### 푸시 확인

```bash
# 저장소 브라우저에서 열기
gh repo view --web
```

---

## 📦 GitHub Actions 워크플로우 설정

### CI/CD 파이프라인 생성

`.github/workflows/ci.yml` 파일을 생성하여 자동화된 테스트와 빌드를 설정합니다:

```bash
# 디렉토리 생성
mkdir -p .github/workflows

# CI 워크플로우 파일 생성
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm test
        env:
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
          MONGODB_PASSWORD: ${{ secrets.MONGODB_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == '20.x'
EOF

# 커밋 및 푸시
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for automated testing"
git push
```

---

## 🔒 보안 체크리스트

초기 설정 완료 후 다음 사항을 확인하세요:

### ✅ 로컬 환경

- [ ] `.env` 파일 생성됨 (`.env.example` 복사)
- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 민감한 정보가 커밋되지 않았는지 확인

```bash
# 민감한 정보 검색
git log --all --full-history -- '*.env'

# 결과가 없어야 함 (빈 출력)
```

### ✅ GitHub 저장소

- [ ] 브랜치 보호 규칙 활성화 (main)
- [ ] Required reviewers 설정
- [ ] Status checks 활성화
- [ ] Secrets 등록 완료
- [ ] `.env.example`만 커밋됨 (`.env` 제외)

### ✅ GitHub Actions

- [ ] CI 워크플로우 추가
- [ ] Secrets 참조 설정
- [ ] 첫 빌드 성공 확인

```bash
# 최근 워크플로우 실행 확인
gh run list --limit 5
```

---

## 🚀 다음 단계

1. **팀원 초대** (협업 시)
   ```bash
   gh repo invite <username> --role admin
   ```

2. **Issue 템플릿 추가**
   ```bash
   mkdir -p .github/ISSUE_TEMPLATE
   # 템플릿 파일 생성 (bug_report.md, feature_request.md 등)
   ```

3. **Pull Request 템플릿 추가**
   ```bash
   cat > .github/pull_request_template.md << 'EOF'
   ## 변경 사항
   <!-- 이 PR에서 변경한 내용을 설명하세요 -->

   ## 관련 이슈
   <!-- Closes #이슈번호 -->

   ## 테스트
   <!-- 테스트 방법을 설명하세요 -->

   ## 체크리스트
   - [ ] 코드 린트 통과
   - [ ] 테스트 추가/수정
   - [ ] 문서 업데이트
   EOF
   ```

4. **Code Owners 설정**
   ```bash
   cat > .github/CODEOWNERS << 'EOF'
   # 코드 소유자 설정
   * @yourusername

   # 특정 디렉토리
   /docs/ @yourusername
   /packages/core/ @yourusername
   EOF
   ```

---

## 🆘 문제 해결

### 푸시가 거부되는 경우

```bash
# 강제 푸시 (주의: 초기 설정 시에만 사용)
git push -f origin main

# 또는 풀 후 푸시
git pull origin main --rebase
git push origin main
```

### 원격 저장소 URL 변경

```bash
# 현재 원격 저장소 확인
git remote -v

# 원격 저장소 URL 변경
git remote set-url origin git@github.com:username/gonsai2.git
```

### GitHub CLI 인증 문제

```bash
# 재인증
gh auth login

# 인증 상태 확인
gh auth status
```

---

## 📚 참고 자료

- [GitHub Docs - Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Manual](https://cli.github.com/manual/)

---

**완료!** 🎉

이제 gonsai2 프로젝트가 GitHub와 성공적으로 연동되었습니다.

다음 작업:
1. 개발 브랜치 생성: `git checkout -b develop`
2. 기능 개발 시작
3. Pull Request 생성 및 코드 리뷰

```bash
# 개발 브랜치 생성 및 전환
git checkout -b develop

# GitHub에 푸시
git push -u origin develop
```
