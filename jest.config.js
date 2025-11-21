/**
 * Jest Configuration
 *
 * Comprehensive testing setup for backend, frontend, and integration tests
 */

module.exports = {
  // 프로젝트 루트 설정
  roots: ['<rootDir>/apps', '<rootDir>/features', '<rootDir>/infrastructure'],

  // 멀티 프로젝트 구성 (백엔드, 프론트엔드 분리)
  projects: [
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/apps/backend/**/*.test.ts',
        '<rootDir>/apps/backend/**/*.spec.ts',
        '<rootDir>/features/**/*.test.ts',
        '<rootDir>/infrastructure/**/*.test.ts',
      ],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: './tsconfig.json',
          },
        ],
      },
      collectCoverageFrom: [
        'apps/backend/src/**/*.ts',
        'features/**/services/**/*.ts',
        'features/**/types/**/*.ts',
        'infrastructure/**/*.ts',
        '!**/*.d.ts',
        '!**/*.test.ts',
        '!**/*.spec.ts',
        '!**/node_modules/**',
      ],
      coverageDirectory: '<rootDir>/coverage/backend',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
      coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/__tests__/', '/tests/'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.setup.ts'],
    },
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/apps/frontend/**/*.test.{ts,tsx}',
        '<rootDir>/apps/frontend/**/*.spec.{ts,tsx}',
      ],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/.next/',
        '/e2e/',
        '<rootDir>/apps/frontend/test/integration/',
      ],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: './apps/frontend/tsconfig.jest.json',
          },
        ],
      },
      moduleNameMapper: {
        '^react$': '<rootDir>/apps/frontend/node_modules/react',
        '^react-dom$': '<rootDir>/apps/frontend/node_modules/react-dom',
        '^react-dom/client$': '<rootDir>/apps/frontend/node_modules/react-dom/client',
        '^@/test/(.*)$': '<rootDir>/apps/frontend/test/$1',
        '^@/(.*)$': '<rootDir>/apps/frontend/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.js',
      },
      collectCoverageFrom: [
        'apps/frontend/src/**/*.{ts,tsx}',
        '!apps/frontend/src/**/*.d.ts',
        '!apps/frontend/src/**/*.test.{ts,tsx}',
        '!apps/frontend/src/**/*.spec.{ts,tsx}',
        '!**/node_modules/**',
      ],
      coverageDirectory: '<rootDir>/coverage/frontend',
      coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend.setup.ts'],
    },
  ],

  // 전역 설정
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 테스트 타임아웃 (통합 테스트용)
  testTimeout: 30000,

  // 병렬 실행 설정
  maxWorkers: '50%',

  // 모니터링 및 로깅
  verbose: true,

  // Git 무시 파일 제외
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/.next/', '/e2e/'],

  // Haste 설정 - dist 디렉토리에서 모듈 해시 제외
  haste: {
    forceNodeFilesystemAPI: true,
    retainAllFiles: false,
  },

  // 모듈 경로 무시 (dist 디렉토리의 중복 파일 방지)
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/apps/frontend/dist/'],

  // 캐시 활성화 (성능 향상)
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
};
