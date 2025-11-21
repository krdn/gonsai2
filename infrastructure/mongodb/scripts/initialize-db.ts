#!/usr/bin/env ts-node
/**
 * MongoDB Database Initialization Script
 *
 * @description MongoDB 컬렉션 및 인덱스를 초기화합니다
 *
 * Usage:
 *   npx ts-node infrastructure/mongodb/scripts/initialize-db.ts
 */

import { MongoClient, Db } from 'mongodb';
import { COLLECTIONS } from '../schemas/types';
import { initializeWorkflowCollection } from '../schemas/workflow.schema';
import { initializeExecutionCollection } from '../schemas/execution.schema';
import { initializeAgentLogCollection } from '../schemas/agent-log.schema';
import { initializeErrorPatternCollection } from '../schemas/error-pattern.schema';

// ANSI 색상
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(level: 'info' | 'success' | 'error' | 'warning', message: string): void {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  const colorMap = {
    info: colors.blue,
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
  };

  console.log(`${icons[level]} ${colorMap[level]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * 메인 초기화 함수
 */
async function initializeDatabase(): Promise<void> {
  console.log(`${colors.cyan}MongoDB Database Initialization${colors.reset}\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gonsai2';
  const dbName = new URL(mongoUri).pathname.slice(1) || 'gonsai2';

  log('info', `MongoDB URI: ${mongoUri}`);
  log('info', `Database: ${dbName}`);

  let client: MongoClient | null = null;

  try {
    // MongoDB 연결
    logSection('1. MongoDB 연결');
    log('info', '연결 중...');

    client = new MongoClient(mongoUri);
    await client.connect();

    log('success', 'MongoDB 연결 성공');

    const db: Db = client.db(dbName);

    // 기존 컬렉션 확인
    logSection('2. 기존 컬렉션 확인');
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map((c) => c.name);

    log('info', `기존 컬렉션 ${existingNames.length}개 발견`);
    if (existingNames.length > 0) {
      console.log(`   ${colors.cyan}${existingNames.join(', ')}${colors.reset}`);
    }

    // 컬렉션 생성
    logSection('3. 컬렉션 생성');

    const collections = [
      COLLECTIONS.WORKFLOWS,
      COLLECTIONS.EXECUTIONS,
      COLLECTIONS.AGENT_LOGS,
      COLLECTIONS.ERROR_PATTERNS,
    ];

    for (const collectionName of collections) {
      if (existingNames.includes(collectionName)) {
        log('warning', `컬렉션 이미 존재: ${collectionName}`);
      } else {
        await db.createCollection(collectionName);
        log('success', `컬렉션 생성: ${collectionName}`);
      }
    }

    // 인덱스 및 검증 규칙 설정
    logSection('4. 인덱스 및 검증 규칙 설정');

    // Workflows
    log('info', 'Workflows 컬렉션 초기화 중...');
    await initializeWorkflowCollection(db.collection(COLLECTIONS.WORKFLOWS), db);

    // Executions
    log('info', 'Executions 컬렉션 초기화 중...');
    await initializeExecutionCollection(db.collection(COLLECTIONS.EXECUTIONS), db);

    // Agent Logs
    log('info', 'Agent Logs 컬렉션 초기화 중...');
    await initializeAgentLogCollection(db.collection(COLLECTIONS.AGENT_LOGS), db);

    // Error Patterns
    log('info', 'Error Patterns 컬렉션 초기화 중...');
    await initializeErrorPatternCollection(db.collection(COLLECTIONS.ERROR_PATTERNS), db);

    // 초기 데이터 삽입 (선택사항)
    logSection('5. 초기 데이터 삽입 (선택)');

    const errorPatternsCount = await db.collection(COLLECTIONS.ERROR_PATTERNS).countDocuments();
    if (errorPatternsCount === 0) {
      log('info', '기본 에러 패턴 삽입 중...');
      await seedErrorPatterns(db);
      log('success', '기본 에러 패턴 삽입 완료');
    } else {
      log('warning', `에러 패턴 ${errorPatternsCount}개 이미 존재`);
    }

    // 완료
    logSection('초기화 완료');

    // 통계 출력
    const stats = {
      workflows: await db.collection(COLLECTIONS.WORKFLOWS).countDocuments(),
      executions: await db.collection(COLLECTIONS.EXECUTIONS).countDocuments(),
      agentLogs: await db.collection(COLLECTIONS.AGENT_LOGS).countDocuments(),
      errorPatterns: await db.collection(COLLECTIONS.ERROR_PATTERNS).countDocuments(),
    };

    console.log(`${colors.cyan}컬렉션 통계:${colors.reset}`);
    console.log(`   Workflows: ${stats.workflows}개`);
    console.log(`   Executions: ${stats.executions}개`);
    console.log(`   Agent Logs: ${stats.agentLogs}개`);
    console.log(`   Error Patterns: ${stats.errorPatterns}개`);

    log('success', 'MongoDB 초기화 완료');

    console.log(`\n${colors.cyan}다음 단계:${colors.reset}`);
    console.log(`1. MongoDB 연결 테스트:`);
    console.log(`   npm run test:mongodb`);
    console.log();
    console.log(`2. n8n 워크플로우 동기화:`);
    console.log(`   npm run sync:workflows`);
    console.log();
  } catch (error) {
    log('error', `초기화 실패: ${error instanceof Error ? error.message : error}`);

    if (error instanceof Error && error.stack) {
      console.error(`\n${colors.red}오류 상세:${colors.reset}`);
      console.error(error.stack);
    }

    console.log(`\n${colors.yellow}문제 해결:${colors.reset}`);
    console.log(`1. MongoDB 컨테이너가 실행 중인지 확인:`);
    console.log(`   docker ps | grep mongo`);
    console.log();
    console.log(`2. MONGODB_URI 환경 변수 확인:`);
    console.log(`   echo $MONGODB_URI`);
    console.log();
    console.log(`3. MongoDB 연결 테스트:`);
    console.log(`   mongosh "${mongoUri}"`);
    console.log();

    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('info', 'MongoDB 연결 종료');
    }
  }
}

/**
 * 기본 에러 패턴 삽입
 */
async function seedErrorPatterns(db: Db): Promise<void> {
  const defaultPatterns = [
    {
      errorType: 'mongodb-connection-timeout',
      category: 'connection',
      pattern: 'MongoServerError.*connection.*timeout',
      description: 'MongoDB 연결 타임아웃',
      frequency: 0,
      solutions: [
        {
          title: 'MongoDB 컨테이너 재시작',
          description: 'MongoDB Docker 컨테이너를 재시작합니다',
          command: 'docker restart my-mongodb-container',
          requiresApproval: false,
          successRate: 0.9,
        },
      ],
      autoFixEnabled: true,
      severity: 'high',
      tags: ['mongodb', 'connection', 'timeout'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      errorType: 'n8n-authentication-failed',
      category: 'authentication',
      pattern: 'authentication.*failed|unauthorized|401',
      description: 'n8n API 인증 실패',
      frequency: 0,
      solutions: [
        {
          title: 'API Key 재확인',
          description: 'n8n API Key가 유효한지 확인하고 재설정합니다',
          requiresApproval: true,
          successRate: 0.95,
        },
      ],
      autoFixEnabled: false,
      severity: 'critical',
      tags: ['n8n', 'authentication', 'api'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      errorType: 'workflow-execution-timeout',
      category: 'timeout',
      pattern: 'execution.*timeout|timed out',
      description: '워크플로우 실행 타임아웃',
      frequency: 0,
      solutions: [
        {
          title: '타임아웃 설정 증가',
          description: '워크플로우 설정에서 executionTimeout 값을 증가시킵니다',
          requiresApproval: true,
          successRate: 0.8,
        },
      ],
      autoFixEnabled: false,
      severity: 'medium',
      tags: ['workflow', 'timeout', 'execution'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      errorType: 'network-connection-refused',
      category: 'network',
      pattern: 'ECONNREFUSED|connection refused',
      description: '네트워크 연결 거부',
      frequency: 0,
      solutions: [
        {
          title: '네트워크 연결 확인',
          description: '대상 서버의 연결 가능 여부를 확인합니다',
          requiresApproval: false,
          successRate: 0.7,
        },
      ],
      autoFixEnabled: false,
      severity: 'high',
      tags: ['network', 'connection'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      errorType: 'data-validation-failed',
      category: 'data',
      pattern: 'validation.*failed|invalid.*data',
      description: '데이터 검증 실패',
      frequency: 0,
      solutions: [
        {
          title: '입력 데이터 형식 확인',
          description: '노드의 입력 데이터 스키마를 확인하고 수정합니다',
          requiresApproval: true,
          successRate: 0.85,
        },
      ],
      autoFixEnabled: false,
      severity: 'medium',
      tags: ['data', 'validation'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.collection(COLLECTIONS.ERROR_PATTERNS).insertMany(defaultPatterns);
  log('success', `${defaultPatterns.length}개의 기본 에러 패턴 삽입 완료`);
}

// 스크립트 실행
if (require.main === module) {
  // .env 파일 로드
  try {
    require('dotenv').config();
  } catch {
    console.log(`${colors.yellow}⚠️  dotenv 패키지가 없습니다${colors.reset}`);
  }

  initializeDatabase();
}

export { initializeDatabase, seedErrorPatterns };
