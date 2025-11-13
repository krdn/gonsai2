/**
 * Service Container
 *
 * @description 의존성 주입 컨테이너
 */

import { databaseService } from '../services/database.service';
import { cacheService } from '../services/cache.service';
import { healthCheckService } from '../services/health-check.service';
import { userRepository } from '../repositories/user.repository';
import { log } from '../utils/logger';

/**
 * 서비스 타입 정의
 */
export interface ServiceContainer {
  // Infrastructure
  database: typeof databaseService;
  cache: typeof cacheService;
  healthCheck: typeof healthCheckService;

  // Repositories
  userRepository: typeof userRepository;
}

/**
 * Service Container 싱글톤
 */
class Container {
  private services: Partial<ServiceContainer> = {};
  private initialized = false;

  /**
   * 컨테이너 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn('Service container already initialized');
      return;
    }

    log.info('Initializing service container...');

    // 서비스 등록
    this.services = {
      database: databaseService,
      cache: cacheService,
      healthCheck: healthCheckService,
      userRepository: userRepository,
    };

    // 데이터베이스 연결
    await this.services.database!.connect();

    // 캐시 연결 (선택사항)
    await this.services.cache!.connect();

    this.initialized = true;
    log.info('Service container initialized successfully');
  }

  /**
   * 서비스 조회
   */
  get<K extends keyof ServiceContainer>(serviceName: K): ServiceContainer[K] {
    if (!this.initialized) {
      throw new Error('Service container not initialized. Call initialize() first.');
    }

    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service '${String(serviceName)}' not found in container`);
    }

    return service as ServiceContainer[K];
  }

  /**
   * 컨테이너 정리
   */
  async dispose(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    log.info('Disposing service container...');

    // 연결 종료
    await this.services.cache?.disconnect();
    await this.services.database?.disconnect();

    this.services = {};
    this.initialized = false;

    log.info('Service container disposed');
  }

  /**
   * 초기화 여부 확인
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton 인스턴스
export const container = new Container();
