'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Play, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getSocketClient, type ExecutionUpdate } from '@/lib/socket-client';
import { formatExecutionTime } from '@/lib/workflow-utils';
import { useRecentExecutions, type RecentExecution } from '@/hooks/useMonitoring';

// 🔧 가상화를 위한 타입 정의
type VirtualListItem =
  | { type: 'header'; label: string; count: number; icon: React.ReactNode; colorClass: string }
  | { type: 'execution'; data: ExecutionUpdate };

// 🔧 아이템 높이 상수 (픽셀)
const ITEM_HEIGHT = {
  header: 32,
  execution: 80, // p-3 (12px * 2) + content (~56px)
};

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

export function ExecutionList({ className = '' }: ExecutionListProps) {
  // React Query로 초기 데이터 로드 (자동 캐싱 및 30초마다 갱신)
  const {
    data: recentExecutions,
    isLoading,
    error: queryError,
    refetch,
    isRefetching,
  } = useRecentExecutions(20, { refetchInterval: 30000 });

  // WebSocket 실시간 업데이트를 위한 로컬 상태
  const [wsUpdates, setWsUpdates] = useState<Map<string, ExecutionUpdate>>(new Map());

  // API 데이터와 WebSocket 업데이트를 병합하여 그룹화
  const executions = useMemo(() => {
    const grouped: ExecutionGroup = {
      running: [],
      waiting: [],
      completed: [],
      failed: [],
    };

    // API 데이터를 ExecutionUpdate 형식으로 변환
    const apiExecutions = (recentExecutions || []).map((exec: RecentExecution) => ({
      executionId: exec.id,
      workflowId: exec.workflowId,
      workflowName: exec.workflowName,
      status: exec.status as ExecutionStatus,
      startedAt: exec.startedAt,
      stoppedAt: exec.stoppedAt,
    }));

    // WebSocket 업데이트와 병합 (WebSocket이 더 최신)
    const mergedMap = new Map<string, ExecutionUpdate>();
    apiExecutions.forEach((exec) => mergedMap.set(exec.executionId, exec));
    wsUpdates.forEach((exec, id) => mergedMap.set(id, exec));

    // 그룹화
    mergedMap.forEach((exec) => {
      switch (exec.status) {
        case 'running':
          grouped.running.push(exec);
          break;
        case 'waiting':
          grouped.waiting.push(exec);
          break;
        case 'success':
          grouped.completed.push(exec);
          break;
        case 'error':
          grouped.failed.push(exec);
          break;
      }
    });

    // 각 그룹을 최신순으로 정렬하고 최대 10개로 제한
    grouped.running = grouped.running.slice(0, 10);
    grouped.waiting = grouped.waiting.slice(0, 10);
    grouped.completed = grouped.completed.slice(0, 10);
    grouped.failed = grouped.failed.slice(0, 10);

    return grouped;
  }, [recentExecutions, wsUpdates]);

  const error = queryError ? '실행 목록을 불러오는데 실패했습니다' : null;

  // WebSocket 이벤트 핸들러 (메모이제이션)
  // WebSocket 업데이트를 Map에 저장하여 React Query 데이터와 병합
  const handleExecutionUpdate = useCallback((data: ExecutionUpdate) => {
    setWsUpdates((prev) => {
      const newMap = new Map(prev);
      newMap.set(data.executionId, data);
      return newMap;
    });
  }, []);

  useEffect(() => {
    // WebSocket으로 실시간 업데이트 수신
    // (초기 데이터는 React Query가 자동으로 로드하고 30초마다 갱신)
    const socket = getSocketClient();

    socket.onExecutionUpdate(handleExecutionUpdate);
    socket.onExecutionStarted(handleExecutionUpdate);
    socket.onExecutionFinished(handleExecutionUpdate);
    socket.onExecutionError(handleExecutionUpdate);

    return () => {
      socket.offExecutionUpdate(handleExecutionUpdate);
      socket.offExecutionStarted(handleExecutionUpdate);
      socket.offExecutionFinished(handleExecutionUpdate);
      socket.offExecutionError(handleExecutionUpdate);
    };
  }, [handleExecutionUpdate]);

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

  const _getStatusLabel = (status: ExecutionStatus) => {
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

  // 총 실행 수 계산 (메모이제이션)
  const totalExecutions = useMemo(
    () =>
      executions.running.length +
      executions.waiting.length +
      executions.completed.length +
      executions.failed.length,
    [executions]
  );

  // 🔧 가상화를 위한 평탄화된 아이템 목록
  const virtualizedItems = useMemo<VirtualListItem[]>(() => {
    const items: VirtualListItem[] = [];

    // 실행 중
    if (executions.running.length > 0) {
      items.push({
        type: 'header',
        label: '실행 중',
        count: executions.running.length,
        icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
        colorClass: 'text-gray-700',
      });
      executions.running.forEach((exec) => items.push({ type: 'execution', data: exec }));
    }

    // 대기 중
    if (executions.waiting.length > 0) {
      items.push({
        type: 'header',
        label: '대기 중',
        count: executions.waiting.length,
        icon: <Clock className="w-4 h-4 text-yellow-500" />,
        colorClass: 'text-gray-700',
      });
      executions.waiting.forEach((exec) => items.push({ type: 'execution', data: exec }));
    }

    // 실패 (강조)
    if (executions.failed.length > 0) {
      items.push({
        type: 'header',
        label: '실패',
        count: executions.failed.length,
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        colorClass: 'text-red-700',
      });
      executions.failed.forEach((exec) => items.push({ type: 'execution', data: exec }));
    }

    // 완료
    if (executions.completed.length > 0) {
      items.push({
        type: 'header',
        label: '최근 완료',
        count: executions.completed.length,
        icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
        colorClass: 'text-gray-700',
      });
      executions.completed.forEach((exec) => items.push({ type: 'execution', data: exec }));
    }

    return items;
  }, [executions]);

  // 🔧 가상화 스크롤 컨테이너 ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 🔧 가상화 설정
  const rowVirtualizer = useVirtualizer({
    count: virtualizedItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (index) => {
      const item = virtualizedItems[index];
      return item?.type === 'header' ? ITEM_HEIGHT.header : ITEM_HEIGHT.execution;
    },
    overscan: 5, // 화면 밖에 미리 렌더링할 아이템 수
  });

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">실시간 실행 목록</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw
                className={`w-4 h-4 text-gray-600 ${isRefetching ? 'animate-spin' : ''}`}
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

      {/* Execution Groups - 가상화된 목록 */}
      <div ref={scrollContainerRef} className="p-4 max-h-[600px] overflow-y-auto">
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
              onClick={() => refetch()}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 🔧 가상화된 실행 목록 */}
        {!isLoading && !error && virtualizedItems.length > 0 && (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = virtualizedItems[virtualRow.index];
              if (!item) return null;

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {item.type === 'header' ? (
                    // 그룹 헤더 렌더링
                    <div className="flex items-center gap-2 mb-2 pt-2">
                      {item.icon}
                      <h4 className={`text-sm font-semibold ${item.colorClass}`}>
                        {item.label} ({item.count})
                      </h4>
                    </div>
                  ) : (
                    // 실행 아이템 렌더링
                    renderExecutionItem(item.data)
                  )}
                </div>
              );
            })}
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
