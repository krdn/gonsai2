'use client';

import React, { useEffect, useState } from 'react';
import { History, RefreshCw, CheckCircle, XCircle, Clock, Filter, ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName?: string;
  mode: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  retryOf?: string;
  retrySuccessId?: string;
  data?: any;
}

interface Workflow {
  id: string;
  name: string;
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [showHelp, setShowHelp] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (workflows.length > 0 && selectedWorkflow !== 'all') {
      loadExecutions(selectedWorkflow);
    }
  }, [selectedWorkflow, limit]);

  const loadWorkflows = async () => {
    try {
      const response = await fetch(`${API_URL}/api/workflows`, {
        headers: {
          'X-API-Key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGZjZGQ0ZS04M2FhLTRmNTAtODc5Mi1hODU2ZWNhM2YxMGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTI0MjYwfQ.hyAirUwqDFUmQMGDxiFsONMJpFZxl8dve0Y1xrkkkrc',
        },
      });

      if (!response.ok) {
        throw new Error('워크플로우 조회 실패');
      }

      const data = await response.json();
      setWorkflows(data.data || []);

      // 첫 번째 워크플로우의 실행 내역 로드
      if (data.data && data.data.length > 0) {
        setSelectedWorkflow(data.data[0].id);
        loadExecutions(data.data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크플로우 조회 중 오류 발생');
      console.error('워크플로우 조회 오류:', err);
      setLoading(false);
    }
  };

  const loadExecutions = async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/workflows/${workflowId}/executions?limit=${limit}`, {
        headers: {
          'X-API-Key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGZjZGQ0ZS04M2FhLTRmNTAtODc5Mi1hODU2ZWNhM2YxMGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTI0MjYwfQ.hyAirUwqDFUmQMGDxiFsONMJpFZxl8dve0Y1xrkkkrc',
        },
      });

      if (!response.ok) {
        throw new Error('실행 내역 조회 실패');
      }

      const data = await response.json();
      const executionsData = data.data || [];

      // 워크플로우 이름 추가
      const workflow = workflows.find(w => w.id === workflowId);
      const executionsWithName = executionsData.map((exec: WorkflowExecution) => ({
        ...exec,
        workflowName: workflow?.name || 'Unknown Workflow',
      }));

      setExecutions(executionsWithName);
    } catch (err) {
      setError(err instanceof Error ? err.message : '실행 내역 조회 중 오류 발생');
      console.error('실행 내역 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshExecutions = () => {
    if (selectedWorkflow !== 'all') {
      loadExecutions(selectedWorkflow);
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
      case 'waiting':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 text-sm font-medium rounded-full';
    switch (status) {
      case 'success':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>성공</span>;
      case 'error':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>실패</span>;
      case 'running':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800`}>실행 중</span>;
      case 'waiting':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>대기</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
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
      second: '2-digit',
    });
  };

  const getDuration = (startedAt: string, stoppedAt?: string) => {
    const start = new Date(startedAt).getTime();
    const end = stoppedAt ? new Date(stoppedAt).getTime() : Date.now();
    const durationMs = end - start;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}시간 ${minutes % 60}분 ${seconds % 60}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds % 60}초`;
    } else {
      return `${seconds}초`;
    }
  };

  const filteredExecutions = executions.filter(exec => {
    if (selectedStatus === 'all') return true;
    return exec.status === selectedStatus;
  });

  const toggleExpand = (executionId: string) => {
    setExpandedExecution(expandedExecution === executionId ? null : executionId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">실행 내역</h1>
                <p className="text-sm text-gray-500">워크플로우 실행 기록 조회</p>
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
                onClick={refreshExecutions}
                disabled={loading || selectedWorkflow === 'all'}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">필터:</span>
            </div>

            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">워크플로우 선택</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="success">성공</option>
              <option value="error">실패</option>
              <option value="running">실행 중</option>
              <option value="waiting">대기</option>
            </select>

            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>

            <div className="ml-auto text-sm text-gray-600">
              총 {filteredExecutions.length}개 실행
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
          </div>
        )}

        {selectedWorkflow === 'all' ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">워크플로우를 선택하세요</p>
              <p className="text-gray-500 text-sm">위 필터에서 워크플로우를 선택하면 실행 내역이 표시됩니다</p>
            </div>
          </div>
        ) : loading && executions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">실행 내역을 불러오는 중...</p>
            </div>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-2">실행 내역이 없습니다</p>
              <p className="text-gray-500 text-sm">이 워크플로우를 실행하면 내역이 표시됩니다</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExecutions.map((execution) => (
              <div key={execution.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(execution.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {execution.workflowName}
                        </h3>
                        <p className="text-sm text-gray-500">실행 ID: {execution.id}</p>
                      </div>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">시작 시간</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(execution.startedAt)}</p>
                    </div>
                    {execution.stoppedAt && (
                      <div>
                        <p className="text-sm text-gray-500">종료 시간</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(execution.stoppedAt)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">실행 시간</p>
                      <p className="text-sm font-medium text-gray-900">
                        {getDuration(execution.startedAt, execution.stoppedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleExpand(execution.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {expandedExecution === execution.id ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          <span>숨기기</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>상세 정보</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`http://localhost:5678/execution/${execution.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      n8n에서 열기
                    </a>
                  </div>
                </div>

                {expandedExecution === execution.id && execution.data && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">실행 데이터</h4>
                    <pre className="bg-white border border-gray-200 rounded p-4 overflow-auto max-h-96 text-xs">
                      {JSON.stringify(execution.data, null, 2)}
                    </pre>
                  </div>
                )}
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
                <h2 className="text-xl font-bold text-gray-900">실행 내역 도움말</h2>
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
                  이 페이지에서는 워크플로우의 실행 내역을 조회하고 상세 정보를 확인할 수 있습니다.
                  워크플로우별, 상태별로 필터링하여 원하는 실행 기록을 찾을 수 있습니다.
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
                      <h4 className="font-medium text-gray-900">워크플로우 선택</h4>
                      <p className="text-sm text-gray-600">드롭다운에서 워크플로우를 선택하면 해당 워크플로우의 실행 내역이 표시됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">상태 필터링</h4>
                      <p className="text-sm text-gray-600">성공, 실패, 실행 중, 대기 상태별로 필터링할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">실행 시간 표시</h4>
                      <p className="text-sm text-gray-600">시작 시간, 종료 시간, 총 실행 시간을 자동으로 계산하여 표시합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">상세 정보 확장</h4>
                      <p className="text-sm text-gray-600">"상세 정보" 버튼을 클릭하면 실행 데이터(JSON)를 확인할 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">5</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">표시 개수 조절</h4>
                      <p className="text-sm text-gray-600">10, 20, 50, 100개 단위로 표시할 실행 내역 개수를 선택할 수 있습니다.</p>
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
                    <p className="text-sm text-gray-600 mt-1">워크플로우 목록 조회</p>
                  </div>
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      GET /api/workflows/:id/executions?limit=20
                    </code>
                    <p className="text-sm text-gray-600 mt-1">워크플로우 실행 내역 조회</p>
                  </div>
                </div>
              </section>

              {/* Status Badges */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🏷️ 상태 표시</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      성공
                    </span>
                    <span className="text-sm text-gray-600">워크플로우 실행이 성공적으로 완료됨</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
                      <XCircle className="w-4 h-4" />
                      실패
                    </span>
                    <span className="text-sm text-gray-600">워크플로우 실행 중 오류 발생</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                      <Clock className="w-4 h-4" />
                      실행 중
                    </span>
                    <span className="text-sm text-gray-600">현재 워크플로우 실행 중</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                      <Clock className="w-4 h-4" />
                      대기
                    </span>
                    <span className="text-sm text-gray-600">실행 대기 중</span>
                  </div>
                </div>
              </section>

              {/* Tips */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 팁</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>워크플로우를 먼저 선택해야 실행 내역이 표시됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>상태 필터를 사용하여 실패한 실행만 빠르게 찾을 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>실행 시간이 긴 워크플로우는 성능 최적화가 필요할 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>"n8n에서 열기" 버튼으로 n8n UI에서 실행 상세 내역을 확인할 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>실행 데이터는 JSON 형태로 표시되며, 워크플로우의 입출력 데이터를 포함합니다.</span>
                  </li>
                </ul>
              </section>

              {/* Execution Time */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">⏱️ 실행 시간 계산</h3>
                <p className="text-sm text-gray-700 mb-2">
                  실행 시간은 시작 시간과 종료 시간의 차이로 자동 계산됩니다:
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 1시간 이상: "X시간 Y분 Z초"</li>
                  <li>• 1분 이상: "Y분 Z초"</li>
                  <li>• 1분 미만: "Z초"</li>
                </ul>
              </section>

              {/* Troubleshooting */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 문제 해결</h3>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h4 className="font-medium text-red-900 mb-1">실행 내역이 표시되지 않음</h4>
                    <p className="text-sm text-red-700">
                      워크플로우를 선택했는지 확인하고, 백엔드 서버와 n8n API 연결 상태를 확인하세요.
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="font-medium text-yellow-900 mb-1">실시간 업데이트 안 됨</h4>
                    <p className="text-sm text-yellow-700">
                      새로고침 버튼을 클릭하여 최신 실행 내역을 가져오세요. 자동 새로고침 기능은 향후 추가될 예정입니다.
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
