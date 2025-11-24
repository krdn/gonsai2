/**
 * Cypress E2E Testing Configuration
 *
 * @description End-to-End 테스트 설정
 */

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3002',
    specPattern: 'tests/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/e2e.ts',
    fixturesFolder: 'tests/e2e/fixtures',
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',

    setupNodeEvents(on, config) {
      // 플러그인 이벤트 설정
      return config;
    },

    // 타임아웃 설정
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,

    // 화면 크기
    viewportWidth: 1280,
    viewportHeight: 720,

    // 비디오 녹화 (CI/CD에서 유용)
    video: true,
    videoCompression: 32,

    // 스크린샷 설정
    screenshotOnRunFailure: true,

    // 재시도 설정 (불안정한 테스트 방지)
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // 환경 변수
    env: {
      apiUrl: 'http://localhost:8000',
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    specPattern: 'apps/frontend/src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/component.ts',
  },
});
