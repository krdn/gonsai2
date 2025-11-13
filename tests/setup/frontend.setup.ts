/**
 * Frontend Test Setup
 *
 * Jest 프론트엔드 테스트 환경 초기화 (React Testing Library)
 */

import '@testing-library/jest-dom';

/**
 * 전역 테스트 설정
 */
beforeAll(() => {
  console.log('🎨 Frontend test environment initialized');
});

/**
 * 환경 변수 설정
 */
process.env.NODE_ENV = 'test';

/**
 * Mock matchMedia (CSS media queries)
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

/**
 * Mock IntersectionObserver
 */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

/**
 * Mock ResizeObserver
 */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

/**
 * Mock fetch API
 */
global.fetch = jest.fn();
