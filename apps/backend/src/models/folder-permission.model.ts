/**
 * Folder Permission Model
 *
 * @description 폴더 권한 데이터 모델 및 MongoDB 스키마
 * 사용자별 폴더 접근 권한을 관리
 */

import { ObjectId } from 'mongodb';

/**
 * 권한 레벨 타입
 * - viewer: 조회만 가능
 * - executor: 조회 + 워크플로우 실행
 * - editor: 조회 + 실행 + 편집
 * - admin: 모든 권한 + 폴더 관리
 */
export type PermissionLevel = 'viewer' | 'executor' | 'editor' | 'admin';

/**
 * 작업 타입
 */
export type PermissionAction = 'view' | 'execute' | 'edit' | 'manage';

/**
 * 권한별 가능한 작업
 */
export const PERMISSION_ACTIONS: Record<PermissionLevel, readonly PermissionAction[]> = {
  viewer: ['view'],
  executor: ['view', 'execute'],
  editor: ['view', 'execute', 'edit'],
  admin: ['view', 'execute', 'edit', 'manage'],
};

/**
 * 권한 레벨 계층 (숫자가 높을수록 높은 권한)
 */
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  viewer: 1,
  executor: 2,
  editor: 3,
  admin: 4,
};

/**
 * 폴더 권한 인터페이스
 */
export interface IFolderPermission {
  _id?: ObjectId;
  folderId: ObjectId; // 폴더 ID
  userId: ObjectId; // 사용자 ID
  permission: PermissionLevel; // 권한 레벨
  grantedBy: ObjectId; // 권한 부여자
  grantedAt: Date;
  updatedAt: Date;
}

/**
 * 폴더 권한 응답 인터페이스
 */
export interface IFolderPermissionResponse {
  id: string;
  folderId: string;
  userId: string;
  permission: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
  updatedAt: string;
  // 조인된 정보 (선택적)
  userName?: string;
  userEmail?: string;
  folderName?: string;
  inherited?: boolean; // 상위 폴더에서 상속받은 권한인지
}

/**
 * 권한 부여 DTO
 */
export interface IGrantPermissionDto {
  userId: string;
  permission: PermissionLevel;
}

/**
 * 권한 수정 DTO
 */
export interface IUpdatePermissionDto {
  permission: PermissionLevel;
}

/**
 * 사용자의 유효 권한 (상속 포함)
 */
export interface IEffectivePermission {
  folderId: string;
  folderName: string;
  permission: PermissionLevel;
  inherited: boolean;
  inheritedFrom?: string; // 상속받은 폴더 ID
}

/**
 * FolderPermission 모델을 FolderPermissionResponse로 변환
 */
export function toFolderPermissionResponse(
  permission: IFolderPermission,
  extra?: {
    userName?: string;
    userEmail?: string;
    folderName?: string;
    inherited?: boolean;
  }
): IFolderPermissionResponse {
  return {
    id: permission._id?.toString() || '',
    folderId: permission.folderId.toString(),
    userId: permission.userId.toString(),
    permission: permission.permission,
    grantedBy: permission.grantedBy.toString(),
    grantedAt: permission.grantedAt.toISOString(),
    updatedAt: permission.updatedAt.toISOString(),
    userName: extra?.userName,
    userEmail: extra?.userEmail,
    folderName: extra?.folderName,
    inherited: extra?.inherited,
  };
}

/**
 * 주어진 권한이 특정 작업을 수행할 수 있는지 확인
 */
export function canPerformAction(permission: PermissionLevel, action: PermissionAction): boolean {
  return PERMISSION_ACTIONS[permission].includes(action);
}

/**
 * 두 권한 레벨 중 더 높은 권한 반환
 */
export function getHigherPermission(p1: PermissionLevel, p2: PermissionLevel): PermissionLevel {
  return PERMISSION_HIERARCHY[p1] >= PERMISSION_HIERARCHY[p2] ? p1 : p2;
}

/**
 * 권한 레벨 비교 (-1: p1 < p2, 0: p1 == p2, 1: p1 > p2)
 */
export function comparePermissions(p1: PermissionLevel, p2: PermissionLevel): number {
  const h1 = PERMISSION_HIERARCHY[p1];
  const h2 = PERMISSION_HIERARCHY[p2];
  return h1 < h2 ? -1 : h1 > h2 ? 1 : 0;
}

/**
 * MongoDB Collection 이름
 */
export const FOLDER_PERMISSION_COLLECTION = 'folder_permissions';
