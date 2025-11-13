/**
 * Health Check Service
 *
 * @description 모든 서비스의 헬스체크 관리
 */

import { databaseService } from './database.service';
import { cacheService } from './cache.service';
import { envConfig } from '../utils/env-validator';
import { log } from '../utils/logger';
import * as os from 'os';

/**
 * 서비스 상태
 */
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * 서비스 헬스체크 결과
 */
export interface ServiceHealth {
  status: ServiceStatus;
  message?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

/**
 * 전체 헬스체크 결과
 */
export interface HealthCheckResult {
  status: ServiceStatus;
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    mongodb: ServiceHealth;
    redis: ServiceHealth;
    n8n: ServiceHealth;
  };
  system: {
    memory: {
      total: string;
      free: string;
      used: string;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
      loadAverage: number[];
    };
    process: {
      memory: {
        heapUsed: string;
        heapTotal: string;
        external: string;
        rss: string;
      };
      pid: number;
    };
  };
}

class HealthCheckService {
  /**
   * MongoDB 헬스체크
   */
  async checkMongoDB(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      if (!databaseService.isConnected()) {
        return {
          status: 'unhealthy',
          message: 'MongoDB is not connected',
        };
      }

      // Ping 테스트
      await databaseService.getDb().admin().ping();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        metadata: {
          database: databaseService.getDb().databaseName,
        },
      };
    } catch (error) {
      log.error('MongoDB health check failed', error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Redis 헬스체크
   */
  async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      if (!cacheService.isActive()) {
        return {
          status: 'degraded',
          message: 'Redis is not configured or unavailable',
        };
      }

      // 캐시 통계 조회로 연결 테스트
      const stats = await cacheService.getStats();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        metadata: {
          keys: stats.totalKeys,
          memory: stats.memoryUsage,
          hitRate: `${stats.hitRate}%`,
        },
      };
    } catch (error) {
      log.error('Redis health check failed', error);
      return {
        status: 'degraded',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * n8n API 헬스체크
   */
  async checkN8n(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${envConfig.N8N_BASE_URL}/healthz`, {
        method: 'GET',
        headers: {
          'X-N8N-API-KEY': envConfig.N8N_API_KEY,
        },
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'healthy',
          responseTime,
          metadata: {
            url: envConfig.N8N_BASE_URL,
          },
        };
      } else {
        return {
          status: 'unhealthy',
          message: `HTTP ${response.status}: ${response.statusText}`,
          responseTime,
        };
      }
    } catch (error) {
      log.error('n8n health check failed', error);
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  getSystemMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const processMemory = process.memoryUsage();

    return {
      memory: {
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        used: this.formatBytes(usedMem),
        usagePercent: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
      },
      process: {
        memory: {
          heapUsed: this.formatBytes(processMemory.heapUsed),
          heapTotal: this.formatBytes(processMemory.heapTotal),
          external: this.formatBytes(processMemory.external),
          rss: this.formatBytes(processMemory.rss),
        },
        pid: process.pid,
      },
    };
  }

  /**
   * 전체 헬스체크 실행
   */
  async checkAll(): Promise<HealthCheckResult> {
    // 모든 서비스 헬스체크 병렬 실행
    const [mongoHealth, redisHealth, n8nHealth] = await Promise.all([
      this.checkMongoDB(),
      this.checkRedis(),
      this.checkN8n(),
    ]);

    // 전체 상태 결정
    const overallStatus = this.determineOverallStatus({
      mongodb: mongoHealth,
      redis: redisHealth,
      n8n: n8nHealth,
    });

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        mongodb: mongoHealth,
        redis: redisHealth,
        n8n: n8nHealth,
      },
      system: this.getSystemMetrics(),
    };
  }

  /**
   * 전체 상태 결정
   */
  private determineOverallStatus(services: Record<string, ServiceHealth>): ServiceStatus {
    const statuses = Object.values(services).map((s) => s.status);

    // 하나라도 unhealthy면 unhealthy
    if (statuses.includes('unhealthy')) {
      // Redis는 degraded여도 괜찮음 (선택사항)
      const criticalServices = ['mongodb', 'n8n'];
      const criticalUnhealthy = Object.entries(services)
        .filter(([name]) => criticalServices.includes(name))
        .some(([, health]) => health.status === 'unhealthy');

      return criticalUnhealthy ? 'unhealthy' : 'degraded';
    }

    // 하나라도 degraded면 degraded
    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Singleton 인스턴스
export const healthCheckService = new HealthCheckService();
