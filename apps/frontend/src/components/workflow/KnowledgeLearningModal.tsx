'use client';

/**
 * @deprecated 이 컴포넌트는 deprecated되었습니다.
 * 대신 WorkflowExecutionModal을 사용하세요.
 * WorkflowExecutionModal은 워크플로우별로 자동으로 적절한 폼을 선택합니다.
 *
 * Migration:
 * ```tsx
 * // Before
 * <KnowledgeLearningModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   workflowId={workflowId}
 * />
 *
 * // After
 * <WorkflowExecutionModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   workflowId={workflowId}
 *   workflowName={workflowName}
 * />
 * ```
 */

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { CheckCircle, XCircle, Loader2, Send, ExternalLink } from 'lucide-react';
import { workflowsApi } from '@/lib/api-client';
import {
  LearningFormData,
  LearningFormErrors,
  LearningExecutionResult,
  LearningExecutionStatus,
  LLM_MODELS,
  OUTPUT_FORMATS,
} from '@/types/learning.types';

interface KnowledgeLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
}

export default function KnowledgeLearningModal({
  isOpen,
  onClose,
  workflowId,
}: KnowledgeLearningModalProps) {
  const [status, setStatus] = useState<LearningExecutionStatus>('idle');
  const [result, setResult] = useState<LearningExecutionResult>({});
  const n8nUrl = process.env.NEXT_PUBLIC_N8N_UI_URL || 'https://n8n.krdn.kr';

  // 폼 데이터 상태
  const [formData, setFormData] = useState<LearningFormData>({
    topic: '',
    goal: '',
    llmModel: '',
    learningHours: 8,
    outputFormat: 'HTML',
    email: '',
  });

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<LearningFormErrors>({});

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const errors: LearningFormErrors = {};

    // 내가 배우고 싶은 것
    if (!formData.topic.trim()) {
      errors.topic = '배우고 싶은 내용을 입력해주세요';
    }

    // 학습 최종 요청(목표)
    if (!formData.goal.trim()) {
      errors.goal = '학습 목표를 입력해주세요';
    } else if (formData.goal.trim().length < 10) {
      errors.goal = '학습 목표를 10자 이상 입력해주세요';
    }

    // LLM 모델선택
    if (!formData.llmModel) {
      errors.llmModel = 'LLM 모델을 선택해주세요';
    }

    // 학습 시간
    if (formData.learningHours < 1 || formData.learningHours > 24) {
      errors.learningHours = '학습 시간은 1-24시간 사이여야 합니다';
    }

    // 이메일
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = '이메일 주소를 입력해주세요';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = '올바른 이메일 주소를 입력해주세요';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 폼 검증
    if (!validateForm()) {
      return;
    }

    try {
      setStatus('submitting');
      setResult({});

      // n8n 워크플로우 실행 (필드명을 워크플로우가 기대하는 형식으로 변환)
      const data = await workflowsApi.execute(
        workflowId,
        {
          topic: formData.topic,
          goals: formData.goal, // goal → goals
          llmModel: formData.llmModel,
          studyTime: formData.learningHours, // learningHours → studyTime
          outputFormat: formData.outputFormat,
          notificationEmail: formData.email, // email → notificationEmail
        },
        { waitForExecution: false }
      );

      setStatus('success');
      setResult({
        executionId: data.data?.executionId || data.data?.id,
        message: '지식 습득 프로세스가 성공적으로 시작되었습니다. 결과는 이메일로 전송됩니다.',
      });
    } catch (err) {
      console.error('워크플로우 실행 오류:', err);
      setStatus('error');

      let errorMessage = '워크플로우 실행 중 오류가 발생했습니다.';

      if (err instanceof Error) {
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

  // 입력 필드 변경 핸들러
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'learningHours' ? parseInt(value, 10) || 0 : value,
    }));

    // 해당 필드의 에러 제거
    if (formErrors[name as keyof LearningFormErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // 모달이 닫힐 때 상태 초기화
  const handleClose = () => {
    setStatus('idle');
    setResult({});
    setFormData({
      topic: '',
      goal: '',
      llmModel: '',
      learningHours: 8,
      outputFormat: 'HTML',
      email: '',
    });
    setFormErrors({});
    onClose();
  };

  // 상태별 아이콘
  const getStatusIcon = () => {
    switch (status) {
      case 'submitting':
        return <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-600" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-600" />;
      default:
        return null;
    }
  };

  // 제출 중이거나 성공/실패 상태일 때 결과 화면 표시
  if (status !== 'idle') {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="지식 습득 프로세스" size="md">
        <div className="p-8">
          {/* 상태 아이콘 */}
          <div className="flex flex-col items-center justify-center space-y-4 mb-6">
            {getStatusIcon()}
            <h3 className="text-xl font-semibold text-gray-900">
              {status === 'submitting' && '처리 중...'}
              {status === 'success' && '제출 완료!'}
              {status === 'error' && '제출 실패'}
            </h3>
            <p className="text-center text-gray-600">
              {status === 'submitting' && '워크플로우를 실행하고 있습니다. 잠시만 기다려주세요.'}
              {status === 'success' && result.message}
              {status === 'error' && result.error}
            </p>
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
                onClick={() => setStatus('idle')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>다시 제출</span>
              </button>
            )}

            <button
              onClick={handleClose}
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

  // 폼 화면
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="지식 습득 프로세스" size="lg">
      <div className="p-6">
        {/* 설명 */}
        <p className="text-gray-600 mb-6">
          학습하고자 하는 내용을 입력하면 상세하게 학습 방법들을 자세하게 알려줍니다
        </p>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 내가 배우고 싶은 것 */}
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
              내가 배우고 싶은 것 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleInputChange}
              placeholder="예: React 고급 패턴"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.topic ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.topic && <p className="mt-1 text-sm text-red-600">{formErrors.topic}</p>}
          </div>

          {/* 학습 최종 요청(목표) */}
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
              학습 최종 요청(목표) <span className="text-red-500">*</span>
            </label>
            <textarea
              id="goal"
              name="goal"
              value={formData.goal}
              onChange={handleInputChange}
              rows={4}
              placeholder="예: React의 고급 패턴들을 이해하고 실무에서 활용할 수 있는 수준까지 학습하고 싶습니다."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.goal ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.goal && <p className="mt-1 text-sm text-red-600">{formErrors.goal}</p>}
          </div>

          {/* LLM 모델선택 */}
          <div>
            <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-2">
              LLM 모델선택 <span className="text-red-500">*</span>
            </label>
            <select
              id="llmModel"
              name="llmModel"
              value={formData.llmModel}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.llmModel ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select an option ...</option>
              {LLM_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            {formErrors.llmModel && (
              <p className="mt-1 text-sm text-red-600">{formErrors.llmModel}</p>
            )}
          </div>

          {/* 학습 시간 */}
          <div>
            <label htmlFor="learningHours" className="block text-sm font-medium text-gray-700 mb-2">
              학습 시간: <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="learningHours"
              name="learningHours"
              value={formData.learningHours}
              onChange={handleInputChange}
              min="1"
              max="24"
              placeholder="8"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.learningHours ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <p className="mt-1 text-xs text-gray-500">시간 단위 (1-24시간)</p>
            {formErrors.learningHours && (
              <p className="mt-1 text-sm text-red-600">{formErrors.learningHours}</p>
            )}
          </div>

          {/* 출력 형식 */}
          <div>
            <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 mb-2">
              출력 형식: <span className="text-red-500">*</span>
            </label>
            <select
              id="outputFormat"
              name="outputFormat"
              value={formData.outputFormat}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {OUTPUT_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">학습 계획을 받을 파일 형식을 선택하세요.</p>
          </div>

          {/* 발송 Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              발송 Email: <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
          </div>

          {/* Submit 버튼 */}
          <div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#F56482] hover:bg-[#E5537A] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              <span>Submit</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
