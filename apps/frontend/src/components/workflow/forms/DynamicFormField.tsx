'use client';

import React from 'react';
import {
  FormFieldConfig,
  SelectFieldConfig,
  NumberFieldConfig,
  TextareaFieldConfig,
  CheckboxFieldConfig,
  RadioFieldConfig,
} from '@/types/form-field.types';

interface DynamicFormFieldProps {
  /** 필드 설정 */
  field: FormFieldConfig;

  /** 현재 값 */
  value: any;

  /** 에러 메시지 */
  error?: string;

  /** 값 변경 핸들러 */
  onChange: (name: string, value: any) => void;

  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 동적 폼 필드 컴포넌트
 * formField 설정에 따라 적절한 입력 컴포넌트를 렌더링합니다.
 */
export default function DynamicFormField({
  field,
  value,
  error,
  onChange,
  disabled = false,
}: DynamicFormFieldProps) {
  /**
   * 입력 변경 핸들러
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    let newValue: any;

    // 타입별 값 변환
    if (field.type === 'number') {
      newValue = e.target.value ? parseFloat(e.target.value) : 0;
    } else if (field.type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else {
      newValue = e.target.value;
    }

    onChange(field.name, newValue);
  };

  /**
   * 라디오 버튼 변경 핸들러
   */
  const handleRadioChange = (selectedValue: string) => {
    onChange(field.name, selectedValue);
  };

  /**
   * 공통 input props
   */
  const commonInputProps = {
    id: field.name,
    name: field.name,
    disabled,
    placeholder: field.placeholder,
    className: `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
      error ? 'border-red-500' : 'border-gray-300'
    }`,
  };

  /**
   * 필드 타입별 렌더링
   */
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <input
            type={field.type}
            {...commonInputProps}
            value={value || ''}
            onChange={handleChange}
          />
        );

      case 'textarea': {
        const textareaField = field as TextareaFieldConfig;
        return (
          <textarea
            {...commonInputProps}
            value={value || ''}
            onChange={handleChange}
            rows={textareaField.rows || 4}
            className={`${commonInputProps.className} resize-none`}
          />
        );
      }

      case 'number': {
        const numberField = field as NumberFieldConfig;
        return (
          <input
            type="number"
            {...commonInputProps}
            value={value ?? numberField.default ?? ''}
            onChange={handleChange}
            min={numberField.min}
            max={numberField.max}
            step={numberField.step || 1}
          />
        );
      }

      case 'select': {
        const selectField = field as SelectFieldConfig;
        return (
          <select {...commonInputProps} value={value || ''} onChange={handleChange}>
            <option value="">선택하세요...</option>
            {selectField.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }

      case 'checkbox': {
        const checkboxField = field as CheckboxFieldConfig;
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              disabled={disabled}
              checked={value || false}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor={field.name} className="ml-2 text-sm font-medium text-gray-700">
              {checkboxField.checkboxLabel || field.label}
            </label>
          </div>
        );
      }

      case 'radio': {
        const radioField = field as RadioFieldConfig;
        return (
          <div className="space-y-2">
            {radioField.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  type="radio"
                  id={`${field.name}-${option.value}`}
                  name={field.name}
                  value={option.value}
                  disabled={disabled}
                  checked={value === option.value}
                  onChange={() => handleRadioChange(option.value)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor={`${field.name}-${option.value}`}
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );
      }

      default:
        console.warn(`[DynamicFormField] Unknown field type: ${(field as any).type}`);
        return (
          <p className="text-sm text-red-600">지원하지 않는 필드 타입: {(field as any).type}</p>
        );
    }
  };

  return (
    <div>
      {/* 라벨 (checkbox 타입은 라벨을 렌더링하지 않음) */}
      {field.type !== 'checkbox' && (
        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 필드 입력 컴포넌트 */}
      {renderField()}

      {/* 에러 메시지 */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* 필드 설명 (에러가 없을 때만 표시) */}
      {!error && field.description && (
        <p className="mt-1 text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}
