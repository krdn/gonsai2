/**
 * Frontend Optimization Utilities
 *
 * Lazy loading, code splitting, and caching strategies for Next.js frontend.
 */

import { ComponentType, lazy, Suspense } from 'react';

/**
 * Lazy load component with loading fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload component for better UX
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): void {
  importFunc();
}

/**
 * Intersection Observer hook for lazy loading on scroll
 */
export function useLazyLoadOnScroll(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
): void {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        callback();
        observer.disconnect();
      }
    },
    { threshold: 0.1, ...options }
  );

  if (ref.current) {
    observer.observe(ref.current);
  }
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Image optimization helper
 */
export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  sizes?: string;
  priority?: boolean;
}

export function getOptimizedImageProps(
  src: string,
  alt: string,
  options: ImageOptimizationOptions = {}
): any {
  const {
    quality = 75,
    format = 'auto',
    sizes = '100vw',
    priority = false
  } = options;

  return {
    src,
    alt,
    quality,
    sizes,
    priority,
    loading: priority ? 'eager' : 'lazy',
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/svg+xml;base64,...', // Add actual blur data
  };
}

/**
 * Local storage with expiry
 */
export class CachedStorage {
  private static prefix = 'cached_';

  static set(key: string, value: any, ttl: number = 3600000): void {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.error('Failed to cache in localStorage:', error);
    }
  }

  static get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);

      if (!itemStr) return null;

      const item = JSON.parse(itemStr);

      if (Date.now() > item.expiry) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      console.error('Failed to get from localStorage:', error);
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  static clear(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

/**
 * Request deduplication for API calls
 */
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();

  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if request is already pending
    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    // Start new request
    const promise = fetcher()
      .finally(() => {
        this.pending.delete(key);
      });

    this.pending.set(key, promise);

    return promise;
  }

  clear(): void {
    this.pending.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Virtual list for large datasets
 */
export interface VirtualListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVirtualList(
  scrollTop: number,
  totalItems: number,
  options: VirtualListOptions
): { startIndex: number; endIndex: number; offsetY: number } {
  const { itemHeight, containerHeight, overscan = 3 } = options;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

/**
 * Code splitting route manifest
 */
export const ROUTE_CHUNKS = {
  workflows: () => import('@/components/workflows/WorkflowList'),
  workflowEditor: () => import('@/components/workflows/WorkflowEditor'),
  executions: () => import('@/components/executions/ExecutionList'),
  dashboard: () => import('@/components/dashboard/Dashboard'),
  settings: () => import('@/components/settings/Settings'),
} as const;

/**
 * Preload critical routes
 */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;

  // Preload workflows and dashboard on idle
  requestIdleCallback(() => {
    ROUTE_CHUNKS.workflows();
    ROUTE_CHUNKS.dashboard();
  });
}

/**
 * Service Worker registration for offline support
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ Service Worker registered:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New Service Worker available, please refresh');
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
  }
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : clearTimeout;
