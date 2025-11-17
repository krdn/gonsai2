'use client';

import React, { useState } from 'react';
import { Send, Play } from 'lucide-react';
import { WorkflowFormProps, FormErrors } from './WorkflowFormProps';

/**
 * 일반 워크플로우용 기본 입력 폼
 * JSON 형식의 선택적 데이터를 입력받습니다.
 */
export default function DefaultWorkflowForm({
  onSubmit,
  onCancel,
  onExecuteWithoutData,
  isSubmitting = false,
}: WorkflowFormProps) {
  const [inputData, setInputData] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * JSON 유효성 검증
   */
  const validateJSON = (): boolean => {
    if (!inputData.trim()) {
      // 빈 값은 허용 (선택 사항)
      return true;
    }

    try {
      JSON.parse(inputData);
      setErrors({});
      return true;
    } catch (e) {
      setErrors({ inputData: '올바른 JSON 형식이 아닙니다.' });
      return false;
    }
  };

  /**
   * 폼 제출 핸들러 (데이터와 함께 실행)
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateJSON()) {
      return;
    }

    // JSON 파싱
    let parsedData = {};
    if (inputData.trim()) {
      try {
        parsedData = JSON.parse(inputData);
      } catch (e) {
        // 이미 검증했으므로 발생하지 않음
      }
    }

    onSubmit({ inputData: parsedData });
  };

  /**
   * 입력 변경 핸들러
   */
  const handleInputChange = (value: string) => {
    setInputData(value);
    // 에러 초기화
    if (errors.inputData) {
      setErrors({});
    }
  };

  /**
   * 데이터 없이 바로 실행
   */
  const handleExecuteWithoutData = () => {
    if (onExecuteWithoutData) {
      onExecuteWithoutData();
    }
  };

  return (
    <div className="p-6">
      <p className="text-gray-600 mb-6">워크플로우 실행에 필요한 정보를 입력하세요.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* JSON 입력 필드 */}
        <div>
          <label htmlFor="inputData" className="block text-sm font-medium text-gray-700 mb-2">
            입력 데이터
          </label>
          <textarea
            id="inputData"
            name="inputData"
            value={inputData}
            onChange={(e) => handleInputChange(e.target.value)}
            rows={6}
            placeholder='워크플로우에 전달할 데이터 (선택 사항). JSON 형식으로 입력하세요. 예: {"key": "value"}'
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
              errors.inputData ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.inputData && <p className="mt-1 text-sm text-red-600">{errors.inputData}</p>}
          {!errors.inputData && (
            <p className="mt-1 text-xs text-gray-500">
              워크플로우에 전달할 데이터 (선택 사항). JSON 형식으로 입력하세요.
            </p>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="space-y-3">
          {/* 데이터와 함께 실행 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? '실행 중...' : '데이터와 함께 실행'}</span>
          </button>

          {/* 하단 버튼 그룹 */}
          <div className="flex gap-3">
            {/* 데이터 없이 바로 실행 */}
            <button
              type="button"
              onClick={handleExecuteWithoutData}
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>데이터 없이 바로 실행</span>
            </button>

            {/* 취소 */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              취소
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
