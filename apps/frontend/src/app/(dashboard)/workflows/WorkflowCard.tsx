'use client';

import React from 'react';
import {
  Play,
  Tag as TagIcon,
  Copy,
  Check,
  Webhook,
  FileText,
  Bot,
  Info,
  FolderOpen,
} from 'lucide-react';
import { FolderResponse } from '@/lib/api-client';
import { Workflow } from './types';
import {
  extractDescriptionFromStickyNote,
  extractTriggerType,
  extractAIModels,
  formatDate,
} from './utils';

interface WorkflowCardProps {
  workflow: Workflow;
  folders: FolderResponse[];
  copiedId: string | null;
  onCopyId: (id: string) => void;
  onExecute: (workflowId: string, workflowName: string) => void;
  onTagSelect: (tagId: string) => void;
  onFolderSelect: (folderId: string) => void;
}

export default function WorkflowCard({
  workflow,
  folders,
  copiedId,
  onCopyId,
  onExecute,
  onTagSelect,
  onFolderSelect,
}: WorkflowCardProps) {
  const stickyContent = extractDescriptionFromStickyNote(workflow.nodes);
  const triggerType = extractTriggerType(workflow.nodes);
  const aiModels = extractAIModels(workflow.nodes);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      {/* Workflow Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{workflow.name}</h3>
          {/* ID 표시 */}
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => onCopyId(workflow.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
              title="클릭하여 복사"
            >
              {copiedId === workflow.id ? (
                <>
                  <Check className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">복사됨</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{workflow.id}</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                workflow.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {workflow.active ? '활성화됨' : '비활성화됨'}
            </span>
            <span className="text-xs text-gray-500">{workflow.nodes?.length || 0}개 노드</span>
          </div>
        </div>
      </div>

      {/* 설명 (Sticky Note에서 추출) */}
      {stickyContent?.description && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700 line-clamp-2">{stickyContent.description}</p>
          {stickyContent.details.length > 0 && (
            <div className="mt-2 flex items-start gap-1">
              <Info className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-500 line-clamp-1">
                {stickyContent.details.join(' • ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 트리거 타입 & AI 모델 배지 */}
      <div className="mb-3 flex items-center gap-1 flex-wrap">
        {/* 트리거 타입 */}
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">
          {triggerType === 'webhook' && <Webhook className="w-3 h-3" />}
          {triggerType === 'form' && <FileText className="w-3 h-3" />}
          {triggerType === 'manual' && <Play className="w-3 h-3" />}
          {triggerType}
        </span>

        {/* AI 모델 */}
        {aiModels.map((model) => (
          <span
            key={model}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded"
          >
            <Bot className="w-3 h-3" />
            {model}
          </span>
        ))}
      </div>

      {/* Folder */}
      {workflow.folderId && (
        <div className="mb-3">
          <button
            onClick={() => onFolderSelect(workflow.folderId!)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
          >
            <FolderOpen className="w-3 h-3" />
            {folders.find((f) => f.id === workflow.folderId)?.name || '폴더'}
          </button>
        </div>
      )}

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 flex-wrap">
            {workflow.tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => onTagSelect(tag.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                <TagIcon className="w-3 h-3" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Info */}
      <div className="mb-4 space-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>📅 생성: {formatDate(workflow.createdAt)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>✏️ 수정: {formatDate(workflow.updatedAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onExecute(workflow.id, workflow.name)}
          disabled={!workflow.active}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>실행</span>
        </button>
        <a
          href={`${process.env.NEXT_PUBLIC_N8N_UI_URL || 'https://n8n.krdn.kr'}/workflow/${workflow.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          n8n에서 열기
        </a>
      </div>
    </div>
  );
}
