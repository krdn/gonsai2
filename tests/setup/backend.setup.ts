/**
 * Backend Test Setup
 *
 * Jest 백엔드 테스트 환경 초기화
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongod: MongoMemoryServer | null = null;
let mongoClient: MongoClient | null = null;

/**
 * 전역 테스트 설정
 */
beforeAll(async () => {
  // MongoDB Memory Server 시작
  mongod = await MongoMemoryServer.create({
    instance: {
      dbName: 'test_gonsai2',
    },
  });

  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  mongoClient = new MongoClient(uri);
  await mongoClient.connect();

  console.log('🧪 Test MongoDB started:', uri);
});

/**
 * 전역 테스트 정리
 */
afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }

  if (mongod) {
    await mongod.stop();
  }

  console.log('✅ Test MongoDB stopped');
});

/**
 * 각 테스트 후 데이터베이스 정리
 */
afterEach(async () => {
  if (mongoClient) {
    const db = mongoClient.db();
    const collections = await db.collections();

    // 모든 컬렉션 데이터 삭제 (구조는 유지)
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

/**
 * 환경 변수 설정
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Random port
process.env.JWT_SECRET = 'test_secret_key_do_not_use_in_production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

/**
 * 콘솔 로그 제한 (테스트 출력 정리)
 */
global.console = {
  ...console,
  log: jest.fn(), // console.log 무시
  error: console.error, // error는 유지
  warn: console.warn, // warn은 유지
  info: jest.fn(), // info 무시
  debug: jest.fn(), // debug 무시
};
