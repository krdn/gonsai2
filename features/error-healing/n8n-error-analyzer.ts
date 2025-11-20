/**
 * n8n Error Analyzer
 */

import errorPatterns from '../../.ai/error-patterns.json';
import type { DiagnosisResult, ErrorPattern } from './types';

// Type definition for error patterns JSON structure
interface ErrorCategory {
  description: string;
  patterns: Array<{
    id: string;
    signature: string;
    severity: string;
    impact: string;
    commonCauses: string[];
    diagnosticSteps: string[];
    autoHealingActions: Array<{
      action: string;
      command: string;
      successCriteria: string;
      requiresApproval: boolean;
    }>;
    manualResolution: string;
  }>;
}

interface ErrorPatternsData {
  errorCategories: Record<string, ErrorCategory>;
}

const typedErrorPatterns = errorPatterns as unknown as ErrorPatternsData;

export class N8nErrorAnalyzer {
  analyze(error: Error): DiagnosisResult {
    // Search through error patterns
    for (const category in typedErrorPatterns.errorCategories) {
      const patterns = typedErrorPatterns.errorCategories[category].patterns;

      for (const pattern of patterns) {
        if (new RegExp(pattern.signature).test(error.message)) {
          return {
            patternId: pattern.id,
            severity: pattern.severity,
            diagnosticSteps: pattern.diagnosticSteps,
            autoHealable: pattern.autoHealingActions.length > 0,
            recommendations: [pattern.manualResolution],
          };
        }
      }
    }

    // Unknown error
    return {
      patternId: 'unknown',
      severity: 'unknown',
      diagnosticSteps: ['Review error message', 'Check logs'],
      autoHealable: false,
    };
  }

  async diagnose(executionId: string): Promise<DiagnosisResult> {
    // Fetch execution details and analyze
    const error = new Error('Simulated error');
    return this.analyze(error);
  }
}
