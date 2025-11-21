/**
 * Environment Variable Validator
 *
 * @description 환경 변수 검증 및 타입 안정성 보장
 */

import { config } from 'dotenv';
import path from 'path';

// NOTE: logger.ts를 여기서 import하면 순환 참조 발생
// logger.ts가 envConfig를 import하기 때문에 printConfig()에서는 console.log 사용

// .env 파일 로드 (백엔드 디렉토리 기준)
// CI 환경에서는 환경 변수가 이미 설정되어 있으므로 override하지 않음
config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  // Server Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;

  // n8n Configuration
  N8N_BASE_URL: string;
  N8N_API_KEY: string;
  N8N_WEBHOOK_SECRET?: string;

  // MongoDB Configuration
  MONGODB_URI: string;

  // Redis Configuration (optional)
  REDIS_URI?: string;

  // WebSocket Configuration
  WS_PORT: number;

  // CORS Configuration
  ALLOWED_ORIGINS: string[];

  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * 필수 환경 변수 검증
 */
function validateEnvVariables(): AppConfig {
  const requiredVars = ['N8N_BASE_URL', 'N8N_API_KEY', 'MONGODB_URI'];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please create a .env file based on .env.example'
    );
  }

  const nodeEnv = (process.env.NODE_ENV as AppConfig['NODE_ENV']) || 'development';

  // 프로덕션 환경에서 추가 보안 검증
  if (nodeEnv === 'production') {
    const prodRequired = ['N8N_WEBHOOK_SECRET', 'CORS_ORIGINS'];
    const prodMissing = prodRequired.filter((v) => !process.env[v]);
    if (prodMissing.length > 0) {
      throw new Error(
        `Production environment requires: ${prodMissing.join(', ')}\n` +
          'Please set these environment variables for production deployment'
      );
    }
  }

  // CORS_ORIGINS 파싱 (콤마로 구분)
  const defaultOrigins = ['http://localhost:3002'];
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : defaultOrigins;

  const config: AppConfig = {
    NODE_ENV: nodeEnv,
    PORT: parseInt(process.env.PORT || '3000', 10),
    HOST: process.env.HOST || 'localhost',

    N8N_BASE_URL: process.env.N8N_BASE_URL!,
    N8N_API_KEY: process.env.N8N_API_KEY!,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,

    MONGODB_URI: process.env.MONGODB_URI!,

    REDIS_URI: process.env.REDIS_URI,

    WS_PORT: parseInt(process.env.WS_PORT || '3001', 10),

    ALLOWED_ORIGINS: allowedOrigins,

    LOG_LEVEL: (process.env.LOG_LEVEL as AppConfig['LOG_LEVEL']) || 'info',
  };

  // URL 형식 검증
  try {
    new URL(config.N8N_BASE_URL);
  } catch {
    throw new Error(`Invalid N8N_BASE_URL: ${config.N8N_BASE_URL}`);
  }

  // MongoDB URI 검증
  if (
    !config.MONGODB_URI.startsWith('mongodb://') &&
    !config.MONGODB_URI.startsWith('mongodb+srv://')
  ) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  // 포트 범위 검증
  if (config.PORT < 1024 || config.PORT > 65535) {
    throw new Error('PORT must be between 1024 and 65535');
  }

  if (config.WS_PORT < 1024 || config.WS_PORT > 65535) {
    throw new Error('WS_PORT must be between 1024 and 65535');
  }

  return config;
}

/**
 * 검증된 환경 변수 설정
 */
export const envConfig: AppConfig = validateEnvVariables();

/**
 * 환경 변수 출력 (민감 정보 마스킹)
 */
export function printConfig(): void {
  // 순환 참조 방지를 위해 console.log 사용
  // 이 함수는 서버 초기화 시점에 호출되므로 logger가 아직 준비되지 않을 수 있음
  console.log('📋 Application Configuration:');
  console.log(`  Environment: ${envConfig.NODE_ENV}`);
  console.log(`  Server: ${envConfig.HOST}:${envConfig.PORT}`);
  console.log(`  WebSocket: ${envConfig.HOST}:${envConfig.WS_PORT}`);
  console.log(`  n8n URL: ${envConfig.N8N_BASE_URL}`);
  console.log(`  n8n API Key: ${maskSecret(envConfig.N8N_API_KEY)}`);
  console.log(`  MongoDB: ${maskMongoUri(envConfig.MONGODB_URI)}`);
  console.log(`  Allowed Origins: ${envConfig.ALLOWED_ORIGINS.join(', ')}`);
  console.log(`  Log Level: ${envConfig.LOG_LEVEL}`);
}

/**
 * 시크릿 마스킹 (앞 4자리만 표시)
 */
function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

/**
 * MongoDB URI 마스킹 (비밀번호 숨김)
 */
function maskMongoUri(uri: string): string {
  return uri.replace(/:([^@]+)@/, ':****@');
}
