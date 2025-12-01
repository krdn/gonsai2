/**
 * Workflow 페이지 유틸리티 함수
 */

export interface StickyNoteContent {
  title: string;
  description: string;
  details: string[];
}

/**
 * Sticky Note에서 설명 추출
 */
export function extractDescriptionFromStickyNote(nodes: any[]): StickyNoteContent | null {
  const stickyNote = nodes?.find((node: any) => node.type === 'n8n-nodes-base.stickyNote');

  if (!stickyNote || !stickyNote.parameters?.content) {
    return null;
  }

  const content = stickyNote.parameters.content;
  const result: StickyNoteContent = {
    title: '',
    description: '',
    details: [],
  };

  // ## 제목 추출
  const titleMatch = content.match(/^##\s+(.+)$/m);
  if (titleMatch) {
    result.title = titleMatch[1].trim();
  }

  // ### 설명 섹션 추출
  const descMatch = content.match(/###\s+설명\s*\n([\s\S]*?)(?=###|$)/);
  if (descMatch) {
    result.description = descMatch[1].trim();
  }

  // ### 상세내역 섹션 추출
  const detailMatch = content.match(/###\s+상세내역\s*\n([\s\S]*?)(?=###|$)/);
  if (detailMatch) {
    result.details = detailMatch[1]
      .split('\n')
      .filter((line: string) => line.trim().startsWith('-'))
      .map((line: string) => line.replace(/^-\s*/, '').trim());
  }

  return result;
}

/**
 * 트리거 타입 추출
 */
export function extractTriggerType(nodes: any[]): string {
  const triggerNode = nodes?.find(
    (node: any) =>
      node.type?.includes('webhook') ||
      node.type?.includes('formTrigger') ||
      node.type?.includes('cron') ||
      node.type?.includes('emailTrigger')
  );

  if (!triggerNode) return 'manual';

  if (triggerNode.type.includes('webhook')) return 'webhook';
  if (triggerNode.type.includes('formTrigger')) return 'form';
  if (triggerNode.type.includes('cron')) return 'cron';
  if (triggerNode.type.includes('emailTrigger')) return 'email';

  return 'trigger';
}

/**
 * AI 모델 추출
 */
export function extractAIModels(nodes: any[]): string[] {
  const aiNodes =
    nodes?.filter(
      (node: any) =>
        node.type?.includes('langchain') ||
        node.type?.includes('gemini') ||
        node.type?.includes('openai')
    ) || [];

  return aiNodes
    .map((node: any) => {
      // 모델 ID에서 이름 추출
      if (node.parameters?.model) {
        const model = node.parameters.model;
        // model이 문자열인지 확인
        if (typeof model === 'string') {
          // "moonshotai/kimi-k2:free" -> "kimi-k2"
          if (model.includes('/')) {
            return model.split('/').pop()?.split(':')[0] || model;
          }
          return model;
        }
        // model이 객체인 경우 (예: { value: "..." })
        if (typeof model === 'object' && model?.value) {
          const modelValue = String(model.value);
          if (modelValue.includes('/')) {
            return modelValue.split('/').pop()?.split(':')[0] || modelValue;
          }
          return modelValue;
        }
        return String(model);
      }
      if (node.parameters?.modelId?.value) {
        const value = node.parameters.modelId.value;
        // value가 문자열인지 확인
        if (typeof value !== 'string') return 'unknown';
        // "={{ $json.body.aimodel }}" -> "dynamic"
        if (value.includes('$json')) return 'dynamic';
        // "models/gemini-2.5-pro" -> "gemini-2.5-pro"
        if (value.includes('models/')) {
          return value.split('models/')[1];
        }
        return value;
      }
      // 노드 타입에서 추출
      const typeName = node.type.split('.').pop() || '';
      if (typeName.includes('gemini')) return 'gemini';
      if (typeName.includes('openai') || typeName.includes('ChatOpenAi')) return 'openai';
      if (typeName.includes('OpenRouter')) return 'openrouter';
      return typeName;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // 중복 제거
}

/**
 * 날짜 포맷팅
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
