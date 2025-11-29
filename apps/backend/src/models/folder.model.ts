/**
 * Folder Model
 *
 * @description 폴더 데이터 모델 및 MongoDB 스키마
 * 워크플로우를 그룹화하고 권한을 관리하기 위한 폴더 시스템
 */

import { ObjectId } from 'mongodb';

/**
 * 폴더 인터페이스
 */
export interface IFolder {
  _id?: ObjectId;
  name: string; // 폴더 이름
  description?: string; // 폴더 설명
  parentId?: ObjectId; // 상위 폴더 ID (계층 구조)
  createdBy: ObjectId; // 생성자
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 폴더 응답 인터페이스
 */
export interface IFolderResponse {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 폴더 생성 DTO
 */
export interface ICreateFolderDto {
  name: string;
  description?: string;
  parentId?: string;
}

/**
 * 폴더 수정 DTO
 */
export interface IUpdateFolderDto {
  name?: string;
  description?: string;
  parentId?: string | null; // null이면 최상위 폴더로 이동
}

/**
 * 폴더 트리 노드 (계층 구조 표시용)
 */
export interface IFolderTreeNode extends IFolderResponse {
  children: IFolderTreeNode[];
  workflowCount?: number;
}

/**
 * Folder 모델을 FolderResponse로 변환
 */
export function toFolderResponse(folder: IFolder): IFolderResponse {
  return {
    id: folder._id?.toString() || '',
    name: folder.name,
    description: folder.description,
    parentId: folder.parentId?.toString(),
    createdBy: folder.createdBy.toString(),
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

/**
 * MongoDB Collection 이름
 */
export const FOLDER_COLLECTION = 'folders';
