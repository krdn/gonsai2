'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { WorkflowFormProps } from './WorkflowFormProps';
import { FormSchema } from '@/types/form-field.types';
import { extractFormSchema, validateFormData, getDefaultFormData } from '@/lib/form-field-parser';
import DynamicFormField from './DynamicFormField';
import DefaultWorkflowForm from './DefaultWorkflowForm';

/**
 * 동적 워크플로우 폼 컴포넌트
 * n8n 워크플로우 JSON에서 formFields 스키마를 읽어 자동으로 입력 폼을 생성합니다.
 */
export default function DynamicWorkflowForm({
  workflowId,
  workflowName,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WorkflowFormProps) {
  // 폼 스키마 상태
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);

  // 폼 데이터 상태
  const [formData, setFormData] = useState<Record<string, any>>({});

  // 폼 에러 상태
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 로딩 상태
  const [loading, setLoading] = useState(true);

  // 에러 상태
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * 워크플로우 정보 로드 및 FormSchema 추출
   */
  useEffect(() => {
    async function loadFormSchema() {
      try {
        setLoading(true);
        setLoadError(null);

        console.log(`[DynamicWorkflowForm] Loading workflow: ${workflowId}`);

        // Next.js API Route를 통해 n8n API 프록시 호출 (CORS 해결)
        const response = await fetch(`/api/n8n/workflows/${workflowId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `워크플로우 조회 실패: ${response.status}`);
        }

        const workflow = await response.json();
        console.log(`[DynamicWorkflowForm] Workflow loaded:`, workflow.name);
        console.log('[DynamicWorkflowForm] Full workflow object:', workflow);
        console.log('[DynamicWorkflowForm] Nodes count:', workflow.nodes?.length);

        // FormSchema 추출
        const schema = extractFormSchema(workflow);
        console.log('[DynamicWorkflowForm] Extracted schema:', schema);

        if (!schema) {
          console.warn('[DynamicWorkflowForm] No InputForm node found in workflow');
          // FormSchema가 없으면 null로 설정 (DefaultWorkflowForm으로 폴백)
          setFormSchema(null);
          setLoading(false);
          return;
        }

        console.log(
          `[DynamicWorkflowForm] Form schema extracted with ${schema.formFields.length} fields`
        );
        setFormSchema(schema);

        // 기본값 설정
        const defaultValues = getDefaultFormData(schema);
        setFormData(defaultValues);
      } catch (error) {
        console.error('[DynamicWorkflowForm] Failed to load form schema:', error);
        setLoadError(
          error instanceof Error
            ? error.message
            : '워크플로우 정보를 불러오는 중 오류가 발생했습니다.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadFormSchema();
  }, [workflowId]);

  /**
   * 필드 값 변경 핸들러
   */
  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // 에러 제거
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSchema) {
      console.error('[DynamicWorkflowForm] Cannot submit: formSchema is null');
      return;
    }

    // 폼 검증
    const validationErrors = validateFormData(formData, formSchema);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      console.log('[DynamicWorkflowForm] Validation failed:', validationErrors);
      return;
    }

    console.log('[DynamicWorkflowForm] Submitting form data:', formData);
    onSubmit(formData);
  };

  /**
   * 로딩 상태
   */
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>폼 설정을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  /**
   * 에러 상태
   */
  if (loadError) {
    return (
      <div className="p-6">
        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">폼 로드 실패</h3>
            <p className="text-sm text-red-700">{loadError}</p>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  /**
   * FormSchema가 없으면 DefaultWorkflowForm으로 폴백
   */
  if (!formSchema) {
    console.log('[DynamicWorkflowForm] No formSchema, falling back to DefaultWorkflowForm');
    return (
      <DefaultWorkflowForm
        workflowId={workflowId}
        workflowName={workflowName}
        onSubmit={onSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />
    );
  }

  /**
   * 동적 폼 렌더링
   */
  return (
    <div className="p-6">
      {/* 폼 설명 */}
      {formSchema.formDescription && (
        <div className="mb-6">
          <p className="text-gray-600 text-sm">{formSchema.formDescription}</p>
        </div>
      )}

      {/* 동적 폼 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 필드 목록 */}
        {formSchema.formFields.map((field) => (
          <DynamicFormField
            key={field.name}
            field={field}
            value={formData[field.name]}
            error={errors[field.name]}
            onChange={handleFieldChange}
            disabled={isSubmitting}
          />
        ))}

        {/* Submit 버튼 */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#F56482] hover:bg-[#E5537A] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>제출 중...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>제출</span>
              </>
            )}
          </button>
        </div>

        {/* 취소 버튼 */}
        <div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
