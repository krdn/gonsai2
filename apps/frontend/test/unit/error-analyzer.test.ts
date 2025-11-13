/**
 * Error Analyzer Tests
 *
 * Unit tests for error analysis, categorization, and retry strategy suggestions.
 */

import ErrorAnalyzer, { ErrorCategory, ErrorSeverity } from '@/lib/n8n/error-analyzer';
import type { ExecutionError } from '@/lib/n8n/error-analyzer';
import { mockErrorPatterns } from '@/test/unit/__mocks__/n8n-fixtures';

describe('ErrorAnalyzer', () => {
  describe('analyze', () => {
    it('should categorize network errors', () => {
      const error: ExecutionError = {
        message: 'ECONNREFUSED: Connection refused at 192.168.1.1:5000',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
      expect(analysis.severity).toBe(ErrorSeverity.HIGH);
      expect(analysis.isRetryable).toBe(true);
      expect(analysis.suggestion).toContain('network connectivity');
    });

    it('should categorize ENOTFOUND DNS errors', () => {
      const error: ExecutionError = {
        message: 'getaddrinfo ENOTFOUND api.example.com',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
      expect(analysis.isRetryable).toBe(true);
    });

    it('should categorize authentication errors as critical', () => {
      const error: ExecutionError = {
        message: '401 Unauthorized: Invalid API key',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(analysis.severity).toBe(ErrorSeverity.CRITICAL);
      expect(analysis.isRetryable).toBe(false);
      expect(analysis.estimatedImpact).toBe('critical');
      expect(analysis.suggestion).toContain('credentials');
    });

    it('should categorize 403 forbidden errors', () => {
      const error: ExecutionError = {
        message: '403 Forbidden: Access denied',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(analysis.severity).toBe(ErrorSeverity.HIGH);
      expect(analysis.isRetryable).toBe(false);
    });

    it('should categorize timeout errors', () => {
      const error: ExecutionError = {
        message: 'Request timeout after 30000ms',
        description: 'Operation timed out',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.TIMEOUT);
      expect(analysis.severity).toBe(ErrorSeverity.MEDIUM);
      expect(analysis.isRetryable).toBe(true);
      expect(analysis.suggestion).toContain('timeout');
    });

    it('should categorize validation errors', () => {
      const error: ExecutionError = {
        message: '400 Bad Request: Invalid input data',
        description: 'Field "email" must be a valid email address',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.VALIDATION);
      expect(analysis.severity).toBe(ErrorSeverity.MEDIUM);
      expect(analysis.isRetryable).toBe(false);
    });

    it('should categorize missing required field errors', () => {
      const error: ExecutionError = {
        message: 'Validation error: required field "userId" is missing',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.VALIDATION);
      expect(analysis.isRetryable).toBe(false);
    });

    it('should categorize rate limit errors', () => {
      const error: ExecutionError = {
        message: '429 Too Many Requests',
        description: 'Rate limit exceeded. Try again in 60 seconds.',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(analysis.severity).toBe(ErrorSeverity.MEDIUM);
      expect(analysis.isRetryable).toBe(true);
      expect(analysis.suggestion).toContain('rate limit');
    });

    it('should categorize configuration errors', () => {
      const error: ExecutionError = {
        message: 'Configuration error: Invalid webhook URL format',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.CONFIGURATION);
      expect(analysis.severity).toBe(ErrorSeverity.HIGH);
      expect(analysis.isRetryable).toBe(false);
    });

    it('should categorize resource errors', () => {
      const error: ExecutionError = {
        message: 'JavaScript heap out of memory',
        stack: 'FATAL ERROR: Reached heap limit...',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.RESOURCE);
      expect(analysis.severity).toBe(ErrorSeverity.CRITICAL);
      expect(analysis.isRetryable).toBe(false);
      expect(analysis.estimatedImpact).toBe('critical');
    });

    it('should categorize 503 service unavailable errors', () => {
      const error: ExecutionError = {
        message: '503 Service Unavailable',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.RESOURCE);
      expect(analysis.isRetryable).toBe(true);
    });

    it('should handle unknown errors gracefully', () => {
      const error: ExecutionError = {
        message: 'Something went wrong in custom node',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.UNKNOWN);
      expect(analysis.severity).toBe(ErrorSeverity.MEDIUM);
      expect(analysis.isRetryable).toBe(false);
      expect(analysis.suggestion).toContain('Review error details');
    });

    it('should extract error text from context', () => {
      const error: ExecutionError = {
        message: 'Error occurred',
        context: { code: 'ECONNREFUSED', port: 5000 },
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });
  });

  describe('analyzeMultiple', () => {
    it('should analyze multiple errors and provide summary', () => {
      const errors: ExecutionError[] = [
        { message: 'ECONNREFUSED' },
        { message: '401 Unauthorized' },
        { message: 'Request timeout' },
        { message: '429 Too Many Requests' },
        { message: 'ECONNREFUSED' },
      ];

      const result = ErrorAnalyzer.analyzeMultiple(errors);

      expect(result.analyses).toHaveLength(5);
      expect(result.summary.totalErrors).toBe(5);
      expect(result.summary.byCategory[ErrorCategory.NETWORK]).toBe(2);
      expect(result.summary.byCategory[ErrorCategory.AUTHENTICATION]).toBe(1);
      expect(result.summary.byCategory[ErrorCategory.TIMEOUT]).toBe(1);
      expect(result.summary.byCategory[ErrorCategory.RATE_LIMIT]).toBe(1);
    });

    it('should count errors by severity', () => {
      const errors: ExecutionError[] = [
        { message: '401 Unauthorized' }, // CRITICAL
        { message: 'ECONNREFUSED' }, // HIGH
        { message: 'Request timeout' }, // MEDIUM
      ];

      const result = ErrorAnalyzer.analyzeMultiple(errors);

      expect(result.summary.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
      expect(result.summary.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(result.summary.bySeverity[ErrorSeverity.MEDIUM]).toBe(1);
    });

    it('should count retryable errors', () => {
      const errors: ExecutionError[] = [
        { message: 'ECONNREFUSED' }, // Retryable
        { message: '401 Unauthorized' }, // Not retryable
        { message: '429 Too Many Requests' }, // Retryable
      ];

      const result = ErrorAnalyzer.analyzeMultiple(errors);

      expect(result.summary.retryableCount).toBe(2);
    });

    it('should count critical errors', () => {
      const errors: ExecutionError[] = [
        { message: '401 Unauthorized' }, // CRITICAL
        { message: 'Out of memory' }, // CRITICAL
        { message: 'ECONNREFUSED' }, // HIGH
      ];

      const result = ErrorAnalyzer.analyzeMultiple(errors);

      expect(result.summary.criticalCount).toBe(2);
    });

    it('should handle empty error array', () => {
      const result = ErrorAnalyzer.analyzeMultiple([]);

      expect(result.analyses).toHaveLength(0);
      expect(result.summary.totalErrors).toBe(0);
      expect(result.summary.retryableCount).toBe(0);
    });
  });

  describe('shouldAlert', () => {
    it('should alert on critical severity errors', () => {
      const error: ExecutionError = {
        message: '401 Unauthorized',
      };

      const shouldAlert = ErrorAnalyzer.shouldAlert(error);

      expect(shouldAlert).toBe(true);
    });

    it('should alert on authentication errors', () => {
      const error: ExecutionError = {
        message: '403 Forbidden',
      };

      const shouldAlert = ErrorAnalyzer.shouldAlert(error);

      expect(shouldAlert).toBe(true);
    });

    it('should alert on critical impact errors', () => {
      const error: ExecutionError = {
        message: 'Out of memory',
      };

      const shouldAlert = ErrorAnalyzer.shouldAlert(error);

      expect(shouldAlert).toBe(true);
    });

    it('should not alert on medium severity network errors', () => {
      const error: ExecutionError = {
        message: 'Request timeout',
      };

      const shouldAlert = ErrorAnalyzer.shouldAlert(error);

      expect(shouldAlert).toBe(false);
    });

    it('should not alert on validation errors', () => {
      const error: ExecutionError = {
        message: '400 Bad Request',
      };

      const shouldAlert = ErrorAnalyzer.shouldAlert(error);

      expect(shouldAlert).toBe(false);
    });
  });

  describe('suggestRetryStrategy', () => {
    it('should suggest exponential backoff for rate limit errors', () => {
      const error: ExecutionError = {
        message: '429 Too Many Requests',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.strategy).toBe('exponential');
      expect(strategy.delayMs).toBe(60000); // 1 minute
      expect(strategy.maxRetries).toBe(5);
    });

    it('should suggest exponential backoff for network errors', () => {
      const error: ExecutionError = {
        message: 'ECONNREFUSED',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.strategy).toBe('exponential');
      expect(strategy.delayMs).toBe(5000);
      expect(strategy.maxRetries).toBe(3);
    });

    it('should suggest exponential backoff for resource errors', () => {
      const error: ExecutionError = {
        message: '503 Service Unavailable',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.strategy).toBe('exponential');
    });

    it('should suggest linear retry for timeout errors', () => {
      const error: ExecutionError = {
        message: 'Request timeout',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(true);
      expect(strategy.strategy).toBe('linear');
      expect(strategy.delayMs).toBe(10000);
      expect(strategy.maxRetries).toBe(2);
    });

    it('should suggest no retry for authentication errors', () => {
      const error: ExecutionError = {
        message: '401 Unauthorized',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.strategy).toBe('none');
      expect(strategy.maxRetries).toBe(0);
    });

    it('should suggest no retry for validation errors', () => {
      const error: ExecutionError = {
        message: '400 Bad Request',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.strategy).toBe('none');
    });

    it('should suggest no retry for configuration errors', () => {
      const error: ExecutionError = {
        message: 'Configuration error',
      };

      const strategy = ErrorAnalyzer.suggestRetryStrategy(error);

      expect(strategy.shouldRetry).toBe(false);
      expect(strategy.strategy).toBe('none');
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with only message', () => {
      const error: ExecutionError = {
        message: 'ECONNREFUSED',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle error with message and description', () => {
      const error: ExecutionError = {
        message: 'Network error',
        description: 'ECONNREFUSED: Connection refused',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle error with stack trace', () => {
      const error: ExecutionError = {
        message: 'Error',
        stack: 'Error: ECONNREFUSED\n    at Socket.connect',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle complex context objects', () => {
      const error: ExecutionError = {
        message: 'Error occurred',
        context: {
          error: 'ECONNREFUSED',
          details: {
            host: '192.168.1.1',
            port: 5000,
          },
        },
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });

    it('should handle empty error object', () => {
      const error: ExecutionError = {
        message: '',
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.UNKNOWN);
    });

    it('should be case-insensitive in pattern matching', () => {
      const errors: ExecutionError[] = [
        { message: 'ECONNREFUSED' },
        { message: 'econnrefused' },
        { message: 'EConnRefused' },
      ];

      errors.forEach(error => {
        const analysis = ErrorAnalyzer.analyze(error);
        expect(analysis.category).toBe(ErrorCategory.NETWORK);
      });
    });

    it('should match patterns in any part of error text', () => {
      const error: ExecutionError = {
        message: 'Failed to connect',
        description: 'Network issue detected',
        context: { errorCode: 'ECONNREFUSED' },
      };

      const analysis = ErrorAnalyzer.analyze(error);

      expect(analysis.category).toBe(ErrorCategory.NETWORK);
    });
  });
});
