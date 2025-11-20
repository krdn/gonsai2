/**
 * Monitoring Components
 *
 * Export all monitoring dashboard components
 */

import dynamic from 'next/dynamic';

export { ExecutionList } from './ExecutionList';
export { LogStream } from './LogStream';
export { NotificationCenter } from './NotificationCenter';

/**
 * MetricsCharts - Dynamically imported with lazy loading
 *
 * Recharts 라이브러리가 포함된 차트 컴포넌트를 지연 로딩하여
 * 초기 번들 사이즈를 줄이고 페이지 로딩 성능을 개선합니다.
 *
 * - SSR 비활성화: Recharts는 브라우저 API(window, document)를 사용
 * - 로딩 스켈레톤: 차트 로딩 중 시각적 피드백 제공
 */
export const MetricsCharts = dynamic(
  () => import('./MetricsCharts').then((mod) => mod.MetricsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 animate-pulse">
        {/* Current Metrics Cards Skeleton */}
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-20 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>

        {/* Chart Skeletons */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-[200px] bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-400 text-sm">차트 로딩 중...</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
              <div className="h-[200px] bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
          <div className="h-[200px] bg-gray-100 rounded" />
        </div>
      </div>
    ),
  }
);
