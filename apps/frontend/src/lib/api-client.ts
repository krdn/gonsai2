/**
 * 중앙화된 API 클라이언트
 *
 * 이 파일은 기존 import 호환성을 유지하기 위해 존재합니다.
 * 새로운 코드에서는 '@/lib/api'를 직접 import하세요.
 *
 * @deprecated Use '@/lib/api' instead for new code
 */

// 모든 export를 새 모듈에서 re-export
export * from './api';
export { default } from './api';
