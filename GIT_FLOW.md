# Git Flow 전략 가이드

gonsai2 프로젝트는 **Git Flow** 브랜치 전략을 따릅니다.

---

## 📋 브랜치 구조

### 영구 브랜치 (Permanent Branches)

#### 1. `main`

- **목적**: 프로덕션 배포용 브랜치
- **특징**: 항상 배포 가능한 안정적인 상태 유지
- **보호**: 직접 커밋 금지, Pull Request를 통해서만 병합
- **태그**: 모든 릴리스는 main에 태그 (`v1.0.0`, `v1.1.0` 등)

#### 2. `develop`

- **목적**: 다음 릴리스를 위한 개발 통합 브랜치
- **특징**: 최신 개발 코드가 통합되는 브랜치
- **보호**: 직접 커밋 금지, Pull Request를 통해서만 병합
- **병합**: feature 브랜치에서 develop으로 병합

### 임시 브랜치 (Temporary Branches)

#### 3. `feature/*`

- **목적**: 새로운 기능 개발
- **명명 규칙**: `feature/<기능명>`
- **분기**: `develop` 브랜치에서 생성
- **병합**: `develop` 브랜치로 병합 후 삭제
- **예시**:
  - `feature/user-authentication`
  - `feature/ai-agent-monitoring`
  - `feature/fix-socketio-cors`

#### 4. `release/*`

- **목적**: 릴리스 준비 (버그 수정, 문서화, 메타데이터 업데이트)
- **명명 규칙**: `release/<버전>`
- **분기**: `develop` 브랜치에서 생성
- **병합**: `main`과 `develop` 양쪽으로 병합 후 삭제
- **예시**: `release/v1.0.0`, `release/v1.1.0`

#### 5. `hotfix/*`

- **목적**: 프로덕션 긴급 버그 수정
- **명명 규칙**: `hotfix/<버전-또는-이슈>`
- **분기**: `main` 브랜치에서 생성
- **병합**: `main`과 `develop` 양쪽으로 병합 후 삭제
- **예시**: `hotfix/v1.0.1`, `hotfix/critical-auth-bug`

---

## 🔄 워크플로우

### 1. 새로운 기능 개발

```bash
# 1. develop 브랜치로 이동
git checkout develop
git pull origin develop

# 2. feature 브랜치 생성
git checkout -b feature/new-feature

# 3. 개발 작업
git add .
git commit -m "feat: 새로운 기능 구현"

# 4. 원격 저장소에 푸시
git push origin feature/new-feature

# 5. Pull Request 생성 (feature → develop)
gh pr create --base develop --head feature/new-feature

# 6. PR 병합 후 로컬 브랜치 삭제
git checkout develop
git pull origin develop
git branch -d feature/new-feature
```

### 2. 릴리스 준비

```bash
# 1. develop에서 release 브랜치 생성
git checkout develop
git checkout -b release/v1.0.0

# 2. 릴리스 준비 작업 (버전 번호 업데이트, 문서화)
git add .
git commit -m "chore: prepare release v1.0.0"

# 3. 원격 저장소에 푸시
git push origin release/v1.0.0

# 4. Pull Request 생성 (release → main)
gh pr create --base main --head release/v1.0.0

# 5. main에 병합 후 태그 생성
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 6. develop에도 병합
git checkout develop
git merge main
git push origin develop

# 7. release 브랜치 삭제
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

### 3. 긴급 수정 (Hotfix)

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git checkout -b hotfix/v1.0.1

# 2. 버그 수정
git add .
git commit -m "fix: 긴급 버그 수정"

# 3. 원격 저장소에 푸시
git push origin hotfix/v1.0.1

# 4. Pull Request 생성 (hotfix → main)
gh pr create --base main --head hotfix/v1.0.1

# 5. main에 병합 후 태그 생성
git checkout main
git pull origin main
git tag -a v1.0.1 -m "Hotfix version 1.0.1"
git push origin v1.0.1

# 6. develop에도 병합
git checkout develop
git merge main
git push origin develop

# 7. hotfix 브랜치 삭제
git branch -d hotfix/v1.0.1
git push origin --delete hotfix/v1.0.1
```

---

## 📝 커밋 메시지 규칙

### Conventional Commits 형식 사용

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류

- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 수정
- **style**: 코드 포맷팅, 세미콜론 누락 등 (기능 변경 없음)
- **refactor**: 코드 리팩토링 (기능 변경 없음)
- **test**: 테스트 추가/수정
- **chore**: 빌드 작업, 패키지 관리자 설정 등
- **perf**: 성능 개선
- **ci**: CI/CD 관련 변경
- **build**: 빌드 시스템 또는 외부 의존성 변경

### 예시

```bash
# 새로운 기능
git commit -m "feat(auth): JWT 인증 시스템 구현"

# 버그 수정
git commit -m "fix(socketio): Private Network Access CORS 오류 해결"

# 문서 업데이트
git commit -m "docs: Git Flow 가이드 추가"

# 리팩토링
git commit -m "refactor(api): REST API 구조 개선"

# 성능 개선
git commit -m "perf(db): MongoDB 쿼리 최적화"
```

---

## 🔒 브랜치 보호 규칙

### `main` 브랜치 보호

- ✅ Pull Request를 통해서만 병합 허용
- ✅ 최소 1명의 리뷰 승인 필요
- ✅ Status check 통과 필수 (CI/CD)
- ✅ 관리자도 보호 규칙 적용
- ❌ Force push 금지
- ❌ 브랜치 삭제 금지

### `develop` 브랜치 보호

- ✅ Pull Request를 통해서만 병합 허용
- ✅ Status check 통과 필수 (CI/CD)
- ❌ Force push 금지
- ❌ 브랜치 삭제 금지

---

## 🎯 Pull Request 가이드

### PR 제목

```
<type>: <간단한 설명>
```

예시:

- `feat: AI 에이전트 모니터링 기능 추가`
- `fix: Socket.IO CORS 오류 해결`
- `refactor: 데이터베이스 연결 로직 개선`

### PR 설명 템플릿

```markdown
## 변경사항

- 주요 변경 내용 1
- 주요 변경 내용 2

## 근본 원인 (버그 수정인 경우)

문제의 근본 원인 설명

## 해결 방법

어떻게 해결했는지 설명

## 테스트

- [ ] 로컬 테스트 완료
- [ ] 브라우저 테스트 완료
- [ ] 단위 테스트 추가/업데이트

## 관련 이슈

Closes #<이슈번호>

## 스크린샷 (UI 변경인 경우)

스크린샷 첨부
```

---

## 📊 버전 관리

### Semantic Versioning (SemVer)

`MAJOR.MINOR.PATCH` 형식 사용

- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

예시:

- `v1.0.0` - 첫 번째 정식 릴리스
- `v1.1.0` - 새로운 기능 추가
- `v1.1.1` - 버그 수정

### Pre-release 버전

- `v1.0.0-alpha.1` - 알파 버전
- `v1.0.0-beta.1` - 베타 버전
- `v1.0.0-rc.1` - Release Candidate

---

## 🛠️ 유용한 Git 명령어

### 브랜치 관리

```bash
# 로컬 브랜치 목록
git branch

# 원격 브랜치 포함 목록
git branch -a

# 브랜치 삭제
git branch -d <branch-name>

# 원격 브랜치 삭제
git push origin --delete <branch-name>

# 브랜치 이름 변경
git branch -m <old-name> <new-name>
```

### 원격 저장소 동기화

```bash
# 최신 변경사항 가져오기
git pull origin <branch-name>

# 원격 브랜치 정보 업데이트
git fetch --all --prune

# 병합된 브랜치 삭제
git branch --merged | grep -v '\*' | xargs -n 1 git branch -d
```

### 커밋 되돌리기

```bash
# 마지막 커밋 취소 (변경사항 유지)
git reset --soft HEAD~1

# 마지막 커밋 취소 (변경사항 버림)
git reset --hard HEAD~1

# 특정 커밋으로 되돌리기
git revert <commit-hash>
```

---

## 🚀 CI/CD 통합

### GitHub Actions

모든 브랜치에 푸시 시 자동으로 실행:

- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests
- ✅ Build test

`main` 브랜치 병합 시 추가 실행:

- 🚀 자동 배포 (프로덕션)
- 📦 Docker 이미지 빌드
- 🏷️ Git 태그 생성

---

## 📚 참고 자료

- [Git Flow 원문](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Flow vs Git Flow](https://lucamezzalira.com/2014/03/10/git-flow-vs-github-flow/)

---

**최종 업데이트**: 2025-11-13
**작성자**: Claude Code
