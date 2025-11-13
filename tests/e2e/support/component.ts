/**
 * Cypress Component Testing Support
 *
 * @description 컴포넌트 테스트 전역 설정
 */

import { mount } from 'cypress/react18';

declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

export {};
