/**
 * Error Analyzer
 *
 * Analyzes n8n execution errors and provides categorization, pattern matching,
 * and actionable insights for error resolution.
 */

interface ExecutionError {
  message: string;
  description?: string;
  stack?: string;
  context?: any;
}

interface ErrorAnalysis {
  category: ErrorCategory;
  severity: ErrorSeverity;
  pattern: string;
  suggestion: string;
  isRetryable: boolean;
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
}

enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  UNKNOWN = 'unknown',
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

class ErrorAnalyzer {
  /**
   * Error pattern matchers with categorization and suggestions
   */
  private static readonly ERROR_PATTERNS = [
    // Network Errors
    {
      pattern: /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      suggestion:
        'Check network connectivity and target service availability. Verify firewall rules and DNS resolution.',
      isRetryable: true,
      estimatedImpact: 'high' as const,
    },
    {
      pattern: /socket hang up|connect timeout/i,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      suggestion:
        'Connection was interrupted. Consider increasing timeout values or checking network stability.',
      isRetryable: true,
      estimatedImpact: 'medium' as const,
    },

    // Authentication Errors
    {
      pattern: /401|unauthorized|authentication failed|invalid credentials/i,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.CRITICAL,
      suggestion:
        'Verify API credentials, tokens, or authentication headers. Check if credentials have expired.',
      isRetryable: false,
      estimatedImpact: 'critical' as const,
    },
    {
      pattern: /403|forbidden|access denied/i,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      suggestion: 'User lacks required permissions. Review access control settings and user roles.',
      isRetryable: false,
      estimatedImpact: 'high' as const,
    },

    // Timeout Errors
    {
      pattern: /timeout|timed out|deadline exceeded/i,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      suggestion:
        'Operation exceeded time limit. Increase timeout settings or optimize the operation.',
      isRetryable: true,
      estimatedImpact: 'medium' as const,
    },

    // Validation Errors
    {
      pattern: /400|bad request|invalid input|validation error/i,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      suggestion:
        'Input data does not meet requirements. Review data format and field constraints.',
      isRetryable: false,
      estimatedImpact: 'medium' as const,
    },
    {
      pattern: /missing required|required field|field is required/i,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      suggestion: 'One or more required fields are missing. Check workflow input configuration.',
      isRetryable: false,
      estimatedImpact: 'medium' as const,
    },

    // Rate Limit Errors
    {
      pattern: /429|rate limit|too many requests|quota exceeded/i,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      suggestion:
        'API rate limit exceeded. Implement exponential backoff or reduce request frequency.',
      isRetryable: true,
      estimatedImpact: 'medium' as const,
    },

    // Configuration Errors
    {
      pattern: /configuration error|invalid configuration|misconfigured/i,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      suggestion: 'Workflow or node configuration is invalid. Review settings and parameters.',
      isRetryable: false,
      estimatedImpact: 'high' as const,
    },

    // Resource Errors
    {
      pattern: /out of memory|memory limit|disk full|no space left/i,
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.CRITICAL,
      suggestion: 'System resources exhausted. Scale up resources or optimize data processing.',
      isRetryable: false,
      estimatedImpact: 'critical' as const,
    },
    {
      pattern: /502|503|service unavailable|temporarily unavailable/i,
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.HIGH,
      suggestion: 'Dependent service is unavailable. Wait and retry, or check service status.',
      isRetryable: true,
      estimatedImpact: 'high' as const,
    },
  ];

  /**
   * Analyze execution error and provide categorized insights
   */
  static analyze(error: ExecutionError): ErrorAnalysis {
    const errorText = this.extractErrorText(error);

    // Find matching pattern
    for (const pattern of this.ERROR_PATTERNS) {
      if (pattern.pattern.test(errorText)) {
        return {
          category: pattern.category,
          severity: pattern.severity,
          pattern: pattern.pattern.source,
          suggestion: pattern.suggestion,
          isRetryable: pattern.isRetryable,
          estimatedImpact: pattern.estimatedImpact,
        };
      }
    }

    // No pattern matched - unknown error
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      pattern: 'unknown',
      suggestion: 'Review error details and consult logs for more information.',
      isRetryable: false,
      estimatedImpact: 'medium',
    };
  }

  /**
   * Extract error text from various error formats
   */
  private static extractErrorText(error: ExecutionError): string {
    const parts: string[] = [];

    if (error.message) parts.push(error.message);
    if (error.description) parts.push(error.description);
    if (error.stack) parts.push(error.stack);
    if (error.context) parts.push(JSON.stringify(error.context));

    return parts.join(' ');
  }

  /**
   * Batch analyze multiple errors and provide summary
   */
  static analyzeMultiple(errors: ExecutionError[]): {
    analyses: ErrorAnalysis[];
    summary: {
      totalErrors: number;
      byCategory: Record<string, number>;
      bySeverity: Record<string, number>;
      retryableCount: number;
      criticalCount: number;
    };
  } {
    const analyses = errors.map((error) => this.analyze(error));

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let retryableCount = 0;
    let criticalCount = 0;

    analyses.forEach((analysis) => {
      // Count by category
      byCategory[analysis.category] = (byCategory[analysis.category] || 0) + 1;

      // Count by severity
      bySeverity[analysis.severity] = (bySeverity[analysis.severity] || 0) + 1;

      // Count retryable
      if (analysis.isRetryable) retryableCount++;

      // Count critical
      if (analysis.severity === ErrorSeverity.CRITICAL) criticalCount++;
    });

    return {
      analyses,
      summary: {
        totalErrors: errors.length,
        byCategory,
        bySeverity,
        retryableCount,
        criticalCount,
      },
    };
  }

  /**
   * Check if error should trigger immediate alert
   */
  static shouldAlert(error: ExecutionError): boolean {
    const analysis = this.analyze(error);

    // Alert on critical severity or authentication errors
    return (
      analysis.severity === ErrorSeverity.CRITICAL ||
      analysis.category === ErrorCategory.AUTHENTICATION ||
      analysis.estimatedImpact === 'critical'
    );
  }

  /**
   * Suggest retry strategy based on error analysis
   */
  static suggestRetryStrategy(error: ExecutionError): {
    shouldRetry: boolean;
    delayMs: number;
    maxRetries: number;
    strategy: 'immediate' | 'exponential' | 'linear' | 'none';
  } {
    const analysis = this.analyze(error);

    if (!analysis.isRetryable) {
      return {
        shouldRetry: false,
        delayMs: 0,
        maxRetries: 0,
        strategy: 'none',
      };
    }

    // Different strategies based on error category
    switch (analysis.category) {
      case ErrorCategory.RATE_LIMIT:
        return {
          shouldRetry: true,
          delayMs: 60000, // Start with 1 minute
          maxRetries: 5,
          strategy: 'exponential',
        };

      case ErrorCategory.NETWORK:
      case ErrorCategory.RESOURCE:
        return {
          shouldRetry: true,
          delayMs: 5000, // Start with 5 seconds
          maxRetries: 3,
          strategy: 'exponential',
        };

      case ErrorCategory.TIMEOUT:
        return {
          shouldRetry: true,
          delayMs: 10000, // Start with 10 seconds
          maxRetries: 2,
          strategy: 'linear',
        };

      default:
        return {
          shouldRetry: false,
          delayMs: 0,
          maxRetries: 0,
          strategy: 'none',
        };
    }
  }
}

export default ErrorAnalyzer;
export { ErrorCategory, ErrorSeverity };
export type { ExecutionError, ErrorAnalysis };
