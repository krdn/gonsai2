'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import {
  LearningFormData,
  LearningFormErrors,
  LLM_MODELS,
  OUTPUT_FORMATS,
} from '@/types/learning.types';
import { WorkflowFormProps, FormErrors } from './WorkflowFormProps';

/**
 * 지식 습득 워크플로우 전용 입력 폼
 * 학습 주제, 목표, LLM 모델, 학습 시간 등을 입력받습니다.
 */
export default function KnowledgeLearningForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: WorkflowFormProps) {
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

  /**
   * 폼 검증 함수
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

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

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // n8n 워크플로우가 기대하는 형식으로 변환
    const submitData = {
      topic: formData.topic,
      goals: formData.goal, // goal → goals
      llmModel: formData.llmModel,
      studyTime: formData.learningHours, // learningHours → studyTime
      outputFormat: formData.outputFormat,
      notificationEmail: formData.email, // email → notificationEmail
    };

    onSubmit(submitData);
  };

  /**
   * 입력 필드 변경 핸들러
   */
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

  return (
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
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
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
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
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
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
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
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
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
            disabled={isSubmitting}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
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
            disabled={isSubmitting}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 ${
              formErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
        </div>

        {/* Submit 버튼 */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#F56482] hover:bg-[#E5537A] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? '제출 중...' : 'Submit'}</span>
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
