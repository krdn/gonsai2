'use client';

import React, { useEffect, useState } from 'react';
import { Play, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getSocketClient, type ExecutionUpdate } from '@/lib/socket-client';
import { formatExecutionTime } from '@/lib/workflow-utils';
import { monitoringApi } from '@/lib/api-client';

interface ExecutionListProps {
  className?: string;
}

type ExecutionStatus = 'running' | 'waiting' | 'success' | 'error';

interface ExecutionGroup {
  running: ExecutionUpdate[];
  waiting: ExecutionUpdate[];
  completed: ExecutionUpdate[];
  failed: ExecutionUpdate[];
}

interface RecentExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  duration?: number;
}

export function ExecutionList({ className = '' }: ExecutionListProps) {
  const [executions, setExecutions] = useState<ExecutionGroup>({
    running: [],
    waiting: [],
    completed: [],
    failed: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // REST API로 초기 데이터 로드
  const loadExecutions = async () => {
    try {
      setIsRefreshing(true);
      const response = await monitoringApi.recentExecutions(20);

      if (response.success && response.data) {
        const grouped: ExecutionGroup = {
          running: [],
          waiting: [],
          completed: [],
          failed: [],
        };

        response.data.forEach((exec: RecentExecution) => {
          const executionData: ExecutionUpdate = {
            executionId: exec.id,
            workflowId: exec.workflowId,
            workflowName: exec.workflowName,
            status: exec.status as ExecutionStatus,
            startedAt: exec.startedAt,
            stoppedAt: exec.stoppedAt,
          };

          switch (exec.status) {
            case 'running':
              grouped.running.push(executionData);
              break;
            case 'waiting':
              grouped.waiting.push(executionData);
              break;
            case 'success':
              grouped.completed.push(executionData);
              break;
            case 'error':
              grouped.failed.push(executionData);
              break;
          }
        });

        setExecutions(grouped);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load executions:', err);
      setError('실행 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 초기 데이터 로드
    loadExecutions();

    // WebSocket으로 실시간 업데이트 수신
    const socket = getSocketClient();

    const handleExecutionUpdate = (data: ExecutionUpdate) => {
      setExecutions((prev) => {
        const newState = { ...prev };

        // Remove from all groups first
        Object.keys(newState).forEach((key) => {
          newState[key as keyof ExecutionGroup] = newState[key as keyof ExecutionGroup].filter(
            (exec) => exec.executionId !== data.executionId
          );
        });

        // Add to appropriate group
        switch (data.status) {
          case 'running':
            newState.running = [data, ...newState.running].slice(0, 10);
            break;
          case 'waiting':
            newState.waiting = [data, ...newState.waiting].slice(0, 10);
            break;
          case 'success':
            newState.completed = [data, ...newState.completed].slice(0, 10);
            break;
          case 'error':
            newState.failed = [data, ...newState.failed].slice(0, 10);
            break;
        }

        return newState;
      });
    };

    socket.onExecutionUpdate(handleExecutionUpdate);
    socket.onExecutionStarted(handleExecutionUpdate);
    socket.onExecutionFinished(handleExecutionUpdate);
    socket.onExecutionError(handleExecutionUpdate);

    // 30초마다 자동 새로고침
    const refreshInterval = setInterval(loadExecutions, 30000);

    return () => {
      socket.offExecutionUpdate(handleExecutionUpdate);
      socket.offExecutionStarted(handleExecutionUpdate);
      socket.offExecutionFinished(handleExecutionUpdate);
      socket.offExecutionError(handleExecutionUpdate);
      clearInterval(refreshInterval);
    };
  }, []);

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: ExecutionStatus) => {
    switch (status) {
      case 'running':
        return '실행 중';
      case 'waiting':
        return '대기 중';
      case 'success':
        return '완료';
      case 'error':
        return '실패';
    }
  };

  const renderExecutionItem = (execution: ExecutionUpdate) => {
    const duration = execution.stoppedAt
      ? new Date(execution.stoppedAt).getTime() - new Date(execution.startedAt).getTime()
      : Date.now() - new Date(execution.startedAt).getTime();

    return (
      <div
        key={execution.executionId}
        className={`p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
          execution.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            {getStatusIcon(execution.status)}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {execution.workflowName}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {execution.currentNode && (
                  <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded mr-2">
                    {execution.currentNode}
                  </span>
                )}
                {formatDistanceToNow(new Date(execution.startedAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </div>
              {execution.progress !== undefined && execution.status === 'running' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>진행률</span>
                    <span>{execution.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${execution.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-xs font-mono text-gray-600 ml-3">
            {formatExecutionTime(duration)}
          </div>
        </div>
      </div>
    );
  };

  const totalExecutions =
    executions.running.length +
    executions.waiting.length +
    executions.completed.length +
    executions.failed.length;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">실시간 실행 목록</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={loadExecutions}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Play className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">총 {totalExecutions}개</span>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="p-2 bg-blue-50 rounded">
            <div className="text-xs text-blue-600">실행 중</div>
            <div className="text-lg font-bold text-blue-900">{executions.running.length}</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded">
            <div className="text-xs text-yellow-600">대기</div>
            <div className="text-lg font-bold text-yellow-900">{executions.waiting.length}</div>
          </div>
          <div className="p-2 bg-green-50 rounded">
            <div className="text-xs text-green-600">완료</div>
            <div className="text-lg font-bold text-green-900">{executions.completed.length}</div>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <div className="text-xs text-red-600">실패</div>
            <div className="text-lg font-bold text-red-900">{executions.failed.length}</div>
          </div>
        </div>
      </div>

      {/* Execution Groups */}
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500">데이터를 불러오는 중...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={loadExecutions}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Running */}
        {!isLoading && !error && executions.running.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <h4 className="text-sm font-semibold text-gray-700">
                실행 중 ({executions.running.length})
              </h4>
            </div>
            <div className="space-y-2">{executions.running.map(renderExecutionItem)}</div>
          </div>
        )}

        {/* Waiting */}
        {!isLoading && !error && executions.waiting.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <h4 className="text-sm font-semibold text-gray-700">
                대기 중 ({executions.waiting.length})
              </h4>
            </div>
            <div className="space-y-2">{executions.waiting.map(renderExecutionItem)}</div>
          </div>
        )}

        {/* Failed (Highlighted) */}
        {!isLoading && !error && executions.failed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <h4 className="text-sm font-semibold text-red-700">
                실패 ({executions.failed.length})
              </h4>
            </div>
            <div className="space-y-2">{executions.failed.map(renderExecutionItem)}</div>
          </div>
        )}

        {/* Completed */}
        {!isLoading && !error && executions.completed.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h4 className="text-sm font-semibold text-gray-700">
                최근 완료 ({executions.completed.length})
              </h4>
            </div>
            <div className="space-y-2">{executions.completed.map(renderExecutionItem)}</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && totalExecutions === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">실행 중인 워크플로우가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
