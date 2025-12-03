'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef } from 'react';
import {
  Bot,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { agentsApi } from '@/lib/api-client';
import { getSocketClient, ExecutionUpdate } from '@/lib/socket-client';

interface AgentStats {
  totalWorkflows: number;
  agentWorkflows: number;
  activeWorkflows: number;
  totalAINodes: number;
  nodeTypeDistribution: Record<string, number>;
  executionStats: {
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    successRate: number;
    averageDuration: number;
  };
  timestamp: string;
}

interface Agent {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  model: string;
  position: [number, number];
}

interface AgentWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: any[];
  createdAt: string;
  updatedAt: string;
  aiNodeCount: number;
  agents: Agent[];
}

export default function AIAgentsPage() {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [runningExecutions, setRunningExecutions] = useState<Map<string, ExecutionUpdate>>(
    new Map()
  );

  // workflows의 최신 값을 참조하기 위한 ref (무한 루프 방지)
  const workflowsRef = useRef<AgentWorkflow[]>([]);

  // 통계 데이터 로드
  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await agentsApi.statsOverview();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to load agent stats:', err);
      setError('에이전트 통계를 불러오는데 실패했습니다');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // 워크플로우 목록 로드
  const loadWorkflows = async () => {
    try {
      setIsLoadingWorkflows(true);
      const response = await agentsApi.list();
      if (response.success && response.data) {
        setWorkflows(response.data);
      }
    } catch (err) {
      console.error('Failed to load agent workflows:', err);
      setError('에이전트 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadWorkflows()]);
  };

  // workflows가 변경될 때마다 ref 업데이트 (이벤트 핸들러가 최신 값 참조 가능)
  useEffect(() => {
    workflowsRef.current = workflows;
  }, [workflows]);

  // WebSocket 연결 및 이벤트 핸들러 설정 (컴포넌트 마운트 시 한 번만 실행)
  useEffect(() => {
    refreshAll();

    // WebSocket 연결
    const socket = getSocketClient();

    const connectToSocket = async () => {
      try {
        await socket.connect();
        setIsConnected(socket.isConnected());
      } catch (error) {
        console.error('[AI Agents] Socket connection failed:', error);
        setIsConnected(false);
      }
    };

    connectToSocket();

    // 실행 이벤트 핸들러
    const handleExecutionStarted = (data: ExecutionUpdate) => {
      // AI 워크플로우만 추적 (workflowsRef 사용하여 최신 값 참조)
      const isAgentWorkflow = workflowsRef.current.some((w) => w.id === data.workflowId);
      if (isAgentWorkflow) {
        setRunningExecutions((prev) => {
          const updated = new Map(prev);
          updated.set(data.executionId, data);
          return updated;
        });
      }
    };

    const handleExecutionFinished = (data: ExecutionUpdate) => {
      setRunningExecutions((prev) => {
        const updated = new Map(prev);
        updated.set(data.executionId, { ...data, status: 'success' });

        // 3초 후 제거
        setTimeout(() => {
          setRunningExecutions((current) => {
            const newMap = new Map(current);
            newMap.delete(data.executionId);
            return newMap;
          });
        }, 3000);

        return updated;
      });

      // 통계 새로고침
      loadStats();
    };

    const handleExecutionError = (data: ExecutionUpdate) => {
      setRunningExecutions((prev) => {
        const updated = new Map(prev);
        updated.set(data.executionId, { ...data, status: 'error' });

        // 5초 후 제거
        setTimeout(() => {
          setRunningExecutions((current) => {
            const newMap = new Map(current);
            newMap.delete(data.executionId);
            return newMap;
          });
        }, 5000);

        return updated;
      });

      // 통계 새로고침
      loadStats();
    };

    // 이벤트 구독
    socket.onExecutionStarted(handleExecutionStarted);
    socket.onExecutionFinished(handleExecutionFinished);
    socket.onExecutionError(handleExecutionError);

    // 연결 상태 체크
    const checkConnection = setInterval(() => {
      setIsConnected(socket.isConnected());
    }, 5000);

    // 🎯 최적화: 60초마다 자동 새로고침 (30초에서 증가)
    // WebSocket이 실행 이벤트를 실시간으로 전달하므로, 통계/목록은 1분마다 업데이트로 충분
    const refreshInterval = setInterval(refreshAll, 60000);

    return () => {
      socket.offExecutionStarted(handleExecutionStarted);
      socket.offExecutionFinished(handleExecutionFinished);
      socket.offExecutionError(handleExecutionError);
      clearInterval(checkConnection);
      clearInterval(refreshInterval);
    };
  }, []); // 빈 의존성 배열: 컴포넌트 마운트 시 한 번만 실행 (무한 루프 방지)

  // AI 노드 타입 아이콘 및 색상
  const getNodeTypeInfo = (nodeType: string) => {
    if (nodeType.includes('openAi') || nodeType.includes('chatOpenAi')) {
      return { icon: '🤖', color: 'text-green-600', bg: 'bg-green-50', label: 'OpenAI' };
    }
    if (nodeType.includes('anthropic') || nodeType.includes('chatAnthropic')) {
      return { icon: '🧠', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Anthropic' };
    }
    if (nodeType.includes('langchain')) {
      return { icon: '⚡', color: 'text-blue-600', bg: 'bg-blue-50', label: 'LangChain' };
    }
    if (nodeType.includes('httpRequest')) {
      return { icon: '🌐', color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'API' };
    }
    return { icon: '🤖', color: 'text-gray-600', bg: 'bg-gray-50', label: 'AI' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI 에이전트</h1>
                <p className="text-sm text-gray-500">AI 노드 기반 워크플로우 관리 및 실행</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 실행 중인 워크플로우 표시 */}
              {runningExecutions.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">실행 중: {runningExecutions.size}개</span>
                </div>
              )}

              {/* 연결 상태 */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                />
                <span className="text-xs text-gray-600">
                  {isConnected ? '연결됨' : '연결 끊김'}
                </span>
              </div>

              <button
                onClick={refreshAll}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">{error}</span>
            </div>
            <button
              onClick={refreshAll}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 통계 카드 */}
        {stats && !isLoadingStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Agent Workflows */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">AI 워크플로우</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.agentWorkflows}</p>
                  <p className="text-xs text-gray-500 mt-1">활성: {stats.activeWorkflows}개</p>
                </div>
                <Bot className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            {/* Total AI Nodes */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 AI 노드</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.totalAINodes}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.keys(stats.nodeTypeDistribution).length}가지 타입
                  </p>
                </div>
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Success Rate */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">성공률 (24h)</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.executionStats.successRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.executionStats.successCount}/{stats.executionStats.totalExecutions}건
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </div>

            {/* Average Duration */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">평균 실행 시간</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">
                    {(stats.executionStats.averageDuration / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">최근 24시간</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* Loading Stats */}
        {isLoadingStats && !stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-pulse"
              >
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* AI 에이전트 워크플로우 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">AI 에이전트 워크플로우</h3>
            <p className="text-sm text-gray-500 mt-1">AI 노드가 포함된 워크플로우 목록</p>
          </div>

          <div className="p-4">
            {/* Loading State */}
            {isLoadingWorkflows && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-3 text-purple-500 animate-spin" />
                <p className="text-sm text-gray-500">워크플로우를 불러오는 중...</p>
              </div>
            )}

            {/* Workflows Grid */}
            {!isLoadingWorkflows && workflows.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => {
                  // 이 워크플로우의 실행 중인 실행 찾기
                  const runningExecution = Array.from(runningExecutions.values()).find(
                    (exec) => exec.workflowId === workflow.id
                  );

                  return (
                    <div
                      key={workflow.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer relative ${
                        runningExecution
                          ? 'border-blue-400 bg-blue-50/30'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      {/* 실행 중 인디케이터 */}
                      {runningExecution && (
                        <div className="absolute top-2 right-2">
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                            <Activity className="w-3 h-3 animate-pulse" />
                            <span>실행 중</span>
                          </div>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-20">
                          <h4 className="text-base font-semibold text-gray-900 truncate">
                            {workflow.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(workflow.updatedAt).toLocaleDateString('ko-KR')} 업데이트
                          </p>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            workflow.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {workflow.active ? '활성' : '비활성'}
                        </div>
                      </div>

                      {/* AI Nodes */}
                      <div className="space-y-2 mb-3">
                        <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          AI 노드 ({workflow.aiNodeCount}개)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {workflow.agents.slice(0, 3).map((agent) => {
                            const nodeInfo = getNodeTypeInfo(agent.nodeType);
                            return (
                              <div
                                key={agent.nodeId}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${nodeInfo.bg} ${nodeInfo.color}`}
                              >
                                <span>{nodeInfo.icon}</span>
                                <span className="font-medium">{agent.nodeName}</span>
                              </div>
                            );
                          })}
                          {workflow.agents.length > 3 && (
                            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                              +{workflow.agents.length - 3}개 더
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {workflow.tags.map((tag: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                            >
                              {tag.name || tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium">
                          <Play className="w-4 h-4" />
                          실행
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                          <TrendingUp className="w-4 h-4" />
                          통계
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {!isLoadingWorkflows && workflows.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Bot className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                <p className="text-sm font-medium">AI 에이전트 워크플로우가 없습니다</p>
                <p className="text-xs mt-1">
                  n8n에서 AI 노드(OpenAI, Anthropic, LangChain 등)를 포함한 워크플로우를 생성하세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
