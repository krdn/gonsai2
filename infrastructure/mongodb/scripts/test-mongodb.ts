#!/usr/bin/env ts-node
/**
 * MongoDB Connection and Schema Test Script
 *
 * @description MongoDB 연결 및 스키마 테스트
 *
 * Usage:
 *   npx ts-node infrastructure/mongodb/scripts/test-mongodb.ts
 */

import { MongoClient, Db } from 'mongodb';
import { COLLECTIONS } from '../schemas/types';
import { createWorkflowDocument } from '../schemas/workflow.schema';
import { createExecutionDocument } from '../schemas/execution.schema';
import { createAgentLogDocument } from '../schemas/agent-log.schema';

// ANSI 색상
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
 * 메인 테스트 함수
 */
async function runMongoDBTest(): Promise<void> {
  console.log(`${colors.cyan}MongoDB Connection and Schema Test${colors.reset}\n`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gonsai2';
  const dbName = new URL(mongoUri).pathname.slice(1) || 'gonsai2';

  let client: MongoClient | null = null;
  let totalTests = 0;
  let passedTests = 0;

  try {
    // 1. MongoDB 연결 테스트
    logSection('1. MongoDB 연결 테스트');
    totalTests++;

    log('info', `MongoDB URI: ${mongoUri}`);
    log('info', `Database: ${dbName}`);
    log('info', '연결 시도 중...');

    client = new MongoClient(mongoUri);
    await client.connect();

    log('success', 'MongoDB 연결 성공');
    passedTests++;

    const db: Db = client.db(dbName);

    // 2. 컬렉션 확인
    logSection('2. 컬렉션 확인');
    totalTests++;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    log('info', `컬렉션 ${collections.length}개 발견`);
    console.log(`   ${colors.cyan}${collectionNames.join(', ')}${colors.reset}`);

    const requiredCollections = Object.values(COLLECTIONS);
    const missingCollections = requiredCollections.filter(
      (name) => !collectionNames.includes(name)
    );

    if (missingCollections.length > 0) {
      log('warning', `누락된 컬렉션: ${missingCollections.join(', ')}`);
      log('info', '초기화 스크립트를 실행하세요: npm run init:mongodb');
    } else {
      log('success', '모든 필수 컬렉션 존재');
      passedTests++;
    }

    // 3. 인덱스 확인
    logSection('3. 인덱스 확인');

    for (const collectionName of requiredCollections) {
      if (!collectionNames.includes(collectionName)) {
        log('warning', `컬렉션 ${collectionName} 없음 - 건너뜀`);
        continue;
      }

      totalTests++;
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();

      log('info', `${collectionName}: ${indexes.length}개 인덱스`);
      console.log(`   ${colors.cyan}${indexes.map((idx) => idx.name).join(', ')}${colors.reset}`);
      passedTests++;
    }

    // 4. 문서 삽입 테스트
    logSection('4. 문서 삽입 테스트');

    // 테스트 Workflow
    if (collectionNames.includes(COLLECTIONS.WORKFLOWS)) {
      totalTests++;
      try {
        const testWorkflow = createWorkflowDocument(
          'test-workflow-' + Date.now(),
          'Test Workflow',
          {
            description: 'Test workflow for schema validation',
            active: true,
            nodes: [
              {
                id: 'node-1',
                name: 'Start',
                type: 'n8n-nodes-base.start',
                typeVersion: 1,
                position: [100, 200],
              },
            ],
            settings: {},
          }
        );

        const result = await db.collection(COLLECTIONS.WORKFLOWS).insertOne(testWorkflow as any);
        log('success', `Workflow 문서 삽입: ${result.insertedId}`);

        // 삽입된 문서 삭제 (테스트 정리)
        await db.collection(COLLECTIONS.WORKFLOWS).deleteOne({ _id: result.insertedId });
        passedTests++;
      } catch (error) {
        log('error', `Workflow 삽입 실패: ${error instanceof Error ? error.message : error}`);
      }
    }

    // 테스트 Execution
    if (collectionNames.includes(COLLECTIONS.EXECUTIONS)) {
      totalTests++;
      try {
        const testExecution = createExecutionDocument(
          'test-exec-' + Date.now(),
          'test-wf-id',
          'test-n8n-wf-id',
          {
            status: 'success',
            mode: 'manual',
            startedAt: new Date(),
            finishedAt: new Date(),
            executionTime: 1000,
          }
        );

        const result = await db.collection(COLLECTIONS.EXECUTIONS).insertOne(testExecution as any);
        log('success', `Execution 문서 삽입: ${result.insertedId}`);

        // 삽입된 문서 삭제
        await db.collection(COLLECTIONS.EXECUTIONS).deleteOne({ _id: result.insertedId });
        passedTests++;
      } catch (error) {
        log('error', `Execution 삽입 실패: ${error instanceof Error ? error.message : error}`);
      }
    }

    // 테스트 Agent Log
    if (collectionNames.includes(COLLECTIONS.AGENT_LOGS)) {
      totalTests++;
      try {
        const testLog = createAgentLogDocument('test-agent', 'test-exec-id', 'test-action', {
          result: 'success',
          totalTokens: 100,
          cost: 0.01,
          model: 'test-model',
          duration: 500,
        });

        const result = await db.collection(COLLECTIONS.AGENT_LOGS).insertOne(testLog as any);
        log('success', `Agent Log 문서 삽입: ${result.insertedId}`);

        // 삽입된 문서 삭제
        await db.collection(COLLECTIONS.AGENT_LOGS).deleteOne({ _id: result.insertedId });
        passedTests++;
      } catch (error) {
        log('error', `Agent Log 삽입 실패: ${error instanceof Error ? error.message : error}`);
      }
    }

    // 5. 쿼리 테스트
    logSection('5. 쿼리 성능 테스트');
    totalTests++;

    if (collectionNames.includes(COLLECTIONS.WORKFLOWS)) {
      const start = Date.now();
      const count = await db.collection(COLLECTIONS.WORKFLOWS).countDocuments();
      const duration = Date.now() - start;

      log('info', `Workflows 개수 조회: ${count}개 (${duration}ms)`);
      log(duration < 100 ? 'success' : 'warning', `쿼리 성능: ${duration}ms`);
      passedTests++;
    }

    // 6. 통계 출력
    logSection('테스트 결과 요약');

    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`총 테스트: ${totalTests}`);
    console.log(`${colors.green}통과: ${passedTests}${colors.reset}`);
    console.log(`${colors.red}실패: ${totalTests - passedTests}${colors.reset}`);
    console.log(`성공률: ${successRate}%\n`);

    if (passedTests === totalTests) {
      log('success', '모든 테스트 통과! MongoDB가 정상 작동합니다.');
    } else {
      log('warning', '일부 테스트 실패. 설정을 확인하세요.');
    }

    // 다음 단계
    console.log(`\n${colors.cyan}다음 단계:${colors.reset}`);
    console.log(`1. n8n 워크플로우와 MongoDB 동기화:`);
    console.log(`   npm run sync:workflows`);
    console.log();
    console.log(`2. 실시간 워크플로우 모니터링 시작:`);
    console.log(`   npm run monitor:workflows`);
    console.log();

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (error) {
    log('error', `테스트 실패: ${error instanceof Error ? error.message : error}`);

    if (error instanceof Error && error.stack) {
      console.error(`\n${colors.red}오류 상세:${colors.reset}`);
      console.error(error.stack);
    }

    console.log(`\n${colors.yellow}문제 해결:${colors.reset}`);
    console.log(`1. MongoDB 컨테이너 확인:`);
    console.log(`   docker ps | grep mongo`);
    console.log();
    console.log(`2. 컨테이너가 없으면 시작:`);
    console.log(`   cd /home/gon/docker-mongo-ubuntu && docker-compose up -d`);
    console.log();
    console.log(`3. MongoDB 초기화 실행:`);
    console.log(`   npm run init:mongodb`);
    console.log();

    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log('info', 'MongoDB 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  // .env 파일 로드
  try {
    require('dotenv').config();
  } catch {
    console.log(`${colors.yellow}⚠️  dotenv 패키지가 없습니다${colors.reset}`);
  }

  runMongoDBTest();
}

export { runMongoDBTest };
