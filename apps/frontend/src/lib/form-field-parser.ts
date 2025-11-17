/**
 * Form Field Parser Utilities
 * n8n 워크플로우 JSON에서 formFields 스키마를 추출하고 검증 규칙을 생성하는 유틸리티 함수들
 */

import { N8nWorkflow, N8nNode } from '@/types/workflow';
import {
  FormSchema,
  FormFieldConfig,
  ValidationRule,
  TextFieldConfig,
  TextareaFieldConfig,
  NumberFieldConfig,
} from '@/types/form-field.types';

/**
 * n8n 필드 이름을 camelCase로 변환
 */
function fieldLabelToName(label: string): string {
  return label
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '') // 특수문자 제거
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase()) // 공백 뒤 대문자화
    .replace(/\s/g, '') // 공백 제거
    .replace(/^(.)/, (_, char) => char.toLowerCase()); // 첫 글자 소문자
}

/**
 * n8n fieldType을 우리 FormFieldConfig type으로 매핑
 */
function mapN8nFieldType(n8nFieldType?: string): FormFieldConfig['type'] {
  if (!n8nFieldType) return 'text';

  const typeMap: Record<string, FormFieldConfig['type']> = {
    textarea: 'textarea',
    dropdown: 'select',
    number: 'number',
    email: 'email',
    checkbox: 'checkbox',
    radio: 'radio',
  };

  return typeMap[n8nFieldType.toLowerCase()] || 'text';
}

/**
 * n8n 워크플로우에서 InputForm 노드를 찾아 FormSchema 추출
 *
 * @param workflow - n8n 워크플로우 객체
 * @returns FormSchema 또는 null (InputForm 노드를 찾지 못한 경우)
 *
 * @example
 * const schema = extractFormSchema(workflow);
 * if (schema) {
 *   console.log(schema.formTitle); // "지식 습득 프로세스"
 *   console.log(schema.formFields); // [{ name: "topic", label: "...", ... }]
 * }
 */
export function extractFormSchema(workflow: N8nWorkflow): FormSchema | null {
  if (!workflow || !workflow.nodes || !Array.isArray(workflow.nodes)) {
    console.warn('[extractFormSchema] Invalid workflow structure');
    return null;
  }

  // formTrigger 타입의 노드 찾기 (모든 Form Trigger 지원)
  const inputFormNode = workflow.nodes.find(
    (node: N8nNode) => node.type === 'n8n-nodes-base.formTrigger' && node.parameters?.formFields
  );

  if (!inputFormNode) {
    console.info('[extractFormSchema] No formTrigger node found in workflow');
    return null;
  }

  console.log(
    '[extractFormSchema] Found formTrigger node:',
    inputFormNode.name,
    'with formTitle:',
    inputFormNode.parameters.formTitle
  );

  // formFields 검증 - n8n은 formFields.values 구조 사용
  const formFieldsData = inputFormNode.parameters?.formFields;

  if (!formFieldsData) {
    console.warn('[extractFormSchema] No formFields found in InputForm node');
    return null;
  }

  // n8n 구조: formFields.values 배열
  const n8nFields = formFieldsData.values || formFieldsData;

  if (!Array.isArray(n8nFields) || n8nFields.length === 0) {
    console.warn('[extractFormSchema] formFields is not an array or is empty');
    return null;
  }

  console.log('[extractFormSchema] Found n8n fields:', n8nFields);

  // n8n 필드를 우리 FormFieldConfig 형식으로 변환
  const formFields: FormFieldConfig[] = n8nFields.map((n8nField: any, index: number) => {
    const fieldLabel = n8nField.fieldLabel || `field${index}`;
    const fieldType = mapN8nFieldType(n8nField.fieldType);
    const fieldName = fieldLabelToName(fieldLabel);

    // 기본 필드 구성
    const baseField: any = {
      name: fieldName,
      label: fieldLabel,
      type: fieldType,
      required: n8nField.requiredField === true,
      placeholder: n8nField.placeholder,
    };

    // 타입별 추가 속성 처리
    if (fieldType === 'select' && n8nField.fieldOptions?.values) {
      // dropdown의 경우 options 변환
      baseField.options = n8nField.fieldOptions.values.map((opt: any) => ({
        value: opt.option,
        label: opt.option,
      }));
    }

    return baseField as FormFieldConfig;
  });

  // FormSchema 생성
  const schema: FormSchema = {
    formTitle: workflow.name,
    formDescription: inputFormNode.parameters.formDescription,
    formFields,
  };

  console.info(
    `[extractFormSchema] Successfully extracted form schema with ${schema.formFields.length} fields`
  );
  console.log('[extractFormSchema] Converted fields:', formFields);

  return schema;
}

/**
 * FormField 타입별 검증 규칙 생성
 *
 * @param field - 폼 필드 설정
 * @returns ValidationRule 객체
 *
 * @example
 * const rules = createValidationRules({
 *   name: "email",
 *   label: "이메일",
 *   type: "email",
 *   required: true
 * });
 * // { required: "이메일을(를) 입력해주세요", pattern: { value: /.../, message: "..." } }
 */
export function createValidationRules(field: FormFieldConfig): ValidationRule {
  const rules: ValidationRule = {};

  // Required 검증
  if (field.required) {
    rules.required = `${field.label}을(를) 입력해주세요`;
  }

  // 타입별 검증 규칙
  switch (field.type) {
    case 'text':
    case 'textarea': {
      const textField = field as TextFieldConfig | TextareaFieldConfig;

      // MinLength 검증
      if (textField.minLength !== undefined && textField.minLength > 0) {
        rules.minLength = {
          value: textField.minLength,
          message: `${field.label}은(는) ${textField.minLength}자 이상이어야 합니다`,
        };
      }

      // MaxLength 검증
      if (textField.maxLength !== undefined && textField.maxLength > 0) {
        rules.maxLength = {
          value: textField.maxLength,
          message: `${field.label}은(는) ${textField.maxLength}자 이하여야 합니다`,
        };
      }

      // Pattern 검증 (text 타입만)
      if (field.type === 'text' && (textField as TextFieldConfig).pattern) {
        try {
          const patternStr = (textField as TextFieldConfig).pattern!;
          rules.pattern = {
            value: new RegExp(patternStr),
            message: `${field.label}의 형식이 올바르지 않습니다`,
          };
        } catch (error) {
          console.warn(
            `[createValidationRules] Invalid regex pattern for field "${field.name}": ${error}`
          );
        }
      }
      break;
    }

    case 'email': {
      // Email 패턴 검증
      rules.pattern = {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: '올바른 이메일 주소를 입력해주세요',
      };

      const emailField = field as TextFieldConfig;

      // MinLength 검증
      if (emailField.minLength !== undefined && emailField.minLength > 0) {
        rules.minLength = {
          value: emailField.minLength,
          message: `${field.label}은(는) ${emailField.minLength}자 이상이어야 합니다`,
        };
      }

      // MaxLength 검증
      if (emailField.maxLength !== undefined && emailField.maxLength > 0) {
        rules.maxLength = {
          value: emailField.maxLength,
          message: `${field.label}은(는) ${emailField.maxLength}자 이하여야 합니다`,
        };
      }
      break;
    }

    case 'number': {
      const numberField = field as NumberFieldConfig;

      // Min 검증
      if (numberField.min !== undefined) {
        rules.min = {
          value: numberField.min,
          message: `${field.label}은(는) ${numberField.min} 이상이어야 합니다`,
        };
      }

      // Max 검증
      if (numberField.max !== undefined) {
        rules.max = {
          value: numberField.max,
          message: `${field.label}은(는) ${numberField.max} 이하여야 합니다`,
        };
      }
      break;
    }

    case 'select':
    case 'checkbox':
    case 'radio':
      // Select, Checkbox, Radio는 별도의 검증 규칙이 없음 (required만 적용)
      break;

    default:
      console.warn(`[createValidationRules] Unknown field type: ${(field as any).type}`);
  }

  return rules;
}

/**
 * 폼 데이터 검증
 *
 * @param formData - 폼 입력 데이터
 * @param formSchema - 폼 스키마
 * @returns 검증 에러 객체 (에러가 없으면 빈 객체)
 *
 * @example
 * const errors = validateFormData(
 *   { email: "invalid-email" },
 *   schema
 * );
 * if (Object.keys(errors).length > 0) {
 *   console.log("Validation failed:", errors);
 * }
 */
export function validateFormData(
  formData: Record<string, any>,
  formSchema: FormSchema
): Record<string, string> {
  const errors: Record<string, string> = {};

  formSchema.formFields.forEach((field) => {
    const value = formData[field.name];
    const rules = createValidationRules(field);

    // Required 검증
    if (
      rules.required &&
      (value === undefined ||
        value === null ||
        value === '' ||
        (typeof value === 'string' && !value.trim()))
    ) {
      errors[field.name] = rules.required;
      return;
    }

    // 값이 없으면 추가 검증 스킵
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && !value.trim())
    ) {
      return;
    }

    // MinLength 검증
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength.value) {
      errors[field.name] = rules.minLength.message;
      return;
    }

    // MaxLength 검증
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength.value) {
      errors[field.name] = rules.maxLength.message;
      return;
    }

    // Pattern 검증
    if (rules.pattern && typeof value === 'string' && !rules.pattern.value.test(value)) {
      errors[field.name] = rules.pattern.message;
      return;
    }

    // Min 검증 (number)
    if (rules.min && typeof value === 'number' && value < rules.min.value) {
      errors[field.name] = rules.min.message;
      return;
    }

    // Max 검증 (number)
    if (rules.max && typeof value === 'number' && value > rules.max.value) {
      errors[field.name] = rules.max.message;
      return;
    }
  });

  return errors;
}

/**
 * FormField 기본값 추출
 *
 * @param formSchema - 폼 스키마
 * @returns 기본값 객체
 *
 * @example
 * const defaultValues = getDefaultFormData(schema);
 * // { learningHours: 8, llmModel: "gpt-4" }
 */
export function getDefaultFormData(formSchema: FormSchema): Record<string, any> {
  const defaultData: Record<string, any> = {};

  formSchema.formFields.forEach((field) => {
    if (field.default !== undefined) {
      defaultData[field.name] = field.default;
    }
  });

  return defaultData;
}
