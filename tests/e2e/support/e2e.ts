/**
 * Cypress E2E Support File
 *
 * @description E2E 테스트 전역 설정 및 커스텀 명령
 */

// Cypress 타입 확장
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * 사용자 로그인 커스텀 명령
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * 로그아웃 커스텀 명령
       */
      logout(): Chainable<void>;

      /**
       * 테스트 사용자 생성
       */
      createTestUser(email: string, name: string, password: string): Chainable<any>;
    }
  }
}

/**
 * 로그인 커스텀 명령
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(email);
      cy.get('input[type="password"]').type(password);
      cy.get('button[type="submit"]').click();

      // 로그인 성공 확인
      cy.url().should('not.include', '/login');
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    },
    {
      cacheAcrossSpecs: true,
    }
  );
});

/**
 * 로그아웃 커스텀 명령
 */
Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('authToken');
  });
  cy.visit('/login');
});

/**
 * 테스트 사용자 생성 커스텀 명령
 */
Cypress.Commands.add('createTestUser', (email: string, name: string, password: string) => {
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/signup`,
    body: { email, name, password },
    failOnStatusCode: false,
  });
});

/**
 * 전역 에러 핸들링
 */
Cypress.on('uncaught:exception', (err, runnable) => {
  // 특정 에러는 무시 (필요에 따라 조정)
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

export {};
