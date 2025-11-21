/**
 * N8n Error Analyzer Service
 *
 * @description n8n 실행 오류 분석 및 분류
 */

import { MongoClient } from 'mongodb';
import { envConfig } from '../../../apps/backend/src/utils/env-validator';
import { log } from '../../../apps/backend/src/utils/logger';
import { COLLECTIONS } from '../../../infrastructure/mongodb/schemas/types';
import {
  N8nExecutionError,
  AnalyzedError,
  ErrorType,
  ErrorSeverity,
  ErrorPattern,
} from '../types/error.types';

/**
 * 오류 패턴 데이터베이스
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // 노드 연결 오류
  {
    id: 'node_connection_01',
    name: 'Missing Connection',
    errorType: 'node_connection',
    pattern: /node .* is not connected/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'reconnect_nodes',
    description: '노드 간 연결이 끊어짐',
  },
  {
    id: 'node_connection_02',
    name: 'Invalid Connection',
    errorType: 'node_connection',
    pattern: /invalid connection between/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'reconnect_nodes',
    description: '잘못된 노드 연결',
  },

  // 인증 오류
  {
    id: 'auth_01',
    name: 'Invalid Credentials',
    errorType: 'authentication',
    pattern: /invalid (credentials|api key|token)/i,
    severity: 'critical',
    autoFixable: false,
    fixStrategy: 'update_credential',
    description: '인증 정보가 유효하지 않음',
  },
  {
    id: 'auth_02',
    name: 'Unauthorized Access',
    errorType: 'authentication',
    pattern: /(401|unauthorized|forbidden|403)/i,
    severity: 'critical',
    autoFixable: false,
    fixStrategy: 'update_credential',
    description: '접근 권한 없음',
  },
  {
    id: 'auth_03',
    name: 'Missing Credentials',
    errorType: 'credential_missing',
    pattern: /credentials? (not found|missing|required)/i,
    severity: 'high',
    autoFixable: false,
    fixStrategy: 'update_credential',
    description: '인증 정보 누락',
  },

  // 타임아웃 오류
  {
    id: 'timeout_01',
    name: 'Request Timeout',
    errorType: 'timeout',
    pattern: /(timeout|timed out|time limit exceeded)/i,
    severity: 'medium',
    autoFixable: true,
    fixStrategy: 'adjust_timeout',
    description: '요청 시간 초과',
  },
  {
    id: 'timeout_02',
    name: 'Connection Timeout',
    errorType: 'timeout',
    pattern: /connection (timeout|timed out)/i,
    severity: 'medium',
    autoFixable: true,
    fixStrategy: 'adjust_timeout',
    description: '연결 시간 초과',
  },

  // 데이터 형식 오류
  {
    id: 'data_format_01',
    name: 'JSON Parse Error',
    errorType: 'data_format',
    pattern: /(json parse|unexpected token|invalid json)/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'add_data_transformation',
    description: 'JSON 파싱 오류',
  },
  {
    id: 'data_format_02',
    name: 'Type Mismatch',
    errorType: 'data_format',
    pattern: /(type (error|mismatch)|expected .* got)/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'add_data_transformation',
    description: '데이터 타입 불일치',
  },
  {
    id: 'data_format_03',
    name: 'Missing Required Field',
    errorType: 'data_format',
    pattern: /(missing required (field|property|parameter)|.* is required)/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'add_data_transformation',
    description: '필수 필드 누락',
  },

  // API 오류
  {
    id: 'api_error_01',
    name: 'API Rate Limit',
    errorType: 'api_error',
    pattern: /(rate limit|too many requests|429)/i,
    severity: 'medium',
    autoFixable: true,
    fixStrategy: 'add_retry_logic',
    description: 'API 요청 한도 초과',
  },
  {
    id: 'api_error_02',
    name: 'API Server Error',
    errorType: 'api_error',
    pattern: /(500|502|503|504|internal server error|bad gateway)/i,
    severity: 'medium',
    autoFixable: true,
    fixStrategy: 'add_error_handler',
    description: 'API 서버 오류',
  },

  // 표현식 오류
  {
    id: 'expression_01',
    name: 'Invalid Expression',
    errorType: 'invalid_expression',
    pattern: /(syntax error|invalid expression|cannot read property)/i,
    severity: 'high',
    autoFixable: true,
    fixStrategy: 'update_expression',
    description: '잘못된 표현식 또는 구문',
  },
];

/**
 * N8n Error Analyzer 클래스
 */
export class N8nErrorAnalyzer {
  private mongoClient: MongoClient;
  private errorPatterns: ErrorPattern[];

  constructor() {
    this.mongoClient = new MongoClient(envConfig.MONGODB_URI);
    this.errorPatterns = ERROR_PATTERNS;
    log.info('N8n Error Analyzer initialized');
  }

  /**
   * 최근 오류 가져오기
   */
  async getRecentErrors(limit: number = 50): Promise<N8nExecutionError[]> {
    try {
      await this.mongoClient.connect();

      const executions = await this.mongoClient
        .db()
        .collection(COLLECTIONS.EXECUTIONS)
        .find({ status: 'failed' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      const errors: N8nExecutionError[] = executions
        .filter((exec) => exec.errorDetails)
        .map((exec) => ({
          executionId: exec.n8nExecutionId,
          workflowId: exec.workflowId,
          workflowName: exec.workflowName || 'Unknown',
          nodeId: exec.errorDetails?.node || 'unknown',
          nodeName: exec.errorDetails?.nodeName || 'Unknown Node',
          nodeType: exec.errorDetails?.nodeType || 'unknown',
          errorMessage: exec.errorDetails?.message || 'Unknown error',
          errorStack: exec.errorDetails?.stack,
          errorData: exec.errorDetails?.data,
          timestamp: exec.createdAt,
        }));

      return errors;
    } catch (error) {
      log.error('Failed to get recent errors', error);
      throw error;
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 오류 분석
   */
  async analyzeError(executionError: N8nExecutionError): Promise<AnalyzedError> {
    try {
      // 오류 패턴 매칭
      const matchedPatterns = this.matchErrorPatterns(executionError.errorMessage);

      // 오류 유형 결정
      const errorType = this.determineErrorType(matchedPatterns);

      // 심각도 결정
      const severity = this.determineSeverity(matchedPatterns);

      // 자동 수정 가능 여부
      const autoFixable = matchedPatterns.some((p) => p.autoFixable);

      // 근본 원인 분석
      const rootCause = this.analyzeRootCause(executionError, matchedPatterns);

      // 수정 방법 제안
      const suggestedFixes = this.suggestFixes(matchedPatterns);

      // 신뢰도 계산
      const confidence = this.calculateConfidence(matchedPatterns);

      const analyzedError: AnalyzedError = {
        errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        executionError,
        errorType,
        severity,
        patterns: matchedPatterns.map((p) => p.name),
        rootCause,
        suggestedFixes,
        autoFixable,
        confidence,
        analyzedAt: new Date(),
      };

      // MongoDB에 분석 결과 저장
      await this.saveAnalyzedError(analyzedError);

      log.info('Error analyzed', {
        errorId: analyzedError.errorId,
        errorType,
        severity,
        autoFixable,
      });

      return analyzedError;
    } catch (error) {
      log.error('Failed to analyze error', error);
      throw error;
    }
  }

  /**
   * 여러 오류 일괄 분석
   */
  async analyzeMultipleErrors(errors: N8nExecutionError[]): Promise<AnalyzedError[]> {
    const analyzed: AnalyzedError[] = [];

    for (const error of errors) {
      try {
        const result = await this.analyzeError(error);
        analyzed.push(result);
      } catch (err) {
        log.error('Failed to analyze individual error', err, {
          executionId: error.executionId,
        });
      }
    }

    return analyzed;
  }

  /**
   * 오류 패턴 매칭
   */
  private matchErrorPatterns(errorMessage: string): ErrorPattern[] {
    const matched: ErrorPattern[] = [];

    for (const pattern of this.errorPatterns) {
      if (typeof pattern.pattern === 'string') {
        if (errorMessage.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          matched.push(pattern);
        }
      } else if (pattern.pattern instanceof RegExp) {
        if (pattern.pattern.test(errorMessage)) {
          matched.push(pattern);
        }
      }
    }

    return matched;
  }

  /**
   * 오류 유형 결정
   */
  private determineErrorType(patterns: ErrorPattern[]): ErrorType {
    if (patterns.length === 0) return 'unknown';

    // 가장 높은 심각도를 가진 패턴의 타입 사용
    const sortedByPriority = patterns.sort((a, b) => {
      const priorityMap: Record<ErrorSeverity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      };
      return priorityMap[a.severity] - priorityMap[b.severity];
    });

    return sortedByPriority[0].errorType;
  }

  /**
   * 심각도 결정
   */
  private determineSeverity(patterns: ErrorPattern[]): ErrorSeverity {
    if (patterns.length === 0) return 'low';

    const severities = patterns.map((p) => p.severity);

    if (severities.includes('critical')) return 'critical';
    if (severities.includes('high')) return 'high';
    if (severities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * 근본 원인 분석
   */
  private analyzeRootCause(executionError: N8nExecutionError, patterns: ErrorPattern[]): string {
    if (patterns.length === 0) {
      return `노드 ${executionError.nodeName}에서 알 수 없는 오류 발생`;
    }

    const primaryPattern = patterns[0];
    const nodeInfo = `노드: ${executionError.nodeName} (${executionError.nodeType})`;

    return `${primaryPattern.description}. ${nodeInfo}`;
  }

  /**
   * 수정 방법 제안
   */
  private suggestFixes(patterns: ErrorPattern[]): string[] {
    const fixes = new Set<string>();

    patterns.forEach((pattern) => {
      switch (pattern.fixStrategy) {
        case 'reconnect_nodes':
          fixes.add('노드 연결 재설정');
          break;
        case 'update_credential':
          fixes.add('인증 정보 업데이트');
          break;
        case 'adjust_timeout':
          fixes.add('타임아웃 값 증가');
          break;
        case 'add_data_transformation':
          fixes.add('데이터 변환 로직 추가');
          break;
        case 'add_retry_logic':
          fixes.add('재시도 로직 추가');
          break;
        case 'add_error_handler':
          fixes.add('에러 핸들러 노드 추가');
          break;
        case 'update_expression':
          fixes.add('표현식 수정');
          break;
        default:
          fixes.add('수동 검토 필요');
      }
    });

    return Array.from(fixes);
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(patterns: ErrorPattern[]): number {
    if (patterns.length === 0) return 0.1;
    if (patterns.length === 1) return 0.7;
    if (patterns.length === 2) return 0.85;
    return 0.95;
  }

  /**
   * 분석 결과 저장
   */
  private async saveAnalyzedError(analyzedError: AnalyzedError): Promise<void> {
    try {
      await this.mongoClient.connect();

      await this.mongoClient
        .db()
        .collection('analyzed_errors')
        .insertOne({
          ...analyzedError,
          createdAt: new Date(),
        });
    } catch (error) {
      log.error('Failed to save analyzed error', error);
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 오류 통계 조회
   */
  async getErrorStatistics(days: number = 7): Promise<Record<string, unknown>> {
    try {
      await this.mongoClient.connect();

      const since = new Date();
      since.setDate(since.getDate() - days);

      const stats = await this.mongoClient
        .db()
        .collection('analyzed_errors')
        .aggregate([
          {
            $match: {
              analyzedAt: { $gte: since },
            },
          },
          {
            $group: {
              _id: '$errorType',
              count: { $sum: 1 },
              autoFixable: {
                $sum: { $cond: ['$autoFixable', 1, 0] },
              },
              avgConfidence: { $avg: '$confidence' },
            },
          },
          {
            $sort: { count: -1 },
          },
        ])
        .toArray();

      return {
        period: `Last ${days} days`,
        totalErrors: stats.reduce((sum, s) => sum + s.count, 0),
        byType: stats,
      };
    } catch (error) {
      log.error('Failed to get error statistics', error);
      throw error;
    } finally {
      await this.mongoClient.close();
    }
  }

  /**
   * 커스텀 패턴 추가
   */
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.push(pattern);
    log.info('Custom error pattern added', { patternId: pattern.id });
  }
}

/**
 * 싱글톤 인스턴스
 */
export const errorAnalyzer = new N8nErrorAnalyzer();
