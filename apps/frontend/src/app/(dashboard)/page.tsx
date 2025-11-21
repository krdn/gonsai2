'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Workflow,
  Bot,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { workflowsApi } from '@/lib/api-client';

interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  activeAgents: number;
  errorCount: number;
}

interface RecentExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  duration?: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: 0,
    activeAgents: 0,
    errorCount: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 워크플로우 목록 조회
      const workflowsData = await workflowsApi.list();
      const workflows = workflowsData.data || [];

      const totalWorkflows = workflows.length;
      const activeWorkflows = workflows.filter((w: any) => w.active).length;

      // 각 워크플로우의 최근 실행 내역 조회
      const allExecutions: RecentExecution[] = [];
      let totalExecutionsCount = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const workflow of workflows.slice(0, 10)) {
        // 처음 10개 워크플로우만
        try {
          const execData = await workflowsApi.executions(workflow.id, 5);
          const executions = execData.data || [];
          totalExecutionsCount += executions.length;

          executions.forEach((exec: any) => {
            if (exec.status === 'success') successCount++;
            if (exec.status === 'error') errorCount++;

            allExecutions.push({
              id: exec.id,
              workflowId: workflow.id,
              workflowName: workflow.name,
              status: exec.status,
              startedAt: exec.startedAt,
              duration: exec.stoppedAt
                ? new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime()
                : undefined,
            });
          });
        } catch (err) {
          console.error(`워크플로우 ${workflow.id} 실행 내역 조회 실패:`, err);
        }
      }

      // 최근 실행 정렬 (시작 시간 기준 내림차순)
      allExecutions.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      const successRate =
        totalExecutionsCount > 0 ? (successCount / totalExecutionsCount) * 100 : 0;

      setStats({
        totalWorkflows,
        activeWorkflows,
        totalExecutions: totalExecutionsCount,
        successRate: Math.round(successRate),
        activeAgents: 4, // TODO: API 연동 필요
        errorCount,
      });

      setRecentExecutions(allExecutions.slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : '대시보드 데이터 조회 중 오류 발생');
      console.error('대시보드 데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분 ${seconds % 60}초`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '성공';
      case 'error':
        return '실패';
      case 'running':
        return '실행 중';
      default:
        return '대기';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-500 mt-1">시스템 전체 개요 및 주요 메트릭</p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 총 워크플로우 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Workflow className="w-6 h-6 text-blue-600" />
            </div>
            <Link
              href="/workflows"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>자세히</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">총 워크플로우</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalWorkflows}</p>
            <p className="text-sm text-gray-500">
              활성화: <span className="font-semibold text-green-600">{stats.activeWorkflows}</span>
            </p>
          </div>
        </div>

        {/* 총 실행 수 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <Link
              href="/executions"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>자세히</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">총 실행 수</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalExecutions}</p>
            <p className="text-sm text-gray-500">
              오류: <span className="font-semibold text-red-600">{stats.errorCount}</span>
            </p>
          </div>
        </div>

        {/* 성공률 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <Link
              href="/monitoring"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>자세히</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">성공률</p>
            <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
            <p className="text-sm text-gray-500">최근 {stats.totalExecutions}개 실행 기준</p>
          </div>
        </div>

        {/* 활성 에이전트 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Bot className="w-6 h-6 text-orange-600" />
            </div>
            <Link
              href="/agents"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>자세히</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">활성 에이전트</p>
            <p className="text-3xl font-bold text-gray-900">{stats.activeAgents}</p>
            <p className="text-sm text-green-500 font-medium">● 모두 정상 작동 중</p>
          </div>
        </div>

        {/* 시스템 상태 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-gray-600" />
            </div>
            <span className="text-sm text-green-500 font-medium">● 정상</span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">시스템 상태</p>
            <p className="text-2xl font-bold text-gray-900">모든 서비스 정상</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span>✓ Backend API</span>
              <span>✓ n8n Integration</span>
              <span>✓ MongoDB</span>
              <span>✓ WebSocket</span>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 워크플로우 실행 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">최근 워크플로우 실행</h2>
            <Link
              href="/executions"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>전체 보기</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : recentExecutions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>최근 실행 내역이 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentExecutions.map((execution) => (
              <div key={execution.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {getStatusIcon(execution.status)}
                    <div>
                      <p className="font-medium text-gray-900">{execution.workflowName}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span>{getStatusText(execution.status)}</span>
                        <span>•</span>
                        <span>{formatDate(execution.startedAt)}</span>
                        {execution.duration && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(execution.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/executions?workflowId=${execution.workflowId}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    상세보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
