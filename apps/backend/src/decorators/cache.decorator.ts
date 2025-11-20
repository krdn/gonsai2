/**
 * Cache Decorators
 *
 * @description 캐시 적용을 위한 데코레이터
 */

import { cacheService, CacheOptions } from '../services/cache.service';
import { log } from '../utils/logger';

/**
 * 메서드 결과 캐싱 데코레이터
 */
export function Cacheable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: CacheOptions & { keyGenerator?: (...args: any[]) => string }
) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      // 캐시 키 생성
      const cacheKey = options?.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      try {
        // 캐시 조회
        const cached = await cacheService.get(cacheKey, options);
        if (cached !== null) {
          log.debug('Cache hit', { key: cacheKey });
          return cached;
        }

        // 캐시 미스 - 원본 메서드 실행
        log.debug('Cache miss', { key: cacheKey });
        const result = await originalMethod.apply(this, args);

        // 결과 캐싱
        await cacheService.set(cacheKey, result, options);

        return result;
      } catch (error) {
        log.error('Cache decorator error', error, { key: cacheKey });
        // 캐시 에러 시 원본 메서드 실행
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 메서드 실행 후 캐시 무효화 데코레이터
 */
export function CacheEvict(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patterns: string[] | ((result: any, ...args: any[]) => string[])
) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        // 패턴 생성
        const evictPatterns = typeof patterns === 'function' ? patterns(result, ...args) : patterns;

        // 캐시 무효화
        for (const pattern of evictPatterns) {
          await cacheService.deletePattern(pattern);
          log.debug('Cache evicted', { pattern });
        }
      } catch (error) {
        log.error('Cache eviction error', error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 메서드 실행 후 특정 캐시 키 업데이트 데코레이터
 */
export function CachePut(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: CacheOptions & { keyGenerator: (...args: any[]) => string }
) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      try {
        // 캐시 키 생성
        const cacheKey = options.keyGenerator(...args);

        // 결과 캐싱
        await cacheService.set(cacheKey, result, options);
        log.debug('Cache updated', { key: cacheKey });
      } catch (error) {
        log.error('Cache update error', error);
      }

      return result;
    };

    return descriptor;
  };
}
