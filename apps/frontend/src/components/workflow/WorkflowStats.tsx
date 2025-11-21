'use client';

import React from 'react';
import { Activity, Clock, TrendingUp, Bot, CheckCircle2, XCircle } from 'lucide-react';
import { formatExecutionTime } from '@/lib/workflow-utils';
import type { WorkflowStatistics } from '@/types/workflow';

interface WorkflowStatsProps {
  statistics: WorkflowStatistics;
  className?: string;
}

export function WorkflowStats({ statistics, className = '' }: WorkflowStatsProps) {
  const successRate =
    statistics.totalExecutions > 0
      ? ((statistics.successfulExecutions / statistics.totalExecutions) * 100).toFixed(1)
      : '0';

  const errorRate =
    statistics.totalExecutions > 0
      ? ((statistics.failedExecutions / statistics.totalExecutions) * 100).toFixed(1)
      : '0';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">워크플로우 통계</h3>
        <p className="text-sm text-gray-500">실행 성과 및 AI 사용 현황</p>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {/* Total Executions */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">총 실행</span>
          </div>
          <div className="text-3xl font-bold text-blue-900">{statistics.totalExecutions}</div>
          <div className="text-xs text-blue-700 mt-1">누적 실행 횟수</div>
        </div>

        {/* Average Execution Time */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">평균 시간</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            {formatExecutionTime(statistics.averageExecutionTime)}
          </div>
          <div className="text-xs text-purple-700 mt-1">실행당 평균 소요 시간</div>
        </div>

        {/* Success Rate */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-900">성공률</span>
          </div>
          <div className="flex items-baseline gap-1">
            <div className="text-3xl font-bold text-green-900">{successRate}%</div>
          </div>
          <div className="text-xs text-green-700 mt-1">
            성공: {statistics.successfulExecutions} / 실패: {statistics.failedExecutions}
          </div>
        </div>

        {/* AI Usage */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">AI 사용</span>
          </div>
          <div className="text-3xl font-bold text-amber-900">{statistics.aiNodesUsed || 0}</div>
          <div className="text-xs text-amber-700 mt-1">AI 노드 실행 횟수</div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">상세 분석</h4>

          <div className="space-y-3">
            {/* Success/Error Ratio */}
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>성공 / 실패 비율</span>
                <span className="font-semibold">
                  {successRate}% / {errorRate}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>

            {/* Execution Metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-500">최단 실행 시간</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatExecutionTime(statistics.minExecutionTime || 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">최장 실행 시간</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatExecutionTime(statistics.maxExecutionTime || 0)}
                </div>
              </div>
            </div>

            {/* Last Execution */}
            {statistics.lastExecutionAt && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">마지막 실행</div>
                <div className="text-sm font-semibold text-gray-900">
                  {new Date(statistics.lastExecutionAt).toLocaleString('ko-KR')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-indigo-900">성능 지표</div>
            <div className="text-xs text-indigo-700">
              {parseFloat(successRate) >= 90 && '🎉 우수: 매우 안정적인 워크플로우입니다'}
              {parseFloat(successRate) >= 70 &&
                parseFloat(successRate) < 90 &&
                '✅ 양호: 전반적으로 잘 작동하고 있습니다'}
              {parseFloat(successRate) >= 50 &&
                parseFloat(successRate) < 70 &&
                '⚠️ 주의: 일부 개선이 필요합니다'}
              {parseFloat(successRate) < 50 && '❌ 개선 필요: 오류율이 높습니다'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
