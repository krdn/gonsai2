/**
 * Claude Analyzer Service
 *
 * @description Claude API를 사용한 고급 오류 분석
 */

import { log } from '../../../apps/backend/src/utils/logger';
import {
  ClaudeAnalysisRequest,
  ClaudeAnalysisResponse,
  N8nExecutionError,
  AnalyzedError,
} from '../types/error.types';

/**
 * Claude API 설정
 */
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Claude Analyzer Service 클래스
 */
export class ClaudeAnalyzerService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    this.apiKey = CLAUDE_API_KEY;
    this.apiUrl = CLAUDE_API_URL;
    this.model = CLAUDE_MODEL;

    if (!this.apiKey) {
      log.warn('ANTHROPIC_API_KEY not configured. Claude analysis will be disabled.');
    }

    log.info('Claude Analyzer Service initialized');
  }

  /**
   * Claude API로 오류 분석
   */
  async analyzeWithClaude(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const prompt = this.buildAnalysisPrompt(request);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysisText = data.content[0].text;

      // JSON 응답 파싱
      const analysis = this.parseClaudeResponse(analysisText);

      log.info('Claude analysis completed', {
        confidence: analysis.confidence,
        suggestedFixesCount: analysis.suggestedFixes.length,
      });

      return analysis;
    } catch (error) {
      log.error('Claude API call failed', error);
      throw error;
    }
  }

  /**
   * 분석 프롬프트 구성
   */
  private buildAnalysisPrompt(request: ClaudeAnalysisRequest): string {
    const { errorContext, workflowDefinition, recentExecutions, additionalContext } = request;

    let prompt = `당신은 n8n 워크플로우 자동화 전문가입니다. 다음 n8n 워크플로우 실행 오류를 분석하고 수정 방법을 제안해주세요.

# 오류 정보
- 워크플로우 ID: ${errorContext.workflowId}
- 워크플로우 이름: ${errorContext.workflowName}
- 노드 이름: ${errorContext.nodeName} (${errorContext.nodeType})
- 오류 메시지: ${errorContext.errorMessage}
- 발생 시간: ${errorContext.timestamp}

# 워크플로우 정의
\`\`\`json
${JSON.stringify(workflowDefinition, null, 2)}
\`\`\`

`;

    if (recentExecutions && recentExecutions.length > 0) {
      prompt += `\n# 최근 실행 오류 기록
${recentExecutions.map((exec, i) => `${i + 1}. ${exec.nodeName}: ${exec.errorMessage}`).join('\n')}

`;
    }

    if (additionalContext) {
      prompt += `\n# 추가 컨텍스트
${additionalContext}

`;
    }

    prompt += `다음 형식의 JSON으로 응답해주세요:

\`\`\`json
{
  "rootCause": "오류의 근본 원인 (한 문장)",
  "detailedExplanation": "상세한 오류 설명 (2-3 문단)",
  "suggestedFixes": [
    {
      "description": "수정 방법 설명",
      "steps": ["단계1", "단계2", "단계3"],
      "code": "수정할 코드나 설정 (옵션)",
      "priority": "high|medium|low",
      "estimatedImpact": "예상 효과",
      "risks": ["위험 요소1", "위험 요소2"]
    }
  ],
  "codeSnippets": ["실행 가능한 코드 예시"],
  "optimizationSuggestions": ["워크플로우 최적화 제안"],
  "confidence": 0.85
}
\`\`\`

**중요**: 반드시 위 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

    return prompt;
  }

  /**
   * Claude 응답 파싱
   */
  private parseClaudeResponse(responseText: string): ClaudeAnalysisResponse {
    try {
      // JSON 코드 블록 추출
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      const parsed = JSON.parse(jsonText);

      return {
        rootCause: parsed.rootCause || 'Unknown',
        detailedExplanation: parsed.detailedExplanation || '',
        suggestedFixes: parsed.suggestedFixes || [],
        codeSnippets: parsed.codeSnippets || [],
        optimizationSuggestions: parsed.optimizationSuggestions || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      log.error('Failed to parse Claude response', error);

      // 파싱 실패 시 기본 응답
      return {
        rootCause: 'Parse error',
        detailedExplanation: responseText,
        suggestedFixes: [],
        confidence: 0.3,
      };
    }
  }

  /**
   * 복잡한 오류에 대한 고급 분석
   */
  async analyzeComplexError(analyzedError: AnalyzedError): Promise<ClaudeAnalysisResponse> {
    // 워크플로우 정의 가져오기 (실제 구현 필요)
    const workflowDefinition = {
      id: analyzedError.executionError.workflowId,
      name: analyzedError.executionError.workflowName,
      // n8nClient.getWorkflow()로 실제 정의 가져오기
    };

    const request: ClaudeAnalysisRequest = {
      errorContext: analyzedError.executionError,
      workflowDefinition,
      additionalContext: `
오류 유형: ${analyzedError.errorType}
심각도: ${analyzedError.severity}
자동 수정 가능: ${analyzedError.autoFixable}
매칭된 패턴: ${analyzedError.patterns.join(', ')}
제안된 수정: ${analyzedError.suggestedFixes.join(', ')}
      `.trim(),
    };

    return await this.analyzeWithClaude(request);
  }

  /**
   * 워크플로우 최적화 제안
   */
  async suggestOptimizations(
    workflowId: string,
    workflowDefinition: Record<string, unknown>
  ): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }

    const prompt = `다음 n8n 워크플로우를 분석하고 성능 및 안정성 최적화 방법을 제안해주세요.

# 워크플로우 정의
\`\`\`json
${JSON.stringify(workflowDefinition, null, 2)}
\`\`\`

최적화 제안 목록을 JSON 배열로 반환해주세요:
\`\`\`json
{
  "suggestions": ["제안1", "제안2", "제안3"]
}
\`\`\``;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content[0].text;

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;

      const parsed = JSON.parse(jsonText);
      return parsed.suggestions || [];
    } catch (error) {
      log.error('Failed to get optimization suggestions', error);
      return [];
    }
  }

  /**
   * API 키 확인
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

/**
 * 싱글톤 인스턴스
 */
export const claudeAnalyzer = new ClaudeAnalyzerService();
