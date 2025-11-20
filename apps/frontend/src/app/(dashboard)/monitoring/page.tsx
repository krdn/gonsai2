'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Wifi, WifiOff, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  ExecutionList,
  LogStream,
  MetricsCharts,
  NotificationCenter,
} from '@/components/monitoring';
import { getWebSocketClient } from '@/lib/websocket';
import { useMonitoringStats } from '@/hooks/useMonitoring';

export default function MonitoringPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // React Query로 통계 데이터 관리 (자동 캐싱 및 갱신)
  const { data: stats, isLoading: isLoadingStats } = useMonitoringStats({
    refetchInterval: 60000, // 1분마다 자동 갱신
  });

  useEffect(() => {
    // WebSocket 연결
    const socket = getWebSocketClient();

    const connectToSocket = async () => {
      try {
        await socket.connect();
        setIsConnected(socket.isConnected());
        setIsConnecting(false);
      } catch (error) {
        console.error('[Monitoring] WebSocket connection failed:', error);
        setIsConnected(false);
        setIsConnecting(false);
      }
    };

    connectToSocket();

    // Reconnection listener
    const checkConnection = setInterval(() => {
      setIsConnected(socket.isConnected());
    }, 5000);

    return () => {
      clearInterval(checkConnection);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">실시간 모니터링</h1>
                <p className="text-sm text-gray-500">n8n 워크플로우 실행 상태 및 로그</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnecting ? (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-600">연결 중...</span>
                  </>
                ) : isConnected ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-green-600 font-semibold">연결됨</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-600 font-semibold">연결 끊김</span>
                  </>
                )}
              </div>

              {/* Notification Center */}
              <NotificationCenter />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {!isConnected && !isConnecting && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <WifiOff className="w-5 h-5" />
              <span className="font-semibold">
                Socket.io 서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인하세요.
              </span>
            </div>
            <div className="mt-2 text-sm text-red-700">
              환경 변수 NEXT_PUBLIC_SOCKET_URL을 확인하세요. (기본값: http://localhost:4000)
            </div>
          </div>
        )}

        {/* 시스템 통계 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Executions */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 실행 (24h)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalExecutions}</p>
                  <p className="text-xs text-gray-500 mt-1">활성: {stats.runningExecutions}개</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">성공률</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.successRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">성공: {stats.successfulExecutions}건</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Failed Executions */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">실패 횟수</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.failedExecutions}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalExecutions > 0
                      ? `${((stats.failedExecutions / stats.totalExecutions) * 100).toFixed(1)}%`
                      : '0%'}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            {/* Average Execution Time */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 실행 시간</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {(stats.avgExecutionTime / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stats.period}</p>
                </div>
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - Execution List & Logs */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Execution List */}
            <ExecutionList />

            {/* Log Stream */}
            <LogStream className="h-[600px]" />
          </div>

          {/* Right Column - Metrics Charts */}
          <div className="col-span-12 lg:col-span-7">
            <MetricsCharts />
          </div>
        </div>
      </div>
    </div>
  );
}
