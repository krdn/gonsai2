'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Clock, AlertTriangle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { getSocketClient, type MetricUpdate } from '@/lib/socket-client';

interface MetricsChartsProps {
  className?: string;
}

interface MetricDataPoint extends MetricUpdate {
  time: string;
}

export function MetricsCharts({ className = '' }: MetricsChartsProps) {
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<MetricUpdate | null>(null);
  const MAX_DATA_POINTS = 60; // 60분

  useEffect(() => {
    const socket = getSocketClient();

    const handleMetricUpdate = (data: MetricUpdate) => {
      const dataPoint: MetricDataPoint = {
        ...data,
        time: format(new Date(data.timestamp), 'HH:mm'),
      };

      setMetrics((prev) => {
        const newMetrics = [...prev, dataPoint].slice(-MAX_DATA_POINTS);
        return newMetrics;
      });

      setCurrentMetrics(data);
    };

    socket.onMetricUpdate(handleMetricUpdate);

    return () => {
      socket.offMetricUpdate(handleMetricUpdate);
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Current Metrics Cards */}
      {currentMetrics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-500" />
              <span className="text-sm text-gray-600">실행/분</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {currentMetrics.executionsPerMinute.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              활성: {currentMetrics.activeExecutions}개
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-600">평균 시간</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(currentMetrics.averageExecutionTime / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-gray-500 mt-1">
              대기: {currentMetrics.queueLength}개
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-gray-600">오류율</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {(currentMetrics.errorRate * 100).toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${
              currentMetrics.errorRate > 0.1 ? 'text-red-600' : 'text-green-600'
            }`}>
              {currentMetrics.errorRate > 0.1 ? '⚠️ 높음' : '✓ 정상'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-gray-600">AI 토큰</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {currentMetrics.aiTokensUsed?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              누적 사용량
            </div>
          </div>
        </div>
      )}

      {/* Execution Trend Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">실행 추이 (시간별)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={metrics}>
            <defs>
              <linearGradient id="colorExecutions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Area
              type="monotone"
              dataKey="executionsPerMinute"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorExecutions)"
              name="실행/분"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Execution Time and Error Rate */}
      <div className="grid grid-cols-2 gap-6">
        {/* Average Execution Time */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">평균 실행 시간 (초)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${(value / 1000).toFixed(2)}s`, '평균 시간']}
              />
              <Line
                type="monotone"
                dataKey="averageExecutionTime"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="평균 시간 (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Error Rate */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">오류율 (%)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="colorError" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, '오류율']}
              />
              <Area
                type="monotone"
                dataKey="errorRate"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorError)"
                name="오류율"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Queue and Active Executions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">큐 길이 & 활성 실행</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={metrics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="queueLength" fill="#f59e0b" name="대기 중" />
            <Bar dataKey="activeExecutions" fill="#10b981" name="실행 중" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI Token Usage */}
      {metrics.some(m => m.aiTokensUsed) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">AI 토큰 사용량</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={metrics}>
              <defs>
                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toLocaleString(), 'AI 토큰']}
              />
              <Area
                type="monotone"
                dataKey="aiTokensUsed"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorTokens)"
                name="AI 토큰"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
