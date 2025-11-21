/**
 * Error Analyzer
 *
 * Analyzes execution errors, categorizes them, and suggests retry strategies.
 */

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  TIMEOUT = 'timeout',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  CONFIGURATION = 'configuration',
  RESOURCE = 'resource',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ExecutionError {
  message: string;
  description?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface ErrorAnalysis {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  suggestion: string;
  estimatedImpact?: string;
}

export interface RetryStrategy {
  shouldRetry: boolean;
  strategy: 'none' | 'linear' | 'exponential';
  delayMs: number;
  maxRetries: number;
}

export interface MultipleErrorAnalysis {
  analyses: ErrorAnalysis[];
  summary: {
    totalErrors: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    retryableCount: number;
    criticalCount: number;
  };
}

class ErrorAnalyzer {
  private static extractErrorText(error: ExecutionError): string {
    const parts = [
      error.message,
      error.description,
      error.stack,
      error.context ? JSON.stringify(error.context) : '',
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  static analyze(error: ExecutionError): ErrorAnalysis {
    const errorText = this.extractErrorText(error);

    // Network errors
    if (
      errorText.includes('econnrefused') ||
      errorText.includes('enotfound') ||
      errorText.includes('enetunreach')
    ) {
      return {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        isRetryable: true,
        suggestion: 'Check network connectivity and ensure the target service is running.',
      };
    }

    // Authentication errors
    if (errorText.includes('401') || errorText.includes('unauthorized')) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.CRITICAL,
        isRetryable: false,
        suggestion: 'Verify credentials and API keys. Check if they have expired.',
        estimatedImpact: 'critical',
      };
    }

    if (errorText.includes('403') || errorText.includes('forbidden')) {
      return {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        suggestion: 'Check permissions and access rights for this resource.',
      };
    }

    // Timeout errors
    if (
      errorText.includes('timeout') ||
      errorText.includes('etimedout') ||
      errorText.includes('timed out')
    ) {
      return {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        suggestion: 'Increase timeout settings or optimize the operation.',
      };
    }

    // Configuration errors (check before validation to avoid 'invalid' match)
    if (errorText.includes('configuration') || errorText.includes('config error')) {
      return {
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        isRetryable: false,
        suggestion: 'Review and fix the configuration settings.',
      };
    }

    // Validation errors
    if (
      errorText.includes('400') ||
      errorText.includes('bad request') ||
      errorText.includes('validation') ||
      errorText.includes('invalid') ||
      errorText.includes('required field')
    ) {
      return {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: false,
        suggestion: 'Check input data format and required fields.',
      };
    }

    // Rate limit errors
    if (
      errorText.includes('429') ||
      errorText.includes('rate limit') ||
      errorText.includes('too many requests')
    ) {
      return {
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        isRetryable: true,
        suggestion: 'Wait before retrying. Consider implementing rate limit handling.',
      };
    }

    // Resource errors
    if (
      errorText.includes('out of memory') ||
      errorText.includes('heap') ||
      errorText.includes('503') ||
      errorText.includes('service unavailable')
    ) {
      const isRetryable = errorText.includes('503') || errorText.includes('service unavailable');
      return {
        category: ErrorCategory.RESOURCE,
        severity: ErrorSeverity.CRITICAL,
        isRetryable,
        suggestion: 'Check system resources. Consider scaling up or optimizing memory usage.',
        estimatedImpact: isRetryable ? undefined : 'critical',
      };
    }

    // Unknown errors
    return {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      isRetryable: false,
      suggestion: 'Review error details and logs for more information.',
    };
  }

  static analyzeMultiple(errors: ExecutionError[]): MultipleErrorAnalysis {
    const analyses = errors.map((error) => this.analyze(error));

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    let retryableCount = 0;
    let criticalCount = 0;

    for (const analysis of analyses) {
      byCategory[analysis.category] = (byCategory[analysis.category] || 0) + 1;
      bySeverity[analysis.severity] = (bySeverity[analysis.severity] || 0) + 1;

      if (analysis.isRetryable) {
        retryableCount++;
      }
      if (analysis.severity === ErrorSeverity.CRITICAL) {
        criticalCount++;
      }
    }

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

  static shouldAlert(error: ExecutionError): boolean {
    const analysis = this.analyze(error);

    return (
      analysis.severity === ErrorSeverity.CRITICAL ||
      analysis.category === ErrorCategory.AUTHENTICATION ||
      analysis.estimatedImpact === 'critical'
    );
  }

  static suggestRetryStrategy(error: ExecutionError): RetryStrategy {
    const analysis = this.analyze(error);

    if (!analysis.isRetryable) {
      return {
        shouldRetry: false,
        strategy: 'none',
        delayMs: 0,
        maxRetries: 0,
      };
    }

    // Rate limit: longer delay
    if (analysis.category === ErrorCategory.RATE_LIMIT) {
      return {
        shouldRetry: true,
        strategy: 'exponential',
        delayMs: 60000, // 1 minute
        maxRetries: 5,
      };
    }

    // Timeout: linear retry with moderate delay
    if (analysis.category === ErrorCategory.TIMEOUT) {
      return {
        shouldRetry: true,
        strategy: 'linear',
        delayMs: 10000, // 10 seconds
        maxRetries: 2,
      };
    }

    // Network/Resource errors: exponential backoff
    if (
      analysis.category === ErrorCategory.NETWORK ||
      analysis.category === ErrorCategory.RESOURCE
    ) {
      return {
        shouldRetry: true,
        strategy: 'exponential',
        delayMs: 5000, // 5 seconds
        maxRetries: 3,
      };
    }

    // Default
    return {
      shouldRetry: true,
      strategy: 'exponential',
      delayMs: 5000,
      maxRetries: 3,
    };
  }
}

export default ErrorAnalyzer;
