/**
 * Express Server Main Entry Point
 *
 * @description Express + WebSocket 통합 서버
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer, Server as HTTPServer } from 'http';
import { envConfig, printConfig } from './utils/env-validator';
import { log } from './utils/logger';
import {
  requestLogger,
  errorHandler,
  notFoundHandler,
} from './middleware';
import { websocketService } from './services/websocket.service';
import { databaseService } from './services/database.service';

// Routes
import healthRoutes from './routes/health.routes';
import webhookRoutes from './routes/webhook.routes';
import workflowsRoutes from './routes/workflows.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

/**
 * Express 애플리케이션 생성
 */
function createApp(): Application {
  const app = express();

  // 기본 미들웨어
  app.use(helmet()); // 보안 헤더
  app.use(cors({
    origin: envConfig.NODE_ENV === 'production'
      ? ['https://your-frontend-domain.com'] // 프로덕션에서는 특정 도메인만 허용
      : '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' })); // JSON 파싱
  app.use(express.urlencoded({ extended: true })); // URL-encoded 파싱
  app.use(cookieParser()); // 쿠키 파싱
  app.use(requestLogger); // HTTP 요청 로깅

  // API 라우트
  app.get('/', healthRoutes);
  app.use('/health', healthRoutes);
  app.use('/webhooks', webhookRoutes);
  app.use('/api/workflows', workflowsRoutes);
  app.use('/api/auth', authRoutes); // 인증 라우트
  app.use('/api/users', userRoutes); // 사용자 프로필 라우트

  // 404 처리
  app.use(notFoundHandler);

  // 에러 핸들러 (마지막에 위치)
  app.use(errorHandler);

  return app;
}

/**
 * 서버 시작
 */
async function startServer(): Promise<void> {
  try {
    // 환경 변수 출력
    printConfig();

    // MongoDB 연결
    await databaseService.connect();

    // Express 앱 생성
    const app = createApp();

    // HTTP 서버 생성
    const httpServer: HTTPServer = createServer(app);

    // WebSocket 서버 초기화
    websocketService.initialize(httpServer);

    // 서버 시작
    httpServer.listen(envConfig.PORT, envConfig.HOST, () => {
      log.info('🚀 Server started successfully', {
        environment: envConfig.NODE_ENV,
        host: envConfig.HOST,
        port: envConfig.PORT,
        wsPort: envConfig.WS_PORT,
      });

      log.info('📚 API Endpoints:', {
        health: `http://${envConfig.HOST}:${envConfig.PORT}/health`,
        auth: `http://${envConfig.HOST}:${envConfig.PORT}/api/auth/login`,
        webhooks: `http://${envConfig.HOST}:${envConfig.PORT}/webhooks/n8n`,
        workflows: `http://${envConfig.HOST}:${envConfig.PORT}/api/workflows`,
        websocket: `ws://${envConfig.HOST}:${envConfig.PORT}/ws`,
      });
    });

    // Graceful shutdown
    setupGracefulShutdown(httpServer);

  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown 설정
 */
function setupGracefulShutdown(server: HTTPServer): void {
  const shutdown = async (signal: string) => {
    log.info(`${signal} received, shutting down gracefully...`);

    // 새로운 연결 거부
    server.close(() => {
      log.info('HTTP server closed');
    });

    // WebSocket 서버 종료
    websocketService.shutdown();

    // MongoDB 연결 종료
    await databaseService.disconnect();

    // 기타 정리 작업
    setTimeout(() => {
      log.info('Shutdown complete');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 예외 처리
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection', reason, { promise });
    process.exit(1);
  });
}

// 서버 시작
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
