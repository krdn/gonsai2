'use client';

import React, { useEffect, useState } from 'react';
import { Play, Square, RefreshCw, Workflow, CheckCircle, XCircle, Clock, HelpCircle, X } from 'lucide-react';
import { workflowsApi, ApiClientError } from '@/lib/api-client';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings: any;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'running' | 'success' | 'error';
  startedAt: string;
  stoppedAt?: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<Record<string, boolean>>({});
  const [recentExecutions, setRecentExecutions] = useState<Record<string, WorkflowExecution[]>>({});
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await workflowsApi.list();
      setWorkflows(data.data || []);

      // 각 워크플로우의 최근 실행 내역 조회
      if (data.data && data.data.length > 0) {
        for (const workflow of data.data) {
          loadWorkflowExecutions(workflow.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크플로우 조회 중 오류 발생');
      console.error('워크플로우 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflowExecutions = async (workflowId: string) => {
    try {
      const data = await workflowsApi.executions(workflowId, 5);
      setRecentExecutions(prev => ({
        ...prev,
        [workflowId]: data.data || [],
      }));
    } catch (err) {
      console.error(`워크플로우 ${workflowId} 실행 내역 조회 오류:`, err);
    }
  };

  const executeWorkflow = async (workflowId: string, workflowName: string) => {
    try {
      setExecuting(prev => ({ ...prev, [workflowId]: true }));

      const data = await workflowsApi.execute(workflowId, {}, { waitForExecution: false });
      console.log('워크플로우 실행 성공:', data);

      // 실행 내역 새로고침
      setTimeout(() => {
        loadWorkflowExecutions(workflowId);
      }, 1000);
    } catch (err) {
      console.error('워크플로우 실행 오류:', err);
      alert(`워크플로우 실행 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setExecuting(prev => ({ ...prev, [workflowId]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Workflow className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">워크플로우 관리</h1>
                <p className="text-sm text-gray-500">n8n 워크플로우 목록 및 실행</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HelpCircle className="w-5 h-5" />
                <span>도움말</span>
              </button>
              <button
                onClick={loadWorkflows}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <span className="font-semibold">{error}</span>
            </div>
            <div className="mt-2 text-sm text-red-700">
              백엔드 서버가 실행 중인지, API 키가 올바른지 확인하세요.
            </div>
          </div>
        )}

        {loading && workflows.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">워크플로우를 불러오는 중...</p>
            </div>
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Workflow className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">워크플로우가 없습니다</p>
              <p className="text-gray-500 text-sm">n8n에서 워크플로우를 생성하세요</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                {/* Workflow Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {workflow.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          workflow.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {workflow.active ? '활성화됨' : '비활성화됨'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {workflow.nodes?.length || 0}개 노드
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workflow Info */}
                <div className="mb-4 space-y-1 text-sm text-gray-600">
                  <div>생성일: {formatDate(workflow.createdAt)}</div>
                  <div>수정일: {formatDate(workflow.updatedAt)}</div>
                </div>

                {/* Recent Executions */}
                {recentExecutions[workflow.id] && recentExecutions[workflow.id].length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">최근 실행</h4>
                    <div className="space-y-1">
                      {recentExecutions[workflow.id].slice(0, 3).map((execution) => (
                        <div key={execution.id} className="flex items-center gap-2 text-sm">
                          {getStatusIcon(execution.status)}
                          <span className="text-gray-600">
                            {getStatusText(execution.status)}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatDate(execution.startedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => executeWorkflow(workflow.id, workflow.name)}
                    disabled={executing[workflow.id] || !workflow.active}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {executing[workflow.id] ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>실행 중...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>실행</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`${process.env.NEXT_PUBLIC_N8N_UI_URL || 'http://localhost:5678'}/workflow/${workflow.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    n8n에서 열기
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">워크플로우 관리 도움말</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Overview */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 개요</h3>
                <p className="text-gray-700">
                  이 페이지에서는 n8n 워크플로우를 조회하고 실행할 수 있습니다.
                  각 워크플로우의 상태를 확인하고 즉시 실행하거나 n8n UI에서 편집할 수 있습니다.
                </p>
              </section>

              {/* Features */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 주요 기능</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">1</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">워크플로우 목록 조회</h4>
                      <p className="text-sm text-gray-600">n8n에 등록된 모든 워크플로우를 카드 형태로 표시합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">워크플로우 실행</h4>
                      <p className="text-sm text-gray-600">"실행" 버튼을 클릭하여 워크플로우를 즉시 실행할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">최근 실행 내역</h4>
                      <p className="text-sm text-gray-600">각 워크플로우의 최근 3개 실행 결과를 확인할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">n8n에서 열기</h4>
                      <p className="text-sm text-gray-600">워크플로우를 n8n UI에서 직접 편집할 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* API Info */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔌 사용된 API</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      GET /api/workflows
                    </code>
                    <p className="text-sm text-gray-600 mt-1">모든 워크플로우 조회</p>
                  </div>
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      POST /api/workflows/:id/execute
                    </code>
                    <p className="text-sm text-gray-600 mt-1">워크플로우 실행</p>
                  </div>
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      GET /api/workflows/:id/executions?limit=5
                    </code>
                    <p className="text-sm text-gray-600 mt-1">최근 실행 내역 조회</p>
                  </div>
                </div>
              </section>

              {/* Status Badges */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏷️ 상태 표시</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-sm font-medium rounded bg-green-100 text-green-800">
                      활성화됨
                    </span>
                    <span className="text-sm text-gray-600">워크플로우가 활성화되어 실행 가능합니다</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 text-sm font-medium rounded bg-gray-100 text-gray-600">
                      비활성화됨
                    </span>
                    <span className="text-sm text-gray-600">워크플로우가 비활성화되어 실행할 수 없습니다</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">실행 성공</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-600">실행 실패</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-600">실행 중</span>
                  </div>
                </div>
              </section>

              {/* Tips */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 팁</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>비활성화된 워크플로우는 n8n에서 활성화해야 실행할 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>새로고침 버튼을 클릭하여 최신 워크플로우 목록을 가져올 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>실행 버튼은 워크플로우를 비동기로 실행하므로, 결과는 실행 내역 페이지에서 확인하세요.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>n8n에서 워크플로우를 수정한 후에는 새로고침을 눌러 변경사항을 확인하세요.</span>
                  </li>
                </ul>
              </section>

              {/* Troubleshooting */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 문제 해결</h3>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-medium text-red-900 mb-1">워크플로우 조회 실패</h4>
                    <p className="text-sm text-red-700">
                      백엔드 서버가 실행 중인지 확인하고, n8n API 키가 올바른지 확인하세요.
                      <code className="block mt-1 bg-white px-2 py-1 rounded text-xs">
                        백엔드: http://192.168.0.50:3000
                      </code>
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-900 mb-1">워크플로우 실행 실패</h4>
                    <p className="text-sm text-yellow-700">
                      워크플로우가 활성화되어 있는지 확인하고, n8n 서버가 정상 작동 중인지 확인하세요.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
