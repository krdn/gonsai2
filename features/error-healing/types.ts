/**
 * Error Healing Types
 */

export interface ErrorPattern {
  id: string;
  signature: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoHealable: boolean;
}

export interface DiagnosisResult {
  patternId: string;
  severity: string;
  diagnosticSteps: string[];
  autoHealable: boolean;
  recommendations?: string[];
}

export interface HealingAction {
  action: string;
  command?: string;
  requiresApproval: boolean;
  successCriteria: string;
}
