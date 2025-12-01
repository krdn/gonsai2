'use client';

// Next.js 15 정적 생성 비활성화
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Workflow as WorkflowIcon, XCircle, HelpCircle } from 'lucide-react';
import { workflowsApi, tagsApi, foldersApi, FolderResponse } from '@/lib/api-client';
import WorkflowExecutionModal from '@/components/workflow/WorkflowExecutionModal';
import WorkflowCard from './WorkflowCard';
import HelpModal from './HelpModal';
import { Workflow, Tag, ExecutionModalState } from './types';

/**
 * 워크플로우 목록 페이지 메인 컴포넌트
 */
function WorkflowsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedTagId = searchParams.get('tag');
  const selectedFolderId = searchParams.get('folder');

  // State
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [folders, setFolders] = useState<FolderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executionModal, setExecutionModal] = useState<ExecutionModalState>({
    isOpen: false,
    workflowId: '',
    workflowName: '',
  });

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 워크플로우, 태그, 폴더를 병렬로 조회
      const [workflowsData, tagsData, foldersData] = await Promise.all([
        workflowsApi.list({ includeNodes: true }),
        tagsApi.list().catch(() => ({ data: [] })),
        foldersApi.list().catch(() => ({ data: [] })),
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 핸들러
  const handleCopyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  }, []);

  const handleExecute = useCallback((workflowId: string, workflowName: string) => {
    setExecutionModal({ isOpen: true, workflowId, workflowName });
  }, []);

  const handleCloseExecutionModal = useCallback(() => {
    setExecutionModal({ isOpen: false, workflowId: '', workflowName: '' });
  }, []);

  const handleTagSelect = useCallback(
    (tagId: string) => {
      router.push(`/workflows?tag=${tagId}`);
    },
    [router]
  );

  const handleFolderSelect = useCallback(
    (folderId: string) => {
      router.push(`/workflows?folder=${folderId}`);
    },
    [router]
  );

  // 필터링된 워크플로우
  const filteredWorkflows = React.useMemo(() => {
    let result = workflows;

    if (selectedTagId) {
      result = result.filter((workflow) => workflow.tags?.some((tag) => tag.id === selectedTagId));
    }

    if (selectedFolderId) {
      result = result.filter((workflow) => workflow.folderId === selectedFolderId);
    }

    return result;
  }, [workflows, selectedTagId, selectedFolderId]);

  // 현재 필터 정보
  const filterInfo = React.useMemo(() => {
    if (selectedFolderId) {
      const folderName = folders.find((f) => f.id === selectedFolderId)?.name || '선택한 폴더';
      return `${folderName} 폴더의 워크플로우`;
    }
    if (selectedTagId) {
      const tagName = tags.find((t) => t.id === selectedTagId)?.name || '선택한 태그';
      return `${tagName} 태그의 워크플로우`;
    }
    return '모든 워크플로우';
  }, [selectedTagId, selectedFolderId, tags, folders]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col">
        {/* Header */}
        <Header
          filterInfo={filterInfo}
          loading={loading}
          onRefresh={loadData}
          onShowHelp={() => setShowHelp(true)}
        />

        {/* Main Content */}
        <div className="flex-1">
          {error && <ErrorBanner error={error} />}

          {loading && workflows.length === 0 ? (
            <LoadingState />
          ) : filteredWorkflows.length === 0 ? (
            <EmptyState hasTagFilter={!!selectedTagId} hasFolderFilter={!!selectedFolderId} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  folders={folders}
                  copiedId={copiedId}
                  onCopyId={handleCopyId}
                  onExecute={handleExecute}
                  onTagSelect={handleTagSelect}
                  onFolderSelect={handleFolderSelect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <WorkflowExecutionModal
        isOpen={executionModal.isOpen}
        onClose={handleCloseExecutionModal}
        workflowId={executionModal.workflowId}
        workflowName={executionModal.workflowName}
      />

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

// 하위 컴포넌트들
interface HeaderProps {
  filterInfo: string;
  loading: boolean;
  onRefresh: () => void;
  onShowHelp: () => void;
}

function Header({ filterInfo, loading, onRefresh, onShowHelp }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WorkflowIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">워크플로우 목록</h1>
            <p className="text-sm text-gray-500">{filterInfo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onShowHelp}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>도움말</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-800">
        <XCircle className="w-5 h-5" />
        <span className="font-semibold">{error}</span>
      </div>
      <div className="mt-2 text-sm text-red-700">
        백엔드 서버가 실행 중인지, API 키가 올바른지 확인하세요.
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">워크플로우를 불러오는 중...</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasTagFilter: boolean;
  hasFolderFilter: boolean;
}

function EmptyState({ hasTagFilter, hasFolderFilter }: EmptyStateProps) {
  const getMessage = () => {
    if (hasFolderFilter) {
      return {
        title: '이 폴더에 해당하는 워크플로우가 없습니다',
        subtitle: '다른 폴더를 선택하거나 관리자에게 워크플로우 할당을 요청하세요',
      };
    }
    if (hasTagFilter) {
      return {
        title: '이 태그에 해당하는 워크플로우가 없습니다',
        subtitle: '다른 태그를 선택하거나 n8n에서 태그를 추가하세요',
      };
    }
    return {
      title: '워크플로우가 없습니다',
      subtitle: 'n8n에서 워크플로우를 생성하세요',
    };
  };

  const { title, subtitle } = getMessage();

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <WorkflowIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 text-lg mb-2">{title}</p>
        <p className="text-gray-500 text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

// Suspense로 감싼 페이지 export (Next.js 15 호환)
export default function WorkflowsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <WorkflowsContent />
    </Suspense>
  );
}
