'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { ExternalLink, Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { workflowsApi } from '@/lib/api-client';

interface WorkflowExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error';

interface ExecutionResult {
  executionId?: string;
  message?: string;
  error?: string;
}

export default function WorkflowExecutionModal({
  isOpen,
  onClose,
  workflowId,
  workflowName,
}: WorkflowExecutionModalProps) {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [result, setResult] = useState<ExecutionResult>({});
  const n8nUrl = process.env.NEXT_PUBLIC_N8N_UI_URL || 'http://localhost:5678';

  // 모달이 열릴 때 워크플로우 실행
  useEffect(() => {
    if (isOpen && workflowId) {
      executeWorkflow();
    } else {
      // 모달이 닫히면 상태 초기화
      setStatus('idle');
      setResult({});
    }
  }, [isOpen, workflowId]);

  const executeWorkflow = async () => {
    try {
      setStatus('executing');
      setResult({});

      const data = await workflowsApi.execute(workflowId, {}, { waitForExecution: false });

      setStatus('success');
      setResult({
        executionId: data.data?.executionId || data.data?.id,
        message: '워크플로우가 성공적으로 실행되었습니다.',
      });
    } catch (err) {
      console.error('워크플로우 실행 오류:', err);
      setStatus('error');

      let errorMessage = '워크플로우 실행 중 오류가 발생했습니다.';

      if (err instanceof Error) {
        // 404 에러 처리
        if (err.message.includes('not found') || err.message.includes('404')) {
          errorMessage =
            '워크플로우를 찾을 수 없습니다. n8n에서 워크플로우가 활성화되어 있는지 확인하세요.';
        } else {
          errorMessage = err.message;
        }
      }

      setResult({
        error: errorMessage,
      });
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'executing':
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600" />;
      default:
        return <Play className="w-16 h-16 text-gray-400" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'executing':
        return '워크플로우 실행 중...';
      case 'success':
        return '실행 완료!';
      case 'error':
        return '실행 실패';
      default:
        return '준비 중...';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'executing':
        return '워크플로우를 실행하고 있습니다. 잠시만 기다려주세요.';
      case 'success':
        return result.message || '워크플로우가 성공적으로 실행되었습니다.';
      case 'error':
        return result.error || '워크플로우 실행 중 오류가 발생했습니다.';
      default:
        return '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`워크플로우 실행: ${workflowName}`}
      size="md"
      showCloseButton={true}
      closeOnOverlayClick={status !== 'executing'}
      closeOnEscape={status !== 'executing'}
    >
      <div className="p-8">
        {/* 상태 아이콘 */}
        <div className="flex flex-col items-center justify-center space-y-4 mb-6">
          {getStatusIcon()}
          <h3 className="text-xl font-semibold text-gray-900">{getStatusTitle()}</h3>
          <p className="text-center text-gray-600">{getStatusMessage()}</p>
        </div>

        {/* 실행 ID 표시 (성공 시) */}
        {status === 'success' && result.executionId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-800">
              <span className="font-semibold">실행 ID:</span>{' '}
              <code className="bg-white px-2 py-1 rounded">{result.executionId}</code>
            </div>
          </div>
        )}

        {/* 에러 메시지 (실패 시) */}
        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{result.error}</p>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-3 justify-center">
          {status === 'success' && result.executionId && (
            <a
              href={`${n8nUrl}/execution/${result.executionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>n8n에서 결과 확인</span>
            </a>
          )}

          {status === 'error' && (
            <button
              onClick={executeWorkflow}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>다시 실행</span>
            </button>
          )}

          {status !== 'executing' && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              닫기
            </button>
          )}
        </div>

        {/* n8n에서 열기 버튼 (항상 표시) */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
          <a
            href={`${n8nUrl}/workflow/${workflowId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>n8n에서 워크플로우 편집</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
