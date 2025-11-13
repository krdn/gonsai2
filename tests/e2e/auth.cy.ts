/**
 * Authentication E2E Tests
 *
 * @description 인증 관련 End-to-End 테스트
 */

describe('Authentication Flow', () => {
  beforeEach(() => {
    // 각 테스트 전 세션 초기화
    cy.clearAllCookies();
    cy.clearLocalStorage();
  });

  describe('User Signup', () => {
    it('새 사용자로 회원가입할 수 있어야 함', () => {
      cy.visit('/signup');

      // 폼 입력
      cy.get('input[name="email"]').type(`test${Date.now()}@example.com`);
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="password"]').type('StrongPassword123!');
      cy.get('input[name="confirmPassword"]').type('StrongPassword123!');

      // 제출
      cy.get('button[type="submit"]').click();

      // 성공 시 대시보드로 리디렉션
      cy.url().should('include', '/dashboard');
      cy.contains('Welcome').should('be.visible');
    });

    it('유효하지 않은 이메일을 거부해야 함', () => {
      cy.visit('/signup');

      cy.get('input[name="email"]').type('not-an-email');
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="password"]').type('Password123!');
      cy.get('input[name="confirmPassword"]').type('Password123!');

      cy.get('button[type="submit"]').click();

      // 에러 메시지 표시
      cy.contains(/invalid.*email/i).should('be.visible');
      cy.url().should('include', '/signup');
    });

    it('약한 비밀번호를 거부해야 함', () => {
      cy.visit('/signup');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="password"]').type('weak');
      cy.get('input[name="confirmPassword"]').type('weak');

      cy.get('button[type="submit"]').click();

      cy.contains(/password.*strong/i).should('be.visible');
    });

    it('비밀번호 확인이 일치하지 않으면 거부해야 함', () => {
      cy.visit('/signup');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="name"]').type('Test User');
      cy.get('input[name="password"]').type('Password123!');
      cy.get('input[name="confirmPassword"]').type('DifferentPassword123!');

      cy.get('button[type="submit"]').click();

      cy.contains(/passwords.*match/i).should('be.visible');
    });
  });

  describe('User Login', () => {
    const testUser = {
      email: `e2e-user-${Date.now()}@example.com`,
      name: 'E2E Test User',
      password: 'E2EPassword123!',
    };

    beforeEach(() => {
      // 테스트 사용자 생성
      cy.createTestUser(testUser.email, testUser.name, testUser.password);
    });

    it('올바른 자격 증명으로 로그인할 수 있어야 함', () => {
      cy.visit('/login');

      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type(testUser.password);
      cy.get('button[type="submit"]').click();

      // 로그인 성공 확인
      cy.url().should('include', '/dashboard');
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    });

    it('잘못된 자격 증명을 거부해야 함', () => {
      cy.visit('/login');

      cy.get('input[type="email"]').type(testUser.email);
      cy.get('input[type="password"]').type('WrongPassword123!');
      cy.get('button[type="submit"]').click();

      cy.contains(/invalid.*credentials/i).should('be.visible');
      cy.url().should('include', '/login');
    });

    it('로그인 후 세션이 유지되어야 함', () => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/dashboard');

      // 페이지 새로고침 후에도 로그인 상태 유지
      cy.reload();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('User Logout', () => {
    const testUser = {
      email: `logout-user-${Date.now()}@example.com`,
      name: 'Logout Test User',
      password: 'LogoutPassword123!',
    };

    beforeEach(() => {
      cy.createTestUser(testUser.email, testUser.name, testUser.password);
      cy.login(testUser.email, testUser.password);
    });

    it('로그아웃할 수 있어야 함', () => {
      cy.visit('/dashboard');

      // 로그아웃 버튼 클릭
      cy.get('[data-testid="logout-button"]').click();

      // 로그인 페이지로 리디렉션
      cy.url().should('include', '/login');
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('not.exist');
    });

    it('로그아웃 후 보호된 페이지 접근 시 리디렉션되어야 함', () => {
      cy.visit('/dashboard');
      cy.logout();

      // 로그아웃 후 대시보드 접근 시도
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  describe('Protected Routes', () => {
    it('인증되지 않은 사용자는 보호된 페이지에 접근할 수 없어야 함', () => {
      cy.visit('/dashboard');
      cy.url().should('include', '/login');

      cy.visit('/workflows');
      cy.url().should('include', '/login');
    });

    it('인증된 사용자는 보호된 페이지에 접근할 수 있어야 함', () => {
      const testUser = {
        email: `protected-${Date.now()}@example.com`,
        name: 'Protected Test User',
        password: 'ProtectedPassword123!',
      };

      cy.createTestUser(testUser.email, testUser.name, testUser.password);
      cy.login(testUser.email, testUser.password);

      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard');

      cy.visit('/workflows');
      cy.url().should('include', '/workflows');
    });
  });

  describe('Session Management', () => {
    const testUser = {
      email: `session-${Date.now()}@example.com`,
      name: 'Session Test User',
      password: 'SessionPassword123!',
    };

    beforeEach(() => {
      cy.createTestUser(testUser.email, testUser.name, testUser.password);
    });

    it('여러 탭에서 세션이 동기화되어야 함', () => {
      cy.login(testUser.email, testUser.password);

      // 첫 번째 탭
      cy.visit('/dashboard');
      cy.contains('Welcome').should('be.visible');

      // 새 탭에서도 로그인 상태 확인 (localStorage 공유)
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    });

    it('만료된 토큰으로 API 요청 시 로그아웃되어야 함', () => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/dashboard');

      // 만료된 토큰으로 변경
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'expired.token.here');
      });

      // API 요청 (실제 API 엔드포인트에 따라 조정)
      cy.reload();

      // 로그인 페이지로 리디렉션
      cy.url().should('include', '/login', { timeout: 10000 });
    });
  });

  describe('Accessibility', () => {
    it('로그인 페이지가 접근성 표준을 충족해야 함', () => {
      cy.visit('/login');

      // 모든 폼 요소에 label이 있어야 함
      cy.get('input[type="email"]').should('have.attr', 'id');
      cy.get('label[for]').should('exist');

      // 키보드 네비게이션이 가능해야 함
      cy.get('input[type="email"]').focus();
      cy.focused().should('have.attr', 'type', 'email');

      cy.realPress('Tab');
      cy.focused().should('have.attr', 'type', 'password');

      cy.realPress('Tab');
      cy.focused().should('have.attr', 'type', 'submit');
    });
  });

  describe('Error Handling', () => {
    it('네트워크 오류를 적절히 처리해야 함', () => {
      // API 오류 시뮬레이션
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('loginRequest');

      cy.visit('/login');
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginRequest');
      cy.contains(/error.*occurred/i).should('be.visible');
    });

    it('rate limit 초과 시 적절한 메시지를 표시해야 함', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 429,
        body: { error: 'Too many requests' },
      }).as('rateLimitRequest');

      cy.visit('/login');
      cy.get('input[type="email"]').type('test@example.com');
      cy.get('input[type="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@rateLimitRequest');
      cy.contains(/too many.*requests/i).should('be.visible');
    });
  });
});
