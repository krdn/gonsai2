'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Play,
  RefreshCw,
  Workflow as WorkflowIcon,
  XCircle,
  HelpCircle,
  X,
  Tag as TagIcon,
  Copy,
  Check,
  Webhook,
  FileText,
  Bot,
  Info,
  FolderOpen,
} from 'lucide-react';
import { workflowsApi, tagsApi, foldersApi, FolderResponse } from '@/lib/api-client';
import WorkflowExecutionModal from '@/components/workflow/WorkflowExecutionModal';

import { WORKFLOW_IDS } from '@/config/workflows.config';

// ============================================
// 유틸리티 함수들
// ============================================

interface StickyNoteContent {
  title: string;
  description: string;
  details: string[];
}

// Sticky Note에서 설명 추출
function extractDescriptionFromStickyNote(nodes: any[]): StickyNoteContent | null {
  const stickyNote = nodes?.find((node: any) => node.type === 'n8n-nodes-base.stickyNote');

  if (!stickyNote || !stickyNote.parameters?.content) {
    return null;
  }

  const content = stickyNote.parameters.content;
  const result: StickyNoteContent = {
    title: '',
    description: '',
    details: [],
  };

  // ## 제목 추출
  const titleMatch = content.match(/^##\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // ### 설명 섹션 추출
  const descMatch = content.match(/###\s+설명\s*\n([\s\S]*?)(?=###|$)/);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // ### 상세내역 섹션 추출
  const detailMatch = content.match(/###\s+상세내역\s*\n([\s\S]*?)(?=###|$)/);
  if (detailMatch) {
    result.details = detailMatch[1]
      .split('\n')
      .filter((line: string) => line.trim().startsWith('-'))
      .map((line: string) => line.replace(/^-\s*/, '').trim());
  }

  return result;
}

// 트리거 타입 추출
function extractTriggerType(nodes: any[]): string {
  const triggerNode = nodes?.find(
    (node: any) =>
      node.type?.includes('webhook') ||
      node.type?.includes('formTrigger') ||
      node.type?.includes('cron') ||
      node.type?.includes('emailTrigger')
  );

  if (!triggerNode) return 'manual';

  if (triggerNode.type.includes('webhook')) return 'webhook';
  if (triggerNode.type.includes('formTrigger')) return 'form';
  if (triggerNode.type.includes('cron')) return 'cron';
  if (triggerNode.type.includes('emailTrigger')) return 'email';

  return 'trigger';
}

// AI 모델 추출
function extractAIModels(nodes: any[]): string[] {
  const aiNodes =
    nodes?.filter(
      (node: any) =>
        node.type?.includes('langchain') ||
        node.type?.includes('gemini') ||
        node.type?.includes('openai')
    ) || [];

  return aiNodes
    .map((node: any) => {
      // 모델 ID에서 이름 추출
      if (node.parameters?.model) {
        const model = node.parameters.model;
        // model이 문자열인지 확인
        if (typeof model === 'string') {
          // "moonshotai/kimi-k2:free" -> "kimi-k2"
          if (model.includes('/')) {
            return model.split('/').pop()?.split(':')[0] || model;
          }
          return model;
        }
        // model이 객체인 경우 (예: { value: "..." })
        if (typeof model === 'object' && model?.value) {
          const modelValue = String(model.value);
          if (modelValue.includes('/')) {
            return modelValue.split('/').pop()?.split(':')[0] || modelValue;
          }
          return modelValue;
        }
        return String(model);
      }
      if (node.parameters?.modelId?.value) {
        const value = node.parameters.modelId.value;
        // value가 문자열인지 확인
        if (typeof value !== 'string') return 'unknown';
        // "={{ $json.body.aimodel }}" -> "dynamic"
        if (value.includes('$json')) return 'dynamic';
        // "models/gemini-2.5-pro" -> "gemini-2.5-pro"
        if (value.includes('models/')) {
          return value.split('models/')[1];
        }
        return value;
      }
      // 노드 타입에서 추출
      const typeName = node.type.split('.').pop() || '';
      if (typeName.includes('gemini')) return 'gemini';
      if (typeName.includes('openai') || typeName.includes('ChatOpenAi')) return 'openai';
      if (typeName.includes('OpenRouter')) return 'openrouter';
      return typeName;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // 중복 제거
}

interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings: any;
  tags?: Tag[];
  folderId?: string | null; // 폴더 ID (백엔드에서 추가)
  createdAt: string;
  updatedAt: string;
}

// 내부 콘텐츠 컴포넌트 (useSearchParams 사용)
function WorkflowsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams.get('tag');
  const selectedFolderId = searchParams.get('folder');

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executionModal, setExecutionModal] = useState<{
    isOpen: boolean;
    workflowId: string;
    workflowName: string;
  }>({
    isOpen: false,
    workflowId: '',
    workflowName: '',
  });

  // ID 복사 핸들러
  const copyToClipboard = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 워크플로우, 태그, 폴더를 병렬로 조회
      // includeNodes: true - Sticky Note에서 설명 추출, AI 모델/트리거 타입 분석을 위해 nodes 정보 필요
      const [workflowsData, tagsData, foldersData] = await Promise.all([
        workflowsApi.list({ includeNodes: true }),
        tagsApi.list().catch(() => ({ data: [] })), // 태그 조회 실패해도 워크플로우는 표시
        foldersApi.list().catch(() => ({ data: [] })), // 폴더 조회 실패해도 워크플로우는 표시
      ]);

      setWorkflows(workflowsData.data || []);
      setTags(tagsData.data || []);
      setFolders((foldersData.data as FolderResponse[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 조회 중 오류 발생');
      console.error('데이터 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = (workflowId: string, workflowName: string) => {
    // 모달 열기
    setExecutionModal({
      isOpen: true,
      workflowId,
      workflowName,
    });
  };

  const closeExecutionModal = () => {
    setExecutionModal({
      isOpen: false,
      workflowId: '',
      workflowName: '',
    });
  };

  // 태그/폴더별 워크플로우 필터링
  const filteredWorkflows = React.useMemo(() => {
    let result = workflows;

    // 태그 필터링
    if (selectedTagId) {
      result = result.filter((workflow) => workflow.tags?.some((tag) => tag.id === selectedTagId));
    }

    // 폴더 필터링
    if (selectedFolderId) {
      result = result.filter((workflow) => workflow.folderId === selectedFolderId);
    }

    return result;
  }, [workflows, selectedTagId, selectedFolderId]);

  // 태그 선택 핸들러
  const handleTagSelect = (tagId: string) => {
    router.push(`/workflows?tag=${tagId}`);
  };

  // 폴더 선택 핸들러
  const handleFolderSelect = (folderId: string) => {
    router.push(`/workflows?folder=${folderId}`);
  };

  // 현재 선택된 폴더 이름 가져오기
  const getSelectedFolderName = () => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId)?.name || '선택한 폴더';
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
      {/* Main Content - Workflows */}
      <div className="flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WorkflowIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">워크플로우 목록</h1>
                <p className="text-sm text-gray-500">
                  {selectedFolderId
                    ? `${getSelectedFolderName()} 폴더의 워크플로우`
                    : selectedTagId
                      ? `${tags.find((t) => t.id === selectedTagId)?.name || '선택한 태그'} 태그의 워크플로우`
                      : '모든 워크플로우'}
                </p>
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
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
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
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <WorkflowIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">
                  {selectedFolderId
                    ? '이 폴더에 해당하는 워크플로우가 없습니다'
                    : selectedTagId
                      ? '이 태그에 해당하는 워크플로우가 없습니다'
                      : '워크플로우가 없습니다'}
                </p>
                <p className="text-gray-500 text-sm">
                  {selectedFolderId
                    ? '다른 폴더를 선택하거나 관리자에게 워크플로우 할당을 요청하세요'
                    : selectedTagId
                      ? '다른 태그를 선택하거나 n8n에서 태그를 추가하세요'
                      : 'n8n에서 워크플로우를 생성하세요'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow) => {
                // 워크플로우별 추가 정보 추출
                const stickyContent = extractDescriptionFromStickyNote(workflow.nodes);
                const triggerType = extractTriggerType(workflow.nodes);
                const aiModels = extractAIModels(workflow.nodes);

                return (
                  <div
                    key={workflow.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    {/* Workflow Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {workflow.name}
                        </h3>
                        {/* ID 표시 */}
                        <div className="flex items-center gap-1 mb-2">
                          <button
                            onClick={() => copyToClipboard(workflow.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="클릭하여 복사"
                          >
                            {copiedId === workflow.id ? (
                              <>
                                <Check className="w-3 h-3 text-green-600" />
                                <span className="text-green-600">복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{workflow.id}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
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

                    {/* 설명 (Sticky Note에서 추출) */}
                    {stickyContent?.description && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {stickyContent.description}
                        </p>
                        {stickyContent.details.length > 0 && (
                          <div className="mt-2 flex items-start gap-1">
                            <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {stickyContent.details.join(' • ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 트리거 타입 & AI 모델 배지 */}
                    <div className="mb-3 flex items-center gap-1 flex-wrap">
                      {/* 트리거 타입 */}
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">
                        {triggerType === 'webhook' && <Webhook className="w-3 h-3" />}
                        {triggerType === 'form' && <FileText className="w-3 h-3" />}
                        {triggerType === 'manual' && <Play className="w-3 h-3" />}
                        {triggerType}
                      </span>

                      {/* AI 모델 */}
                      {aiModels.map((model) => (
                        <span
                          key={model}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded"
                        >
                          <Bot className="w-3 h-3" />
                          {model}
                        </span>
                      ))}
                    </div>

                    {/* Folder */}
                    {workflow.folderId && (
                      <div className="mb-3">
                        <button
                          onClick={() => handleFolderSelect(workflow.folderId!)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                        >
                          <FolderOpen className="w-3 h-3" />
                          {folders.find((f) => f.id === workflow.folderId)?.name || '폴더'}
                        </button>
                      </div>
                    )}

                    {/* Tags */}
                    {workflow.tags && workflow.tags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {workflow.tags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagSelect(tag.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            >
                              <TagIcon className="w-3 h-3" />
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Workflow Info */}
                    <div className="mb-4 space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>📅 생성: {formatDate(workflow.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span>✏️ 수정: {formatDate(workflow.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => executeWorkflow(workflow.id, workflow.name)}
                        disabled={!workflow.active}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        <span>실행</span>
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Workflow Execution Modal */}
      <WorkflowExecutionModal
        isOpen={executionModal.isOpen}
        onClose={closeExecutionModal}
        workflowId={executionModal.workflowId}
        workflowName={executionModal.workflowName}
      />

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
                  이 페이지에서는 n8n 워크플로우를 조회하고 실행할 수 있습니다. 좌측 메뉴의 Tags에서
                  특정 태그를 선택하여 워크플로우를 필터링하거나, 워크플로우 카드의 태그를 클릭하여
                  필터링할 수 있습니다.
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
                      <p className="text-sm text-gray-600">
                        n8n에 등록된 모든 워크플로우를 카드 형태로 표시합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">2</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">태그별 필터링</h4>
                      <p className="text-sm text-gray-600">
                        좌측 메뉴의 Tags에서 태그를 선택하거나, 워크플로우 카드의 태그를 클릭하여
                        필터링합니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">3</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">워크플로우 실행</h4>
                      <p className="text-sm text-gray-600">
                        "실행" 버튼을 클릭하여 워크플로우를 즉시 실행할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">4</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">n8n에서 열기</h4>
                      <p className="text-sm text-gray-600">
                        워크플로우를 n8n UI에서 직접 편집할 수 있습니다.
                      </p>
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
                    <p className="text-sm text-gray-600 mt-1">
                      모든 워크플로우 조회 (태그 정보 포함)
                    </p>
                  </div>
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      GET /api/tags
                    </code>
                    <p className="text-sm text-gray-600 mt-1">모든 태그 조회</p>
                  </div>
                  <div>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      POST /api/workflows/:id/execute
                    </code>
                    <p className="text-sm text-gray-600 mt-1">워크플로우 실행</p>
                  </div>
                </div>
              </section>

              {/* Tips */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 팁</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>좌측 메뉴의 Tags를 확장하면 모든 태그 목록을 볼 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>
                      워크플로우 카드의 태그 배지를 클릭하면 해당 태그로 즉시 필터링됩니다.
                    </span>
                  </li>
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
                    <span>
                      n8n에서 워크플로우에 태그를 추가/제거한 후 새로고침하면 변경사항이 반영됩니다.
                    </span>
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
                      워크플로우가 활성화되어 있는지 확인하고, n8n 서버가 정상 작동 중인지
                      확인하세요.
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

// Suspense로 감싼 페이지 export (Next.js 15 호환)
export default function WorkflowsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">워크플로우를 불러오는 중...</p>
          </div>
        </div>
      }
    >
      <WorkflowsContent />
    </Suspense>
  );
}
