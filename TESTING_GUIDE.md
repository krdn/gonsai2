# Testing Guide for gonsai2

gonsai2 프로젝트의 종합 테스팅 가이드입니다.

## 📚 목차

- [테스트 개요](#테스트-개요)
- [설치 및 설정](#설치-및-설정)
- [테스트 실행](#테스트-실행)
- [테스트 작성 가이드](#테스트-작성-가이드)
- [테스트 커버리지](#테스트-커버리지)
- [CI/CD 통합](#cicd-통합)
- [문제 해결](#문제-해결)

---

## 🧪 테스트 개요

### 테스트 레벨

1. **단위 테스트 (Unit Tests)**
   - 개별 함수, 클래스, 모듈 테스트
   - `apps/backend/src/**/__tests__/*.test.ts`
   - Jest + ts-jest 사용

2. **통합 테스트 (Integration Tests)**
   - API 엔드포인트 테스트
   - `tests/integration/*.test.ts`
   - Supertest 사용

3. **E2E 테스트 (End-to-End Tests)**
   - 전체 사용자 플로우 테스트
   - `tests/e2e/*.cy.ts`
   - Cypress 사용

### 테스트 프레임워크

- **Jest**: 백엔드 및 프론트엔드 단위 테스트
- **Supertest**: API 통합 테스트
- **Cypress**: E2E 테스트
- **React Testing Library**: 프론트엔드 컴포넌트 테스트
- **MongoDB Memory Server**: 테스트용 인메모리 데이터베이스

---

## 🔧 설치 및 설정

### 의존성 설치

```bash
npm install
```

### Husky 설정 (Pre-commit Hooks)

```bash
npm run prepare
```

### Cypress 설치

```bash
npx cypress install
```

---

## 🚀 테스트 실행

### 모든 테스트 실행

```bash
npm test
```

### 단위 테스트만 실행

```bash
npm run test:unit
```

### 통합 테스트 실행

```bash
npm run test:integration
```

### E2E 테스트 실행

```bash
# Headless 모드
npm run test:e2e

# Interactive 모드
npm run test:e2e:open
```

### Watch 모드 (개발 중)

```bash
npm run test:watch
```

### 변경된 파일만 테스트

```bash
npm run test:changed
```

### 커버리지 포함 테스트

```bash
npm run test:coverage
```

---

## ✍️ 테스트 작성 가이드

### 1. 백엔드 단위 테스트

**위치**: `apps/backend/src/services/__tests__/`

**예제: Auth Service 테스트**

```typescript
// auth.service.test.ts
import { authService } from '../auth.service';
import { databaseService } from '../database.service';

describe('AuthService', () => {
  beforeAll(async () => {
    await databaseService.connect();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  beforeEach(async () => {
    const usersCollection = databaseService.getUsersCollection();
    await usersCollection.deleteMany({});
  });

  it('should hash password correctly', async () => {
    const password = 'TestPassword123!';
    const hashedPassword = await authService.hashPassword(password);

    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(password);
  });

  it('should verify password correctly', async () => {
    const password = 'TestPassword123!';
    const hashedPassword = await authService.hashPassword(password);

    const isValid = await authService.verifyPassword(password, hashedPassword);
    expect(isValid).toBe(true);
  });
});
```

### 2. API 통합 테스트

**위치**: `tests/integration/`

**예제: Auth API 테스트**

```typescript
// auth.integration.test.ts
import request from 'supertest';
import { createApp } from '../../apps/backend/src/server';
import { databaseService } from '../../apps/backend/src/services/database.service';

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await databaseService.connect();
    app = createApp();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: 'StrongPassword123!',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });
});
```

### 3. E2E 테스트

**위치**: `tests/e2e/`

**예제: 로그인 플로우 테스트**

```typescript
// auth.cy.ts
describe('Authentication Flow', () => {
  it('should login with valid credentials', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('Password123!');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
  });
});
```

### 4. 프론트엔드 컴포넌트 테스트

**위치**: `apps/frontend/src/components/__tests__/`

**예제: LoginForm 테스트**

```typescript
// LoginForm.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

describe('LoginForm', () => {
  it('should render login form', () => {
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should submit form with user input', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = jest.fn();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

---

## 📊 테스트 커버리지

### 커버리지 확인

```bash
npm run test:coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다.

### 커버리지 기준

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### 커버리지 리포트 보기

```bash
# HTML 리포트
open coverage/lcov-report/index.html

# 또는 브라우저에서
http://localhost:8080/coverage/
```

---

## 🔄 CI/CD 통합

### GitHub Actions

프로젝트에는 `.github/workflows/test.yml`이 구성되어 있습니다.

**실행되는 작업:**

1. **Unit Tests**: Node.js 18, 20에서 단위 테스트 실행
2. **Integration Tests**: MongoDB, Redis 서비스와 함께 통합 테스트 실행
3. **E2E Tests**: Cypress로 E2E 테스트 실행
4. **Coverage Report**: 커버리지 리포트 생성 및 Codecov 업로드

### Pre-commit Hooks

Husky를 사용하여 커밋 전 자동 검증:

- **Lint**: ESLint로 코드 스타일 검사
- **Format**: Prettier로 코드 포맷팅
- **Test**: 변경된 파일 관련 테스트 실행

**수동 실행:**

```bash
npm run precommit
```

---

## 🧩 테스트 유틸리티

### Fixtures

테스트용 데이터 생성:

```typescript
import { createTestUser, createAdminUser } from '../../../tests/fixtures/users.fixture';

const user = await createTestUser();
const admin = await createAdminUser();
```

### Test Helpers

유틸리티 함수:

```typescript
import {
  generateTestToken,
  cleanDatabase,
  generateRandomEmail,
  createMockRequest,
  createMockResponse,
} from '../../../tests/utils/test-helpers';

const token = generateTestToken(userId, email);
const email = generateRandomEmail();
```

---

## 🛠️ 문제 해결

### MongoDB Memory Server 오류

```bash
# 캐시 삭제
rm -rf ~/.cache/mongodb-memory-server

# 재설치
npm install mongodb-memory-server --force
```

### Jest 캐시 문제

```bash
# Jest 캐시 삭제
npm test -- --clearCache
```

### Cypress 실행 오류

```bash
# Cypress 재설치
npx cypress install --force

# 브라우저 확인
npx cypress verify
```

### 포트 충돌

테스트 실행 전 포트 확인:

```bash
# 8000번 포트 사용 중인 프로세스 종료
lsof -ti:8000 | xargs kill -9
```

---

## 📝 테스트 작성 모범 사례

### 1. AAA 패턴 사용

```typescript
it('should do something', () => {
  // Arrange: 테스트 준비
  const input = 'test';

  // Act: 동작 실행
  const result = doSomething(input);

  // Assert: 결과 검증
  expect(result).toBe('expected');
});
```

### 2. 명확한 테스트 이름

```typescript
// ❌ 나쁜 예
it('test 1', () => { ... });

// ✅ 좋은 예
it('should return 401 when user is not authenticated', () => { ... });
```

### 3. 하나의 개념만 테스트

```typescript
// ❌ 나쁜 예: 여러 개념 테스트
it('should handle user operations', () => {
  expect(createUser()).toBe(true);
  expect(deleteUser()).toBe(true);
  expect(updateUser()).toBe(true);
});

// ✅ 좋은 예: 개념별 분리
it('should create user successfully', () => { ... });
it('should delete user successfully', () => { ... });
it('should update user successfully', () => { ... });
```

### 4. 테스트 독립성 유지

각 테스트는 독립적으로 실행 가능해야 합니다.

```typescript
beforeEach(async () => {
  // 각 테스트 전 데이터베이스 초기화
  await cleanDatabase();
});
```

### 5. Mock 최소화

실제 구현을 테스트하되, 외부 의존성만 모킹:

```typescript
// ✅ 외부 API 모킹
jest.mock('axios');

// ❌ 내부 로직 모킹 지양
// jest.mock('../my-business-logic');
```

---

## 📖 추가 자료

- [Jest 공식 문서](https://jestjs.io/)
- [Cypress 공식 문서](https://docs.cypress.io/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest GitHub](https://github.com/visionmedia/supertest)

---

## 🤝 기여 가이드

테스트를 추가하거나 개선하는 경우:

1. 적절한 디렉토리에 테스트 파일 생성
2. 명확한 테스트 케이스 작성
3. 커버리지 기준 충족 확인
4. Pre-commit hooks 통과 확인
5. Pull Request 생성

---

**마지막 업데이트**: 2025-11-12
