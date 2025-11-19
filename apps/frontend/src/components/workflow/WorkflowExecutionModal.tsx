'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { ExternalLink, Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { workflowsApi } from '@/lib/api-client';
import { getWorkflowForm } from './forms';
import WebhookInfoPanel from './WebhookInfoPanel';
import { extractFormSchema } from '@/lib/form-field-parser';
import type { FormSchema } from '@/types/form-field.types';
import type { N8nWorkflow, WebhookNodeParameters } from '@/types/workflow';

interface WorkflowExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
}

type ExecutionStatus = 'idle' | 'loading' | 'form' | 'executing' | 'success' | 'error';

interface ExecutionResult {
  executionId?: string;
  message?: string;
  error?: string;
  data?: any;
}

export default function WorkflowExecutionModal({
  isOpen,
  onClose,
  workflowId,
  workflowName,
}: WorkflowExecutionModalProps) {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [result, setResult] = useState<ExecutionResult>({});
  const [workflowInfo, setWorkflowInfo] = useState<N8nWorkflow | null>(null);
  const [webhookPath, setWebhookPath] = useState<string | null>(null);
  const [webhookMethod, setWebhookMethod] = useState<string>('POST');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [webhookEnvironment, setWebhookEnvironment] = useState<'test' | 'production'>('test');
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);

  const n8nUrl = process.env.NEXT_PUBLIC_N8N_UI_URL || 'http://localhost:5678';
  const n8nBaseUrl = process.env.NEXT_PUBLIC_N8N_BASE_URL || 'http://localhost:5678';

  // 워크플로우별 동적 폼 컴포넌트
  const WorkflowForm = getWorkflowForm(workflowId, workflowName);

  // 모달이 열릴 때 워크플로우 정보 로드
  useEffect(() => {
    if (isOpen && workflowId) {
      loadWorkflowInfo();
    } else {
      // 모달이 닫히면 상태 초기화
      resetModal();
    }
  }, [isOpen, workflowId]);

  /**
   * 워크플로우 정보 로드 및 Webhook 노드 탐지
   */
  const loadWorkflowInfo = async () => {
    try {
      setLoadingWorkflow(true);
      setStatus('loading');

      // n8n API로 워크플로우 정보 가져오기 (백엔드 프록시 사용)
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (!response.ok) {
        throw new Error('워크플로우 정보를 불러올 수 없습니다.');
      }

      // Content-Type 검증
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`예상치 못한 응답 형식입니다 (Content-Type: ${contentType || 'unknown'})`);
      }

      const responseData = await response.json();

      const workflow: N8nWorkflow = responseData.data || responseData;
      setWorkflowInfo(workflow);

      // FormSchema 추출
      const schema = extractFormSchema(workflow);
      setFormSchema(schema);

      // Webhook 노드 찾기
      const webhookNode = workflow.nodes?.find(
        (node) =>
          node.type === 'n8n-nodes-base.webhook' || node.type === 'n8n-nodes-base.webhookTrigger'
      );

      if (webhookNode) {
        const params = webhookNode.parameters as WebhookNodeParameters;
        setWebhookPath(params.path || 'webhook');
        setWebhookMethod(params.httpMethod || 'POST');
      }

      setStatus('form');
    } catch (error) {
      console.error('워크플로우 정보 로드 오류:', error);
      setStatus('form'); // 에러가 나도 폼은 표시
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const resetModal = () => {
    setStatus('idle');
    setResult({});
    setWorkflowInfo(null);
    setWebhookPath(null);
    setWebhookMethod('POST');
    setFormData({});
    setFormSchema(null);
  };

  /**
   * Webhook URL 생성 (WebhookInfoPanel과 동일한 로직)
   */
  const getWebhookUrl = (path: string, env: 'test' | 'production'): string => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const prefix = env === 'test' ? '/webhook-test' : '/webhook';
    return `${n8nBaseUrl}${prefix}${normalizedPath}`;
  };

  /**
   * 워크플로우 실행 함수
   */
  const executeWorkflow = async (inputData: any = {}) => {
    try {
      setStatus('executing');
      setResult({});

      // Webhook 노드가 있는 경우 webhook URL로 직접 호출
      if (webhookPath) {
        const webhookUrl = getWebhookUrl(webhookPath, webhookEnvironment);
        const response = await fetch(webhookUrl, {
          method: webhookMethod,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(inputData),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Content-Type 확인하여 HTML 또는 JSON 처리
        const contentType = response.headers.get('content-type');
        let responseData: any;
        let isHtmlResponse = false;

        if (contentType && contentType.includes('text/html')) {
          // HTML 응답인 경우
          const htmlText = await response.text();
          responseData = { htmlContent: htmlText };
          isHtmlResponse = true;
        } else if (contentType && contentType.includes('application/json')) {
          // JSON 응답인 경우
          responseData = await response.json();
        } else {
          // 기타 응답 형식
          const textContent = await response.text();
          responseData = { textContent, contentType: contentType || 'unknown' };
        }

        setStatus('success');
        setResult({
          executionId: responseData.executionId || responseData.id,
          message: isHtmlResponse
            ? 'HTML 응답을 받았습니다.'
            : '워크플로우가 성공적으로 실행되었습니다.',
          data: responseData,
        });
      } else {
        // Webhook 노드가 없는 경우 기존 API 사용
        const data = await workflowsApi.execute(workflowId, inputData, { waitForExecution: false });

        setStatus('success');
        setResult({
          executionId: data.data?.executionId || data.data?.id,
          message: '워크플로우가 성공적으로 실행되었습니다.',
        });
      }
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

  /**
   * 폼 제출 핸들러
   */
  const handleFormSubmit = (data: Record<string, any>) => {
    setFormData(data); // 폼 데이터 저장 (WebhookInfoPanel에서 사용)
    executeWorkflow(data);
  };

  /**
   * 폼 취소 핸들러
   */
  const handleFormCancel = () => {
    onClose();
  };

  /**
   * 데이터 없이 바로 실행 핸들러
   */
  const handleExecuteWithoutData = () => {
    executeWorkflow({});
  };

  /**
   * 상태별 아이콘
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
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

  /**
   * 상태별 제목
   */
  const getStatusTitle = () => {
    switch (status) {
      case 'loading':
        return '워크플로우 정보 조회 중...';
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

  /**
   * 상태별 메시지
   */
  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return '워크플로우 정보를 불러오고 있습니다. 잠시만 기다려주세요.';
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

  // 폼 상태일 때 워크플로우별 동적 폼 표시 (form 또는 executing)
  if (status === 'form' || status === 'executing') {
    const isSubmitting = status === 'executing';

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`워크플로우 실행: ${workflowName}`}
        size="lg"
        showCloseButton={!isSubmitting}
        closeOnOverlayClick={!isSubmitting}
        closeOnEscape={!isSubmitting}
      >
        {/* Webhook 정보 패널 (Webhook 노드가 있는 경우에만 표시) */}
        {webhookPath && (
          <WebhookInfoPanel
            webhookPath={webhookPath}
            baseUrl={n8nBaseUrl}
            httpMethod={webhookMethod}
            formData={formData}
            formSchema={formSchema}
            onEnvironmentChange={setWebhookEnvironment}
          />
        )}

        {/* 워크플로우 폼 */}
        <WorkflowForm
          workflowId={workflowId}
          workflowName={workflowName}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          onExecuteWithoutData={handleExecuteWithoutData}
          isSubmitting={isSubmitting}
        />
      </Modal>
    );
  }

  // 로딩, 완료, 에러 상태일 때 결과 화면 표시
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`워크플로우 실행: ${workflowName}`}
      size="md"
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
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

        {/* HTML 응답 렌더링 (성공 시 HTML 응답인 경우) */}
        {status === 'success' && result.data?.htmlContent && (
          <div className="mb-6">
            <div className="mb-2 text-sm font-semibold text-gray-700">응답 내용:</div>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <iframe
                srcDoc={result.data.htmlContent}
                className="w-full h-96 bg-white"
                sandbox="allow-same-origin"
                title="워크플로우 응답"
              />
            </div>
          </div>
        )}

        {/* JSON 응답 표시 (성공 시 JSON 응답인 경우) */}
        {status === 'success' &&
          result.data &&
          !result.data.htmlContent &&
          result.data.textContent && (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="mb-2 text-sm font-semibold text-gray-700">응답 내용:</div>
              <pre className="text-xs text-gray-800 overflow-auto max-h-64 whitespace-pre-wrap">
                {result.data.textContent}
              </pre>
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
              onClick={() => setStatus('form')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>다시 실행</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>

        {/* n8n에서 열기 버튼 (항상 표시) */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
          <a
            href={`${n8nUrl}/workflows`}
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
