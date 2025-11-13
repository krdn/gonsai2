# Testing Guide

포괄적인 테스팅 전략은 안정적이고 유지보수 가능한 애플리케이션의 핵심입니다. 이 문서에서는 프로젝트에서 사용하는 테스팅 도구, 전략, 모범 사례를 다룹니다.

## 목차

- [테스팅 스택](#테스팅-스택)
- [테스트 구조](#테스트-구조)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Component Testing](#component-testing)
- [API Testing](#api-testing)
- [Mocking 전략](#mocking-전략)
- [테스트 커버리지](#테스트-커버리지)
- [CI/CD 통합](#cicd-통합)

---

## 테스팅 스택

### 테스팅 도구

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.1",
    "@testing-library/jest-dom": "^6.1.5",
    "@playwright/test": "^1.40.0",
    "msw": "^2.0.0",
    "c8": "^9.0.0"
  }
}
```

### 도구 역할

- **Vitest**: 빠른 단위 및 통합 테스트
- **React Testing Library**: React 컴포넌트 테스팅
- **Playwright**: E2E 브라우저 테스팅
- **MSW (Mock Service Worker)**: API mocking
- **c8**: 코드 커버리지 분석

### Vitest 설정

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.next',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 테스트 설정

```typescript
// test/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// 환경 변수 설정
process.env.NEXT_PUBLIC_N8N_API_URL = 'http://localhost:5678/api/v1';
process.env.NEXT_PUBLIC_N8N_API_KEY = 'test-api-key';

// 전역 모의 객체
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

---

## 테스트 구조

### 디렉토리 구조

```
project/
├── __tests__/                 # 테스트 파일
│   ├── unit/                  # 단위 테스트
│   │   ├── lib/
│   │   │   ├── n8n/
│   │   │   │   ├── client.test.ts
│   │   │   │   └── retry.test.ts
│   │   │   └── utils/
│   │   │       └── validation.test.ts
│   │   └── hooks/
│   │       └── useWorkflows.test.ts
│   │
│   ├── integration/           # 통합 테스트
│   │   ├── api/
│   │   │   └── workflows.test.ts
│   │   └── flows/
│   │       └── workflow-execution.test.ts
│   │
│   ├── e2e/                   # E2E 테스트
│   │   ├── auth.spec.ts
│   │   └── workflows.spec.ts
│   │
│   └── components/            # 컴포넌트 테스트
│       ├── WorkflowCard.test.tsx
│       └── ExecutionList.test.tsx
│
├── test/                      # 테스트 유틸리티
│   ├── setup.ts
│   ├── mocks/
│   │   ├── handlers.ts        # MSW 핸들러
│   │   └── data.ts            # 모의 데이터
│   └── utils/
│       ├── renderWithProviders.tsx
│       └── createMockRouter.ts
│
└── playwright.config.ts       # Playwright 설정
```

### 파일 명명 규칙

- 단위 테스트: `*.test.ts` 또는 `*.test.tsx`
- 통합 테스트: `*.integration.test.ts`
- E2E 테스트: `*.spec.ts`
- 모의 데이터: `*.mock.ts`

---

## Unit Testing

### 유틸리티 함수 테스트

```typescript
// lib/utils/validation.ts
export function isValidWorkflowName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

```typescript
// __tests__/unit/lib/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { isValidWorkflowName, isValidEmail } from '@/lib/utils/validation';

describe('isValidWorkflowName', () => {
  it('should accept valid workflow names', () => {
    expect(isValidWorkflowName('My Workflow')).toBe(true);
    expect(isValidWorkflowName('A')).toBe(true);
    expect(isValidWorkflowName('A'.repeat(100))).toBe(true);
  });

  it('should reject invalid workflow names', () => {
    expect(isValidWorkflowName('')).toBe(false);
    expect(isValidWorkflowName('A'.repeat(101))).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co.kr')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});
```

### API Client 테스트

```typescript
// __tests__/unit/lib/n8n/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { N8nApiClient, ApiError } from '@/lib/n8n/client';

describe('N8nApiClient', () => {
  let client: N8nApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new N8nApiClient({
      baseUrl: 'https://test.n8n.io/api/v1',
      apiKey: 'test-api-key',
    });

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWorkflows', () => {
    it('should fetch workflows successfully', async () => {
      const mockWorkflows = [
        { id: '1', name: 'Workflow 1', active: true },
        { id: '2', name: 'Workflow 2', active: false },
      ];

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: mockWorkflows }),
      });

      const workflows = await client.getWorkflows();

      expect(workflows).toEqual(mockWorkflows);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://test.n8n.io/api/v1/workflows',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-N8N-API-KEY': 'test-api-key',
          }),
        })
      );
    });

    it('should handle 404 errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        }),
      });

      await expect(client.getWorkflow('invalid-id')).rejects.toThrow(ApiError);
      await expect(client.getWorkflow('invalid-id')).rejects.toThrow(
        'Workflow not found'
      );
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getWorkflows()).rejects.toThrow();
    });
  });

  describe('retry mechanism', () => {
    it('should retry on 503 errors', async () => {
      let attempt = 0;

      fetchMock.mockImplementation(() => {
        attempt++;

        if (attempt < 3) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: async () => ({
              error: { message: 'Service Unavailable' },
            }),
          });
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { id: '1', name: 'Success' } }),
        });
      });

      const workflow = await client.getWorkflow('1');

      expect(attempt).toBe(3);
      expect(workflow.name).toBe('Success');
    });

    it('should not retry on 400 errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { code: 'VALIDATION_ERROR', message: 'Bad request' },
        }),
      });

      await expect(client.getWorkflow('1')).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1); // 재시도 없음
    });
  });
});
```

### Hooks 테스트

```typescript
// __tests__/unit/hooks/useWorkflows.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkflows } from '@/hooks/useWorkflows';
import * as n8nClient from '@/lib/n8n/client';

// React Query wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useWorkflows', () => {
  it('should fetch workflows', async () => {
    const mockWorkflows = [
      { id: '1', name: 'Workflow 1', active: true },
      { id: '2', name: 'Workflow 2', active: false },
    ];

    vi.spyOn(n8nClient, 'getN8nClient').mockReturnValue({
      getWorkflows: vi.fn().mockResolvedValue(mockWorkflows),
    } as any);

    const { result } = renderHook(() => useWorkflows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockWorkflows);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');

    vi.spyOn(n8nClient, 'getN8nClient').mockReturnValue({
      getWorkflows: vi.fn().mockRejectedValue(error),
    } as any);

    const { result } = renderHook(() => useWorkflows(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
```

---

## Integration Testing

### API Route 통합 테스트

```typescript
// __tests__/integration/api/workflows.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/workflows/route';

describe('/api/workflows', () => {
  describe('GET', () => {
    it('should return all workflows', async () => {
      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toBeInstanceOf(Array);
    });

    it('should filter workflows by active status', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { active: 'true' },
      });

      const response = await GET(req as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.every((w: any) => w.active === true)).toBe(true);
    });
  });

  describe('POST', () => {
    it('should create a new workflow', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          name: 'Test Workflow',
          nodes: [],
          connections: {},
          active: false,
        },
      });

      const response = await POST(req as any);
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toBe('Test Workflow');
    });

    it('should return 400 for invalid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          // name이 없음 (필수 필드)
          nodes: [],
        },
      });

      const response = await POST(req as any);

      expect(response.status).toBe(400);
    });
  });
});
```

### 워크플로우 실행 통합 테스트

```typescript
// __tests__/integration/flows/workflow-execution.test.ts
import { describe, it, expect } from 'vitest';
import { getN8nClient } from '@/lib/n8n/client';

describe('Workflow Execution Flow', () => {
  it('should create, execute, and retrieve workflow', async () => {
    const client = getN8nClient();

    // 1. 워크플로우 생성
    const workflow = await client.createWorkflow({
      name: 'Integration Test Workflow',
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [250, 300],
          parameters: {},
          typeVersion: 1,
        },
      ],
      connections: {},
      active: false,
      settings: {},
    });

    expect(workflow.id).toBeDefined();

    // 2. 워크플로우 실행
    const execution = await client.executeWorkflow(workflow.id);

    expect(execution.id).toBeDefined();
    expect(execution.workflowId).toBe(workflow.id);

    // 3. 실행 완료 대기
    let executionStatus = await client.getExecution(execution.id);
    let attempts = 0;
    const maxAttempts = 30;

    while (
      (executionStatus.status === 'running' ||
        executionStatus.status === 'waiting') &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      executionStatus = await client.getExecution(execution.id);
      attempts++;
    }

    expect(executionStatus.status).toBe('success');
    expect(executionStatus.finished).toBe(true);

    // 4. 워크플로우 삭제
    await client.deleteWorkflow(workflow.id);

    // 5. 삭제 확인
    await expect(client.getWorkflow(workflow.id)).rejects.toThrow();
  });
});
```

---

## E2E Testing

### Playwright 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 로그인 E2E 테스트

```typescript
// __tests__/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    // 로그인 폼 입력
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');

    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/dashboard');

    // 환영 메시지 확인
    await expect(page.locator('h1')).toContainText('대시보드');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // 에러 메시지 확인
    await expect(page.locator('[role="alert"]')).toContainText(
      '이메일 또는 비밀번호가 올바르지 않습니다'
    );
  });

  test('should logout successfully', async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 로그아웃
    await page.click('[aria-label="User menu"]');
    await page.click('button:has-text("로그아웃")');

    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/login');
  });
});
```

### 워크플로우 CRUD E2E 테스트

```typescript
// __tests__/e2e/workflows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new workflow', async ({ page }) => {
    await page.goto('/workflows');

    // 새 워크플로우 버튼 클릭
    await page.click('button:has-text("새 워크플로우")');

    // 워크플로우 이름 입력
    await page.fill('input[name="name"]', 'E2E Test Workflow');

    // 저장 버튼 클릭
    await page.click('button:has-text("저장")');

    // 성공 메시지 확인
    await expect(page.locator('[role="status"]')).toContainText(
      '워크플로우가 생성되었습니다'
    );

    // 워크플로우 목록에서 확인
    await page.goto('/workflows');
    await expect(page.locator('text=E2E Test Workflow')).toBeVisible();
  });

  test('should execute a workflow', async ({ page }) => {
    await page.goto('/workflows');

    // 첫 번째 워크플로우 카드 찾기
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();

    // 실행 버튼 클릭
    await workflowCard.locator('button:has-text("실행")').click();

    // 실행 성공 메시지 확인
    await expect(page.locator('[role="status"]')).toContainText(
      '워크플로우가 실행되었습니다'
    );

    // 실행 내역 페이지로 이동
    await page.click('a:has-text("실행 내역")');

    // 실행 내역 확인
    await expect(
      page.locator('[data-testid="execution-row"]').first()
    ).toBeVisible();
  });

  test('should delete a workflow', async ({ page }) => {
    await page.goto('/workflows');

    // 첫 번째 워크플로우 카드
    const workflowCard = page.locator('[data-testid="workflow-card"]').first();
    const workflowName = await workflowCard
      .locator('h3')
      .textContent();

    // 더보기 메뉴 클릭
    await workflowCard.locator('[aria-label="More options"]').click();

    // 삭제 버튼 클릭
    await page.click('button:has-text("삭제")');

    // 확인 다이얼로그에서 확인 클릭
    await page.click('button:has-text("확인")');

    // 삭제 성공 메시지 확인
    await expect(page.locator('[role="status"]')).toContainText(
      '워크플로우가 삭제되었습니다'
    );

    // 워크플로우가 목록에서 사라졌는지 확인
    await expect(page.locator(`text=${workflowName}`)).not.toBeVisible();
  });
});
```

---

## Component Testing

### 컴포넌트 렌더링 테스트

```typescript
// __tests__/components/WorkflowCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowCard } from '@/components/WorkflowCard';

describe('WorkflowCard', () => {
  const mockWorkflow = {
    id: '1',
    name: 'Test Workflow',
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render workflow information', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    expect(screen.getByText(/활성/)).toBeInTheDocument();
  });

  it('should call onExecute when execute button is clicked', () => {
    const onExecute = vi.fn();

    render(<WorkflowCard workflow={mockWorkflow} onExecute={onExecute} />);

    const executeButton = screen.getByRole('button', { name: /실행/ });
    fireEvent.click(executeButton);

    expect(onExecute).toHaveBeenCalledWith(mockWorkflow.id);
  });

  it('should show inactive badge for inactive workflows', () => {
    const inactiveWorkflow = { ...mockWorkflow, active: false };

    render(<WorkflowCard workflow={inactiveWorkflow} />);

    expect(screen.getByText(/비활성/)).toBeInTheDocument();
  });
});
```

### 사용자 상호작용 테스트

```typescript
// __tests__/components/WorkflowForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowForm } from '@/components/WorkflowForm';

describe('WorkflowForm', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<WorkflowForm onSubmit={onSubmit} />);

    // 이름 없이 제출 시도
    const submitButton = screen.getByRole('button', { name: /저장/ });
    await user.click(submitButton);

    // 에러 메시지 확인
    await waitFor(() => {
      expect(screen.getByText(/이름은 필수입니다/)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<WorkflowForm onSubmit={onSubmit} />);

    // 이름 입력
    const nameInput = screen.getByLabelText(/워크플로우 이름/);
    await user.type(nameInput, 'My New Workflow');

    // 설명 입력
    const descriptionInput = screen.getByLabelText(/설명/);
    await user.type(descriptionInput, 'This is a test workflow');

    // 활성화 체크박스
    const activeCheckbox = screen.getByLabelText(/활성화/);
    await user.click(activeCheckbox);

    // 제출
    const submitButton = screen.getByRole('button', { name: /저장/ });
    await user.click(submitButton);

    // 제출 함수 호출 확인
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'My New Workflow',
        description: 'This is a test workflow',
        active: true,
      });
    });
  });
});
```

---

## API Testing

### MSW 핸들러 설정

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const baseUrl = 'http://localhost:5678/api/v1';

export const handlers = [
  // GET /workflows
  http.get(`${baseUrl}/workflows`, () => {
    return HttpResponse.json({
      data: [
        {
          id: '1',
          name: 'Test Workflow 1',
          active: true,
          nodes: [],
          connections: {},
        },
        {
          id: '2',
          name: 'Test Workflow 2',
          active: false,
          nodes: [],
          connections: {},
        },
      ],
    });
  }),

  // GET /workflows/:id
  http.get(`${baseUrl}/workflows/:id`, ({ params }) => {
    const { id } = params;

    if (id === 'invalid') {
      return HttpResponse.json(
        {
          error: {
            code: 'WORKFLOW_NOT_FOUND',
            message: 'Workflow not found',
          },
        },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: {
        id,
        name: 'Test Workflow',
        active: true,
        nodes: [],
        connections: {},
      },
    });
  }),

  // POST /workflows/:id/execute
  http.post(`${baseUrl}/workflows/:id/execute`, ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      data: {
        id: 'exec-1',
        workflowId: id,
        status: 'running',
        startedAt: new Date().toISOString(),
      },
    });
  }),

  // Rate limit error
  http.get(`${baseUrl}/rate-limit-test`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          details: {
            resetAt: new Date(Date.now() + 60000).toISOString(),
          },
        },
      },
      { status: 429 }
    );
  }),
];
```

### MSW 서버 설정

```typescript
// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// 테스트 시작 전에 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트 후 핸들러 리셋
afterEach(() => server.resetHandlers());

// 테스트 종료 후 서버 종료
afterAll(() => server.close());
```

### MSW와 함께 테스트

```typescript
// __tests__/unit/lib/n8n/client-with-msw.test.ts
import { describe, it, expect } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { getN8nClient } from '@/lib/n8n/client';

describe('N8nApiClient with MSW', () => {
  it('should handle successful requests', async () => {
    const client = getN8nClient();
    const workflows = await client.getWorkflows();

    expect(workflows).toHaveLength(2);
    expect(workflows[0].name).toBe('Test Workflow 1');
  });

  it('should handle 404 errors', async () => {
    const client = getN8nClient();

    await expect(client.getWorkflow('invalid')).rejects.toThrow(
      'Workflow not found'
    );
  });

  it('should handle rate limit errors', async () => {
    // 임시 핸들러 오버라이드
    server.use(
      http.get('http://localhost:5678/api/v1/workflows', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests',
              details: {
                resetAt: new Date(Date.now() + 60000).toISOString(),
              },
            },
          },
          { status: 429 }
        );
      })
    );

    const client = getN8nClient();

    await expect(client.getWorkflows()).rejects.toThrow('Too many requests');
  });
});
```

---

## Mocking 전략

### 함수 Mocking

```typescript
// __tests__/unit/lib/utils/date.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, isToday } from '@/lib/utils/date';

describe('Date utilities', () => {
  beforeEach(() => {
    // 현재 시간을 고정
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format date correctly', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(formatDate(date)).toBe('2024년 1월 15일');
  });

  it('should detect today correctly', () => {
    const today = new Date('2024-01-15T15:00:00Z');
    const yesterday = new Date('2024-01-14T12:00:00Z');

    expect(isToday(today)).toBe(true);
    expect(isToday(yesterday)).toBe(false);
  });
});
```

### 모듈 Mocking

```typescript
// __tests__/unit/lib/logger.test.ts
import { describe, it, expect, vi } from 'vitest';

// winston 모듈 전체를 모킹
vi.mock('winston', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
  format: {
    combine: vi.fn(),
    timestamp: vi.fn(),
    json: vi.fn(),
    colorize: vi.fn(),
    simple: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';

describe('Logger', () => {
  it('should log info messages', () => {
    logger.info('Test message');

    expect(logger.info).toHaveBeenCalledWith('Test message');
  });

  it('should log error messages with context', () => {
    const error = new Error('Test error');

    logger.error('An error occurred', { error });

    expect(logger.error).toHaveBeenCalledWith('An error occurred', { error });
  });
});
```

### Partial Mocking

```typescript
// __tests__/unit/lib/n8n/service.test.ts
import { describe, it, expect, vi } from 'vitest';
import * as n8nClient from '@/lib/n8n/client';
import { WorkflowService } from '@/lib/n8n/service';

describe('WorkflowService', () => {
  it('should use cache for repeated requests', async () => {
    const getWorkflowSpy = vi.spyOn(n8nClient, 'getN8nClient');
    const mockClient = {
      getWorkflow: vi.fn().mockResolvedValue({
        id: '1',
        name: 'Test',
        active: true,
      }),
    };

    getWorkflowSpy.mockReturnValue(mockClient as any);

    const service = new WorkflowService();

    // 첫 번째 요청
    await service.getWorkflow('1');
    // 두 번째 요청 (캐시에서)
    await service.getWorkflow('1');

    // API는 한 번만 호출되어야 함
    expect(mockClient.getWorkflow).toHaveBeenCalledTimes(1);
  });
});
```

---

## 테스트 커버리지

### 커버리지 실행

```bash
# 커버리지와 함께 테스트 실행
npm run test:coverage

# 특정 파일만
npm run test:coverage -- lib/n8n/client.ts
```

### 커버리지 임계값 설정

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,        // 라인 커버리지 80%
        functions: 80,    // 함수 커버리지 80%
        branches: 80,     // 분기 커버리지 80%
        statements: 80,   // 구문 커버리지 80%
      },
      // 특정 파일/폴더 제외
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
});
```

### 커버리지 리포트 확인

```bash
# HTML 리포트 열기
open coverage/index.html

# 터미널에서 요약 확인
npm run test:coverage -- --reporter=text
```

---

## CI/CD 통합

### GitHub Actions 설정

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  e2e-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### 테스트 스크립트

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

---

## 다음 단계

- [Contribution Guide](./contribution.md) - 기여 가이드라인
- [API Wrapper](./api-wrapper.md) - API 클라이언트 사용법
- [Error Handling](./error-handling.md) - 에러 처리 패턴

---

## 참고 자료

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
