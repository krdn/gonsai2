/**
 * Workflow 페이지 타입 정의
 */

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings: any;
  tags?: Tag[];
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionModalState {
  isOpen: boolean;
  workflowId: string;
  workflowName: string;
}
