'use client';

import React, { useState } from 'react';
import { Bot, Settings, Play, Square, Activity, CheckCircle, XCircle, AlertCircle, HelpCircle, X } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  type: 'orchestrator' | 'analyzer' | 'healer' | 'monitor';
  status: 'running' | 'stopped' | 'error';
  description: string;
  config: {
    enabled: boolean;
    autoStart: boolean;
    [key: string]: any;
  };
  stats?: {
    tasksProcessed: number;
    successRate: number;
    lastActivity: string;
  };
}

export default function AgentsPage() {
  const [showHelp, setShowHelp] = useState(false);
  const [agents] = useState<Agent[]>([
    {
      id: 'orchestrator-1',
      name: 'Agent Orchestrator',
      type: 'orchestrator',
      status: 'running',
      description: 'AI 에이전트 간 작업 조율 및 워크플로우 최적화',
      config: {
        enabled: true,
        autoStart: true,
        maxConcurrentTasks: 5,
        priority: 'high',
      },
      stats: {
        tasksProcessed: 127,
        successRate: 94.5,
        lastActivity: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'analyzer-1',
      name: 'Error Analyzer',
      type: 'analyzer',
      status: 'running',
      description: 'n8n 워크플로우 오류 패턴 분석 및 분류',
      config: {
        enabled: true,
        autoStart: true,
        analysisDepth: 'deep',
        useClaudeAPI: true,
      },
      stats: {
        tasksProcessed: 89,
        successRate: 97.2,
        lastActivity: '2024-01-15T10:25:00Z',
      },
    },
    {
      id: 'healer-1',
      name: 'Auto Healing Service',
      type: 'healer',
      status: 'running',
      description: '감지된 오류 자동 수정 및 복구',
      config: {
        enabled: true,
        autoStart: true,
        cronSchedule: '*/5 * * * *',
        maxRetries: 3,
        autoFixSeverity: ['medium', 'low'],
      },
      stats: {
        tasksProcessed: 34,
        successRate: 85.3,
        lastActivity: '2024-01-15T10:20:00Z',
      },
    },
    {
      id: 'monitor-1',
      name: 'System Monitor',
      type: 'monitor',
      status: 'running',
      description: 'n8n 및 MongoDB 상태 실시간 모니터링',
      config: {
        enabled: true,
        autoStart: true,
        checkInterval: 30,
        alertThreshold: 'medium',
      },
      stats: {
        tasksProcessed: 2456,
        successRate: 99.8,
        lastActivity: '2024-01-15T10:31:00Z',
      },
    },
  ]);

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'orchestrator':
        return <Settings className="w-6 h-6" />;
      case 'analyzer':
        return <Activity className="w-6 h-6" />;
      case 'healer':
        return <Bot className="w-6 h-6" />;
      case 'monitor':
        return <AlertCircle className="w-6 h-6" />;
      default:
        return <Bot className="w-6 h-6" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full';
    switch (status) {
      case 'running':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="w-4 h-4" />
            실행 중
          </span>
        );
      case 'stopped':
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <Square className="w-4 h-4" />
            중지됨
          </span>
        );
      case 'error':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <XCircle className="w-4 h-4" />
            오류
          </span>
        );
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  const getAgentTypeLabel = (type: string) => {
    switch (type) {
      case 'orchestrator':
        return '조율자';
      case 'analyzer':
        return '분석기';
      case 'healer':
        return '복구기';
      case 'monitor':
        return '모니터';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}시간 전`;
    return `${Math.floor(diffMins / 1440)}일 전`;
  };

  const getAgentColor = (type: string) => {
    switch (type) {
      case 'orchestrator':
        return 'blue';
      case 'analyzer':
        return 'purple';
      case 'healer':
        return 'green';
      case 'monitor':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI 에이전트 설정</h1>
                <p className="text-sm text-gray-500">자동화 에이전트 관리 및 구성</p>
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
              <div className="px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {agents.filter(a => a.status === 'running').length}/{agents.length} 실행 중
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900 mb-1">에이전트 시스템 안내</h3>
              <p className="text-sm text-blue-700">
                AI 에이전트는 백엔드 서버에서 자동으로 실행됩니다.
                현재는 읽기 전용 모니터링 페이지이며, 향후 에이전트 제어 기능이 추가될 예정입니다.
              </p>
            </div>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agents.map((agent) => {
            const color = getAgentColor(agent.type);
            return (
              <div
                key={agent.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 bg-${color}-100 text-${color}-600 rounded-lg`}>
                      {getAgentIcon(agent.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                      <span className={`text-xs font-medium text-${color}-600`}>
                        {getAgentTypeLabel(agent.type)}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(agent.status)}
                </div>

                {/* Agent Description */}
                <p className="text-sm text-gray-600 mb-4">{agent.description}</p>

                {/* Agent Stats */}
                {agent.stats && (
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">처리된 작업</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.stats.tasksProcessed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">성공률</p>
                      <p className="text-lg font-semibold text-gray-900">{agent.stats.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">마지막 활동</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(agent.stats.lastActivity)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Agent Config */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">설정</h4>
                  <div className="space-y-1">
                    {Object.entries(agent.config).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="font-medium text-gray-900">
                          {typeof value === 'boolean' ? (value ? '활성화' : '비활성화') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions (Disabled for now) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      <Play className="w-4 h-4 inline mr-2" />
                      시작
                    </button>
                    <button
                      disabled
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      <Square className="w-4 h-4 inline mr-2" />
                      중지
                    </button>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    제어 기능은 향후 추가될 예정입니다
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Roadmap */}
        <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">개발 예정 기능</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-blue-600">1</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">실시간 에이전트 제어</h4>
                <p className="text-sm text-gray-600">에이전트 시작, 중지, 재시작 기능</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-blue-600">2</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">설정 관리 UI</h4>
                <p className="text-sm text-gray-600">에이전트별 상세 설정 편집 및 저장</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-blue-600">3</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">활동 로그 뷰어</h4>
                <p className="text-sm text-gray-600">에이전트별 작업 기록 및 상세 로그 조회</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-semibold text-blue-600">4</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">커스텀 에이전트 생성</h4>
                <p className="text-sm text-gray-600">사용자 정의 자동화 에이전트 설정 및 배포</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">AI 에이전트 설정 도움말</h2>
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
                    이 페이지에서는 gonsai2 시스템에서 동작하는 AI 에이전트들의 상태를 모니터링할 수 있습니다.
                    현재는 읽기 전용 모니터링 페이지이며, 향후 에이전트 제어 기능이 추가될 예정입니다.
                  </p>
                </section>

                {/* Agent Types */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🤖 에이전트 유형</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg flex-shrink-0">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Agent Orchestrator (조율자)</h4>
                        <p className="text-sm text-gray-600">
                          AI 에이전트 간 작업 조율 및 워크플로우 최적화를 담당합니다.
                          여러 에이전트의 작업을 효율적으로 분배하고 조정합니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg flex-shrink-0">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Error Analyzer (분석기)</h4>
                        <p className="text-sm text-gray-600">
                          n8n 워크플로우 오류 패턴을 분석하고 분류합니다.
                          15가지 오류 패턴 데이터베이스를 활용하여 자동으로 오류 유형을 판단합니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg flex-shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Auto Healing Service (복구기)</h4>
                        <p className="text-sm text-gray-600">
                          감지된 오류를 자동으로 수정하고 복구합니다.
                          5분마다 실행되며, medium/low 심각도의 오류를 자동으로 처리합니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">System Monitor (모니터)</h4>
                        <p className="text-sm text-gray-600">
                          n8n 및 MongoDB 상태를 실시간으로 모니터링합니다.
                          30초마다 시스템 상태를 체크하고 이상 징후를 감지합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Statistics */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 통계 정보</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-600">처리된 작업</div>
                      <div className="text-sm text-gray-900">에이전트가 처리한 총 작업 수</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-600">성공률</div>
                      <div className="text-sm text-gray-900">전체 작업 중 성공한 작업의 비율 (%)</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 text-sm text-gray-600">마지막 활동</div>
                      <div className="text-sm text-gray-900">에이전트의 가장 최근 활동 시간</div>
                    </div>
                  </div>
                </section>

                {/* Status */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🏷️ 상태 표시</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        실행 중
                      </span>
                      <span className="text-sm text-gray-600">에이전트가 정상적으로 실행 중</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                        <Square className="w-4 h-4" />
                        중지됨
                      </span>
                      <span className="text-sm text-gray-600">에이전트가 중지됨</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
                        <XCircle className="w-4 h-4" />
                        오류
                      </span>
                      <span className="text-sm text-gray-600">에이전트 실행 중 오류 발생</span>
                    </div>
                  </div>
                </section>

                {/* Configuration */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">⚙️ 주요 설정</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700 w-32">enabled:</span>
                      <span className="text-gray-600">에이전트 활성화 여부</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700 w-32">autoStart:</span>
                      <span className="text-gray-600">서버 시작 시 자동 실행 여부</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700 w-32">cronSchedule:</span>
                      <span className="text-gray-600">자동 실행 스케줄 (예: */5 * * * * = 5분마다)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-700 w-32">maxRetries:</span>
                      <span className="text-gray-600">작업 실패 시 최대 재시도 횟수</span>
                    </div>
                  </div>
                </section>

                {/* Error Healing Details */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 Auto Healing 상세</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">자동 수정 가능한 오류 유형</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• 노드 연결 오류</li>
                        <li>• 타임아웃 오류</li>
                        <li>• 데이터 형식 오류</li>
                        <li>• API 오류 (일부)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">수동 승인이 필요한 작업</h4>
                      <ul className="text-sm text-gray-600 space-y-1 ml-4">
                        <li>• 인증 정보 변경</li>
                        <li>• 자격증명 업데이트</li>
                        <li>• Critical 등급 오류</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Roadmap */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🚀 개발 예정 기능</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">1.</span>
                      <div>
                        <h4 className="font-medium text-gray-900">실시간 에이전트 제어</h4>
                        <p className="text-sm text-gray-600">에이전트 시작, 중지, 재시작 기능</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">2.</span>
                      <div>
                        <h4 className="font-medium text-gray-900">설정 관리 UI</h4>
                        <p className="text-sm text-gray-600">에이전트별 상세 설정 편집 및 저장</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">3.</span>
                      <div>
                        <h4 className="font-medium text-gray-900">활동 로그 뷰어</h4>
                        <p className="text-sm text-gray-600">에이전트별 작업 기록 및 상세 로그 조회</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">4.</span>
                      <div>
                        <h4 className="font-medium text-gray-900">커스텀 에이전트 생성</h4>
                        <p className="text-sm text-gray-600">사용자 정의 자동화 에이전트 설정 및 배포</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Related Documentation */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📚 관련 문서</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Error Healing System</h4>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        /features/error-healing/README.md
                      </code>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Agent Orchestration</h4>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        /features/agent-orchestration/ARCHITECTURE.md
                      </code>
                    </div>
                  </div>
                </section>

                {/* Tips */}
                <section>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 팁</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>에이전트는 백엔드 서버 시작 시 자동으로 실행됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>성공률이 낮은 에이전트는 설정을 조정하거나 로그를 확인하세요.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>Auto Healing Service는 5분마다 오류를 자동 검사하고 수정합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>현재 페이지는 읽기 전용이며, 에이전트 제어는 백엔드에서만 가능합니다.</span>
                    </li>
                  </ul>
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
    </div>
  );
}
