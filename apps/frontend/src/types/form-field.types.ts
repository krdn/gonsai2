/**
 * Dynamic Form Field Types
 * n8n 워크플로우 JSON에서 읽어온 formFields 스키마를 기반으로
 * 동적으로 폼을 생성하기 위한 타입 정의
 */

/**
 * 모든 필드 타입의 공통 속성
 */
export interface FormFieldBase {
  /** 필드의 고유 이름 (폼 데이터 키로 사용) */
  name: string;

  /** 사용자에게 보여질 라벨 */
  label: string;

  /** 필드 타입 */
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio';

  /** 필수 입력 여부 */
  required?: boolean;

  /** 플레이스홀더 텍스트 */
  placeholder?: string;

  /** 필드 설명 (도움말) */
  description?: string;

  /** 기본값 */
  default?: any;
}

/**
 * 텍스트 입력 필드 (text, email)
 */
export interface TextFieldConfig extends FormFieldBase {
  type: 'text' | 'email';

  /** 최소 길이 */
  minLength?: number;

  /** 최대 길이 */
  maxLength?: number;

  /** 정규식 패턴 (문자열) */
  pattern?: string;
}

/**
 * 다중 줄 텍스트 입력 필드 (textarea)
 */
export interface TextareaFieldConfig extends FormFieldBase {
  type: 'textarea';

  /** 표시할 줄 수 */
  rows?: number;

  /** 최소 길이 */
  minLength?: number;

  /** 최대 길이 */
  maxLength?: number;
}

/**
 * 숫자 입력 필드 (number)
 */
export interface NumberFieldConfig extends FormFieldBase {
  type: 'number';

  /** 최소값 */
  min?: number;

  /** 최대값 */
  max?: number;

  /** 증감 단위 */
  step?: number;
}

/**
 * 드롭다운 선택 필드 (select)
 */
export interface SelectFieldConfig extends FormFieldBase {
  type: 'select';

  /** 선택 옵션 목록 */
  options: Array<{
    value: string;
    label: string;
  }>;
}

/**
 * 체크박스 필드 (checkbox)
 */
export interface CheckboxFieldConfig extends FormFieldBase {
  type: 'checkbox';

  /** 체크박스 라벨 (필드 라벨과 다를 수 있음) */
  checkboxLabel?: string;
}

/**
 * 라디오 버튼 필드 (radio)
 */
export interface RadioFieldConfig extends FormFieldBase {
  type: 'radio';

  /** 라디오 버튼 옵션 목록 */
  options: Array<{
    value: string;
    label: string;
  }>;
}

/**
 * 모든 필드 타입의 Union 타입
 */
export type FormFieldConfig =
  | TextFieldConfig
  | TextareaFieldConfig
  | NumberFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | RadioFieldConfig;

/**
 * 전체 폼 스키마
 */
export interface FormSchema {
  /** 폼 제목 */
  formTitle: string;

  /** 폼 설명 */
  formDescription?: string;

  /** 필드 목록 */
  formFields: FormFieldConfig[];
}

/**
 * 폼 검증 규칙
 */
export interface ValidationRule {
  /** 필수 입력 메시지 */
  required?: string;

  /** 최소 길이 검증 */
  minLength?: {
    value: number;
    message: string;
  };

  /** 최대 길이 검증 */
  maxLength?: {
    value: number;
    message: string;
  };

  /** 패턴 검증 (정규식) */
  pattern?: {
    value: RegExp;
    message: string;
  };

  /** 최소값 검증 */
  min?: {
    value: number;
    message: string;
  };

  /** 최대값 검증 */
  max?: {
    value: number;
    message: string;
  };
}
