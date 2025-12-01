/**
 * 에러 메시지 상수
 *
 * 모든 사용자 facing 에러 메시지를 한글로 통일
 */

export const ErrorMessages = {
  // 인증 관련
  auth: {
    invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    emailExists: '이미 사용 중인 이메일입니다.',
    tokenExpired: '인증 토큰이 만료되었습니다. 다시 로그인해 주세요.',
    tokenInvalid: '유효하지 않은 인증 토큰입니다.',
    unauthorized: '로그인이 필요합니다.',
    forbidden: '접근 권한이 없습니다.',
    tooManyAttempts: '너무 많은 로그인 실패가 있었습니다. 잠시 후 다시 시도해 주세요.',
    passwordResetFailed: '비밀번호 재설정 이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    invalidResetToken: '유효하지 않거나 만료된 재설정 토큰입니다.',
    userNotFound: '사용자를 찾을 수 없습니다.',
    userCreationFailed: '사용자 생성에 실패했습니다.',
  },

  // 리소스 관련
  resource: {
    notFound: (resource: string, id?: string) =>
      id
        ? `${resource}(을)를 찾을 수 없습니다. (ID: ${id})`
        : `${resource}(을)를 찾을 수 없습니다.`,
    alreadyExists: (resource: string) => `이미 존재하는 ${resource}입니다.`,
    createFailed: (resource: string) => `${resource} 생성에 실패했습니다.`,
    updateFailed: (resource: string) => `${resource} 수정에 실패했습니다.`,
    deleteFailed: (resource: string) => `${resource} 삭제에 실패했습니다.`,
  },

  // 폴더/권한 관련
  folder: {
    notFound: '폴더를 찾을 수 없습니다.',
    accessDenied: '이 폴더에 대한 접근 권한이 없습니다.',
    createFailed: '폴더 생성에 실패했습니다.',
    hasChildren: '하위 폴더가 있어 삭제할 수 없습니다.',
    permissionRequired: '폴더 권한이 필요합니다.',
  },

  // 워크플로우 관련
  workflow: {
    notFound: '워크플로우를 찾을 수 없습니다.',
    executionFailed: '워크플로우 실행에 실패했습니다.',
    accessDenied: '이 워크플로우에 대한 접근 권한이 없습니다.',
    notActive: '비활성화된 워크플로우는 실행할 수 없습니다.',
    fetchFailed: '워크플로우 정보를 가져오는데 실패했습니다.',
  },

  // 외부 서비스 관련
  external: {
    n8nConnectionFailed: 'n8n 서버에 연결할 수 없습니다.',
    n8nApiError: 'n8n API 호출 중 오류가 발생했습니다.',
    databaseError: '데이터베이스 오류가 발생했습니다.',
    cacheError: '캐시 서버 오류가 발생했습니다.',
    emailSendFailed: '이메일 발송에 실패했습니다.',
  },

  // 유효성 검증
  validation: {
    required: (field: string) => `${field}은(는) 필수 입력 항목입니다.`,
    invalid: (field: string) => `${field}이(가) 유효하지 않습니다.`,
    tooShort: (field: string, min: number) => `${field}은(는) 최소 ${min}자 이상이어야 합니다.`,
    tooLong: (field: string, max: number) => `${field}은(는) 최대 ${max}자까지 입력 가능합니다.`,
    invalidEmail: '유효한 이메일 주소를 입력해 주세요.',
    invalidPassword: '비밀번호는 8자 이상이며, 영문과 숫자를 포함해야 합니다.',
  },

  // 일반
  general: {
    internalError: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    serviceUnavailable: '서비스를 일시적으로 사용할 수 없습니다.',
    rateLimitExceeded: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    unknownError: '알 수 없는 오류가 발생했습니다.',
  },
} as const;

export type ErrorMessagesType = typeof ErrorMessages;
