/**
 * 폴더 관련 타입 정의
 */

export type PermissionLevel = 'viewer' | 'executor' | 'editor' | 'admin';

export interface FolderResponse {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FolderTreeNode extends FolderResponse {
  children: FolderTreeNode[];
  workflowCount?: number;
}

export interface FolderPermissionResponse {
  id: string;
  folderId: string;
  userId: string;
  permission: PermissionLevel;
  grantedBy: string;
  grantedAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  inherited?: boolean;
}
