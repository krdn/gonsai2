# Contribution Guide

이 프로젝트에 기여해주셔서 감사합니다! 이 가이드는 프로젝트 기여 방법과 개발 워크플로우를 설명합니다.

## 목차

- [시작하기](#시작하기)
- [개발 환경 설정](#개발-환경-설정)
- [코드 스타일 가이드](#코드-스타일-가이드)
- [Git 워크플로우](#git-워크플로우)
- [Pull Request 가이드라인](#pull-request-가이드라인)
- [이슈 리포팅](#이슈-리포팅)
- [코드 리뷰 프로세스](#코드-리뷰-프로세스)
- [커뮤니티 가이드라인](#커뮤니티-가이드라인)

---

## 시작하기

### 기여 방법

다음과 같은 방법으로 프로젝트에 기여할 수 있습니다:

- 🐛 **버그 리포트**: 발견한 버그를 이슈로 등록
- 💡 **기능 제안**: 새로운 기능이나 개선 사항 제안
- 📝 **문서 개선**: 문서 오타 수정, 예제 추가, 설명 개선
- 🔧 **코드 기여**: 버그 수정, 기능 구현, 성능 개선
- ✅ **코드 리뷰**: Pull Request 리뷰 및 피드백

### 기여 전 확인사항

1. **이슈 확인**: 작업하려는 내용이 이미 이슈로 등록되어 있는지 확인
2. **중복 방지**: 이미 진행 중인 작업이 있는지 확인
3. **논의**: 큰 변경사항은 먼저 이슈에서 논의
4. **테스트**: 모든 변경사항에 대한 테스트 작성

---

## 개발 환경 설정

### 필수 도구

- **Node.js**: v20.x 이상
- **npm**: v10.x 이상
- **Git**: v2.x 이상

### 저장소 클론

```bash
# 저장소 포크
# GitHub에서 "Fork" 버튼 클릭

# 포크한 저장소 클론
git clone https://github.com/YOUR_USERNAME/gonsai2.git
cd gonsai2/apps/frontend

# Upstream 원격 저장소 추가
git remote add upstream https://github.com/ORIGINAL_OWNER/gonsai2.git
```

### 의존성 설치

```bash
# 패키지 설치
npm install

# 환경 변수 설정
cp .env.example .env.local

# .env.local 파일 편집
# NEXT_PUBLIC_N8N_API_URL=your-n8n-api-url
# NEXT_PUBLIC_N8N_API_KEY=your-api-key
```

### 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev

# 브라우저에서 http://localhost:3000 접속
```

### 테스트 실행

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:coverage
```

---

## 코드 스타일 가이드

### TypeScript 규칙

#### 명명 규칙

```typescript
// ✅ 좋은 예
// PascalCase for types, interfaces, classes
interface UserProfile {
  id: string;
  name: string;
}

class WorkflowService {
  // ...
}

// camelCase for variables, functions
const userProfile = getUserProfile();

function executeWorkflow(id: string) {
  // ...
}

// UPPER_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// ❌ 나쁜 예
interface user_profile {
  // PascalCase 사용
  ID: string; // camelCase 사용
}

const UserProfile = {}; // camelCase 사용
function ExecuteWorkflow() {} // camelCase 사용
const max_retry = 3; // UPPER_SNAKE_CASE 사용
```

#### 타입 정의

```typescript
// ✅ 좋은 예
// 명시적 반환 타입
function getWorkflow(id: string): Promise<Workflow> {
  return n8nClient.getWorkflow(id);
}

// 제네릭 타입 활용
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then((res) => res.json());
}

// Union 타입으로 가능한 값 제한
type Status = 'idle' | 'loading' | 'success' | 'error';

// ❌ 나쁜 예
// any 사용 지양
function processData(data: any) {
  return data;
}

// 암묵적 any
function getData(url) {
  return fetch(url).then((res) => res.json());
}
```

#### 코드 구조

```typescript
// ✅ 좋은 예
// 명확한 함수 분리
export async function executeWorkflow(id: string): Promise<Execution> {
  const workflow = await validateWorkflow(id);
  const execution = await startExecution(workflow);
  await notifySuccess(execution);
  return execution;
}

function validateWorkflow(id: string): Promise<Workflow> {
  // 유효성 검사 로직
}

function startExecution(workflow: Workflow): Promise<Execution> {
  // 실행 시작 로직
}

function notifySuccess(execution: Execution): Promise<void> {
  // 알림 로직
}

// ❌ 나쁜 예
// 너무 긴 함수
export async function executeWorkflow(id: string): Promise<Execution> {
  // 100줄 이상의 로직
  // 유효성 검사, 실행, 알림이 모두 하나의 함수에
}
```

### React 컴포넌트 규칙

#### 컴포넌트 구조

```typescript
// ✅ 좋은 예
import { useState, useEffect } from 'react';

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: (id: string) => void;
}

/**
 * 워크플로우 카드 컴포넌트
 *
 * @param workflow - 표시할 워크플로우
 * @param onExecute - 실행 버튼 클릭 핸들러
 */
export function WorkflowCard({ workflow, onExecute }: WorkflowCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleExecute = () => {
    onExecute(workflow.id);
  };

  return (
    <div
      className="workflow-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3>{workflow.name}</h3>
      <button onClick={handleExecute}>실행</button>
    </div>
  );
}

// ❌ 나쁜 예
// Props 타입 정의 없음, JSDoc 없음
export function WorkflowCard({ workflow, onExecute }) {
  return (
    <div onClick={() => onExecute(workflow.id)}>
      {workflow.name}
    </div>
  );
}
```

#### Hooks 사용

```typescript
// ✅ 좋은 예
// Custom hook 분리
function useWorkflowExecution(id: string) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);

  const execute = async () => {
    setStatus('loading');
    setError(null);

    try {
      await executeWorkflow(id);
      setStatus('success');
    } catch (err) {
      setError(err as Error);
      setStatus('error');
    }
  };

  return { status, error, execute };
}

// 컴포넌트에서 사용
export function WorkflowDetail({ id }: { id: string }) {
  const { status, error, execute } = useWorkflowExecution(id);

  return (
    <div>
      <button onClick={execute} disabled={status === 'loading'}>
        {status === 'loading' ? '실행 중...' : '실행'}
      </button>
      {error && <ErrorMessage error={error} />}
    </div>
  );
}

// ❌ 나쁜 예
// 컴포넌트 안에 모든 로직
export function WorkflowDetail({ id }: { id: string }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const execute = async () => {
    // 긴 실행 로직
  };

  return (
    // JSX
  );
}
```

### CSS/Tailwind 규칙

```typescript
// ✅ 좋은 예
// Tailwind utility classes 사용
export function Button({ children, variant = 'primary' }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
}

// ❌ 나쁜 예
// 인라인 스타일 사용
export function Button({ children }) {
  return (
    <button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
      {children}
    </button>
  );
}
```

### ESLint 및 Prettier

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/recommended", "prettier"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error"
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

```bash
# 코드 린팅
npm run lint

# 자동 수정
npm run lint:fix

# Prettier 적용
npm run format
```

---

## Git 워크플로우

### 브랜치 전략

프로젝트는 **Git Flow** 전략을 사용합니다:

- `main`: 프로덕션 배포 브랜치
- `develop`: 개발 통합 브랜치
- `feature/*`: 기능 개발 브랜치
- `bugfix/*`: 버그 수정 브랜치
- `hotfix/*`: 긴급 수정 브랜치

### 브랜치 생성

```bash
# 최신 develop 브랜치 가져오기
git checkout develop
git pull upstream develop

# 기능 브랜치 생성
git checkout -b feature/add-workflow-export

# 버그 수정 브랜치
git checkout -b bugfix/fix-execution-status

# 핫픽스 브랜치
git checkout -b hotfix/fix-critical-error
```

### 커밋 메시지 규칙

**Conventional Commits** 형식을 따릅니다:

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 타입 (Type)

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 파일 수정

#### 예시

```bash
# 좋은 예
git commit -m "feat(workflows): Add export to JSON functionality"

git commit -m "fix(api): Handle rate limit errors correctly

- Add exponential backoff retry logic
- Display user-friendly error messages
- Update API error handler

Closes #123"

git commit -m "docs(readme): Update installation instructions"

# 나쁜 예
git commit -m "update"
git commit -m "fix bug"
git commit -m "added some features"
```

### 커밋 작성 팁

1. **제목은 50자 이내**: 간결하고 명확하게
2. **명령형 사용**: "Added" 대신 "Add" 사용
3. **본문은 72자에서 줄바꿈**: 가독성 향상
4. **What과 Why**: 무엇을 왜 변경했는지 설명
5. **이슈 참조**: `Closes #123`, `Fixes #456`

---

## Pull Request 가이드라인

### PR 생성 전 체크리스트

- [ ] 최신 `develop` 브랜치와 동기화
- [ ] 모든 테스트 통과
- [ ] 린트 에러 없음
- [ ] 타입 체크 통과
- [ ] 관련 문서 업데이트
- [ ] 변경사항에 대한 테스트 추가

### PR 생성

```bash
# 변경사항 커밋
git add .
git commit -m "feat(workflows): Add export functionality"

# 원격 저장소에 푸시
git push origin feature/add-workflow-export

# GitHub에서 Pull Request 생성
```

### PR 템플릿

```markdown
## 변경 사항

<!-- 이 PR에서 변경한 내용을 설명해주세요 -->

## 변경 이유

<!-- 왜 이 변경이 필요한지 설명해주세요 -->

## 테스트 방법

<!-- 이 변경사항을 어떻게 테스트할 수 있는지 설명해주세요 -->

1.
2.
3.

## 스크린샷 (선택사항)

<!-- UI 변경이 있다면 스크린샷을 추가해주세요 -->

## 체크리스트

- [ ] 모든 테스트 통과
- [ ] 린트/타입 체크 통과
- [ ] 문서 업데이트
- [ ] Breaking changes 없음 (또는 마이그레이션 가이드 추가)
- [ ] 관련 이슈: Closes #

## 추가 정보

<!-- 리뷰어가 알아야 할 추가 정보가 있다면 작성해주세요 -->
```

### PR 크기

- **작은 PR 권장**: 변경사항은 가능한 한 작게 유지
- **500줄 이하**: 리뷰하기 쉬운 크기
- **단일 목적**: 하나의 기능/수정에 집중
- **큰 변경**: 여러 개의 작은 PR로 분할

### PR 라벨

- `feature`: 새로운 기능
- `bugfix`: 버그 수정
- `documentation`: 문서 변경
- `refactor`: 리팩토링
- `testing`: 테스트 추가/수정
- `breaking-change`: Breaking change 포함
- `needs-review`: 리뷰 필요
- `work-in-progress`: 작업 진행 중

---

## 이슈 리포팅

### 버그 리포트

```markdown
## 버그 설명

<!-- 발생한 버그를 명확하게 설명해주세요 -->

## 재현 방법

1.
2.
3.

## 예상 동작

<!-- 어떻게 동작해야 하는지 설명해주세요 -->

## 실제 동작

<!-- 실제로 어떻게 동작하는지 설명해주세요 -->

## 스크린샷/로그

<!-- 스크린샷이나 에러 로그를 첨부해주세요 -->

## 환경

- OS: [예: macOS 14.0]
- 브라우저: [예: Chrome 120]
- Node.js 버전: [예: v20.10.0]
- 프로젝트 버전: [예: v1.2.3]

## 추가 정보

<!-- 추가로 전달할 정보가 있다면 작성해주세요 -->
```

### 기능 제안

```markdown
## 제안하는 기능

<!-- 제안하는 기능을 설명해주세요 -->

## 사용 사례

<!-- 이 기능이 어떤 상황에서 유용한지 설명해주세요 -->

## 제안하는 구현 방법

<!-- 어떻게 구현하면 좋을지 아이디어가 있다면 공유해주세요 -->

## 대안

<!-- 고려한 다른 대안이 있다면 설명해주세요 -->

## 추가 정보

<!-- 추가로 전달할 정보가 있다면 작성해주세요 -->
```

---

## 코드 리뷰 프로세스

### 리뷰어 가이드

#### 리뷰 시 확인사항

1. **기능 요구사항**: PR이 의도한 대로 동작하는가?
2. **코드 품질**: 코드가 읽기 쉽고 유지보수하기 쉬운가?
3. **테스트**: 충분한 테스트가 작성되었는가?
4. **성능**: 성능 문제가 없는가?
5. **보안**: 보안 취약점이 없는가?
6. **문서**: 필요한 문서가 업데이트되었는가?

#### 리뷰 코멘트 작성

````markdown
<!-- ✅ 좋은 코멘트 -->

이 함수가 매우 길어서 이해하기 어렵습니다. 다음과 같이 분리하면 어떨까요?

```typescript
function validateWorkflow(workflow: Workflow) {
  validateName(workflow.name);
  validateNodes(workflow.nodes);
  validateConnections(workflow.connections);
}
```
````

<!-- ❌ 나쁜 코멘트 -->

코드가 별로입니다.

````

#### 리뷰 승인 기준

- ✅ **Approve**: 변경사항이 좋고 머지 가능
- 💬 **Comment**: 질문이나 제안만 있고 머지 가능
- 🔄 **Request Changes**: 수정이 필요함

### PR 작성자 가이드

#### 리뷰 요청

```bash
# PR 생성 후
1. 적절한 리뷰어 지정
2. 라벨 추가
3. 프로젝트/마일스톤 연결
4. Draft → Ready for review
````

#### 피드백 대응

1. **모든 코멘트에 응답**: 수정했거나 동의하지 않는 이유 설명
2. **변경사항 명시**: "Fixed in commit abc123"
3. **질문에 답변**: 리뷰어의 질문에 성실하게 답변
4. **감사 표현**: 리뷰에 대한 감사 표현

#### 머지 전 확인

- [ ] 모든 리뷰 코멘트 해결
- [ ] CI/CD 통과
- [ ] Conflicts 해결
- [ ] Squash or Rebase 결정

---

## 커뮤니티 가이드라인

### 행동 강령

모든 기여자는 다음 행동 강령을 준수해야 합니다:

1. **존중**: 모든 기여자를 존중하고 배려합니다
2. **포용**: 다양한 배경과 경험을 가진 사람들을 환영합니다
3. **건설적 피드백**: 비판은 건설적이고 구체적으로 합니다
4. **협력**: 서로 돕고 지식을 공유합니다

### 금지 행위

- 모욕적이거나 차별적인 언어 사용
- 개인 공격 또는 괴롭힘
- 타인의 개인정보 공개
- 부적절한 콘텐츠 게시

### 문제 보고

행동 강령 위반을 목격하거나 경험한 경우:

1. 프로젝트 관리자에게 이메일로 보고
2. 구체적인 상황 설명
3. 익명 보고도 가능

---

## 도움이 필요한가요?

### 리소스

- [GitHub Issues](https://github.com/owner/repo/issues): 버그 리포트 및 기능 제안
- [Discussions](https://github.com/owner/repo/discussions): 질문 및 논의
- [Documentation](https://docs.example.com): 프로젝트 문서
- Email: dev@example.com

### FAQ

**Q: 어떤 이슈부터 시작하면 좋을까요?**

A: `good-first-issue` 라벨이 붙은 이슈를 추천합니다.

**Q: PR이 오랫동안 리뷰되지 않아요.**

A: 리뷰어를 멘션하거나 Discussion에 문의해주세요.

**Q: Breaking change를 포함하는 PR을 만들어도 되나요?**

A: 먼저 이슈에서 논의한 후 진행해주세요.

**Q: 테스트 작성이 어려워요.**

A: 기존 테스트 파일을 참고하거나 Discussion에 질문해주세요.

---

## 다음 단계

- [Architecture](./architecture.md) - 시스템 아키텍처 이해
- [Testing](./testing.md) - 테스트 작성 가이드
- [API Wrapper](./api-wrapper.md) - API 클라이언트 사용법

---

## 참고 자료

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Code Review Best Practices](https://google.github.io/eng-practices/review/)

---

**다시 한번 기여해주셔서 감사합니다! 🎉**
