#!/usr/bin/env ts-node

/**
 * n8n Error Analysis Script
 *
 * 수집된 오류 로그를 분석하여:
 * - 오류 분류 (타입, 카테고리)
 * - 빈도 분석
 * - 영향도 평가
 * - 수정 우선순위 결정
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface ExecutionError {
  workflowId: string;
  workflowName: string;
  error: string;
  nodeType: string;
  timestamp: string;
}

interface ErrorPattern {
  error: string;
  count: number;
  workflows: string[];
  nodes: string[];
}

interface ErrorLog {
  timestamp: string;
  patterns: ErrorPattern[];
}

interface ErrorCategory {
  category: string;
  subcategory: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface AnalysisResult {
  summary: {
    total_errors: number;
    unique_patterns: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    analysis_timestamp: string;
  };
  categorized_errors: CategorizedError[];
  priority_fixes: PriorityFix[];
  recommendations: string[];
}

interface CategorizedError {
  pattern: string;
  category: ErrorCategory;
  frequency: number;
  affected_workflows: string[];
  affected_nodes: string[];
  impact_score: number;
  first_seen: string;
  last_seen: string;
}

interface PriorityFix {
  rank: number;
  error_pattern: string;
  category: string;
  severity: string;
  frequency: number;
  impact_score: number;
  fix_type: 'workflow' | 'code' | 'configuration' | 'infrastructure';
  estimated_effort: 'low' | 'medium' | 'high';
  automated_fix_available: boolean;
  recommendation: string;
}

// ============================================================================
// Error Categorization Rules
// ============================================================================

const ERROR_CATEGORIES: Record<string, ErrorCategory> = {
  // MongoDB 관련
  MongoNetworkError: {
    category: 'database',
    subcategory: 'connection',
    severity: 'critical',
    description: 'MongoDB 네트워크 연결 오류',
  },
  MongoServerError: {
    category: 'database',
    subcategory: 'query',
    severity: 'high',
    description: 'MongoDB 서버 오류',
  },
  MongoTimeoutError: {
    category: 'database',
    subcategory: 'performance',
    severity: 'high',
    description: 'MongoDB 타임아웃',
  },

  // HTTP 관련
  ECONNREFUSED: {
    category: 'network',
    subcategory: 'connection_refused',
    severity: 'high',
    description: 'HTTP 연결 거부',
  },
  ETIMEDOUT: {
    category: 'network',
    subcategory: 'timeout',
    severity: 'medium',
    description: 'HTTP 타임아웃',
  },
  ENOTFOUND: {
    category: 'network',
    subcategory: 'dns',
    severity: 'high',
    description: 'DNS 조회 실패',
  },

  // 인증 관련
  Unauthorized: {
    category: 'authentication',
    subcategory: 'credentials',
    severity: 'high',
    description: '인증 실패',
  },
  Forbidden: {
    category: 'authentication',
    subcategory: 'permissions',
    severity: 'high',
    description: '권한 부족',
  },
  'Invalid credentials': {
    category: 'authentication',
    subcategory: 'credentials',
    severity: 'high',
    description: '잘못된 자격 증명',
  },

  // 데이터 관련
  ValidationError: {
    category: 'data',
    subcategory: 'validation',
    severity: 'medium',
    description: '데이터 검증 실패',
  },
  TypeError: {
    category: 'data',
    subcategory: 'type',
    severity: 'medium',
    description: '타입 오류',
  },
  'JSON parse error': {
    category: 'data',
    subcategory: 'parsing',
    severity: 'medium',
    description: 'JSON 파싱 오류',
  },

  // 워크플로우 관련
  'Node not found': {
    category: 'workflow',
    subcategory: 'structure',
    severity: 'high',
    description: '노드를 찾을 수 없음',
  },
  'Missing parameter': {
    category: 'workflow',
    subcategory: 'configuration',
    severity: 'medium',
    description: '필수 파라미터 누락',
  },

  // 리소스 관련
  'Out of memory': {
    category: 'resources',
    subcategory: 'memory',
    severity: 'critical',
    description: '메모리 부족',
  },
  'Disk full': {
    category: 'resources',
    subcategory: 'disk',
    severity: 'critical',
    description: '디스크 공간 부족',
  },

  // 기타
  'Unknown error': {
    category: 'unknown',
    subcategory: 'general',
    severity: 'low',
    description: '알 수 없는 오류',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 오류 메시지에서 카테고리 추론
 */
function categorizeError(errorMessage: string): ErrorCategory {
  // 정확한 매칭 먼저 시도
  for (const [key, category] of Object.entries(ERROR_CATEGORIES)) {
    if (errorMessage.includes(key)) {
      return category;
    }
  }

  // 패턴 매칭
  if (/mongo|database|db/i.test(errorMessage)) {
    return {
      category: 'database',
      subcategory: 'general',
      severity: 'high',
      description: 'Database related error',
    };
  }

  if (/network|connection|timeout|ECONNREFUSED|ETIMEDOUT/i.test(errorMessage)) {
    return {
      category: 'network',
      subcategory: 'general',
      severity: 'high',
      description: 'Network related error',
    };
  }

  if (/auth|credential|unauthorized|forbidden/i.test(errorMessage)) {
    return {
      category: 'authentication',
      subcategory: 'general',
      severity: 'high',
      description: 'Authentication related error',
    };
  }

  if (/validation|type|parse/i.test(errorMessage)) {
    return {
      category: 'data',
      subcategory: 'general',
      severity: 'medium',
      description: 'Data related error',
    };
  }

  if (/workflow|node|parameter/i.test(errorMessage)) {
    return {
      category: 'workflow',
      subcategory: 'general',
      severity: 'medium',
      description: 'Workflow related error',
    };
  }

  if (/memory|disk|resource/i.test(errorMessage)) {
    return {
      category: 'resources',
      subcategory: 'general',
      severity: 'critical',
      description: 'Resource related error',
    };
  }

  // 기본 카테고리
  return ERROR_CATEGORIES['Unknown error'];
}

/**
 * 영향도 점수 계산
 * - 빈도: 0-50점
 * - 심각도: 0-30점
 * - 영향 범위 (워크플로우 수): 0-20점
 */
function calculateImpactScore(
  frequency: number,
  severity: string,
  affectedWorkflowCount: number
): number {
  // 빈도 점수 (최대 50점)
  const frequencyScore = Math.min(frequency * 2, 50);

  // 심각도 점수 (최대 30점)
  const severityScores: Record<string, number> = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
  };
  const severityScore = severityScores[severity] || 0;

  // 영향 범위 점수 (최대 20점)
  const scopeScore = Math.min(affectedWorkflowCount * 5, 20);

  return frequencyScore + severityScore + scopeScore;
}

/**
 * 수정 타입 결정
 */
function determineFixType(category: ErrorCategory): PriorityFix['fix_type'] {
  switch (category.category) {
    case 'database':
    case 'resources':
      return 'infrastructure';
    case 'network':
    case 'authentication':
      return 'configuration';
    case 'workflow':
      return 'workflow';
    case 'data':
      return 'code';
    default:
      return 'code';
  }
}

/**
 * 예상 수정 노력 평가
 */
function estimateEffort(
  category: ErrorCategory,
  affectedWorkflowCount: number
): PriorityFix['estimated_effort'] {
  if (category.severity === 'critical') {
    return 'high';
  }

  if (affectedWorkflowCount > 5) {
    return 'high';
  }

  if (category.category === 'infrastructure' || category.category === 'resources') {
    return 'high';
  }

  if (category.category === 'configuration' || category.category === 'workflow') {
    return 'medium';
  }

  return 'low';
}

/**
 * 자동 수정 가능 여부
 */
function canAutoFix(category: ErrorCategory): boolean {
  // 자동 수정 가능한 카테고리
  const autoFixable = ['workflow', 'configuration', 'data'];

  // 자동 수정 불가능한 서브카테고리
  const nonAutoFixable = ['permissions', 'memory', 'disk'];

  return autoFixable.includes(category.category) && !nonAutoFixable.includes(category.subcategory);
}

/**
 * 수정 권장사항 생성
 */
function generateRecommendation(errorPattern: string, category: ErrorCategory): string {
  const recommendations: Record<string, string> = {
    'database:connection':
      'MongoDB 연결 설정을 확인하고 재시작하세요. 네트워크 연결 및 방화벽 설정을 점검하세요.',
    'database:query': 'MongoDB 쿼리 성능을 확인하고 인덱스를 최적화하세요.',
    'database:performance': 'MongoDB 타임아웃 설정을 늘리거나 쿼리 성능을 개선하세요.',
    'network:connection_refused': '대상 서비스가 실행 중인지 확인하고 네트워크 연결을 점검하세요.',
    'network:timeout': 'HTTP 타임아웃 설정을 늘리거나 대상 서버 성능을 확인하세요.',
    'network:dns': 'DNS 설정 및 도메인 이름을 확인하세요.',
    'authentication:credentials': '자격 증명을 확인하고 업데이트하세요.',
    'authentication:permissions': 'API 키 또는 사용자 권한을 확인하세요.',
    'data:validation': '입력 데이터 형식 및 필수 필드를 확인하세요.',
    'data:type': '데이터 타입을 확인하고 타입 변환을 추가하세요.',
    'data:parsing': 'JSON 형식을 확인하고 파싱 오류를 수정하세요.',
    'workflow:structure': '워크플로우 구조를 확인하고 누락된 노드를 추가하세요.',
    'workflow:configuration': '노드 설정에서 필수 파라미터를 입력하세요.',
    'resources:memory': '메모리 사용량을 확인하고 서버 리소스를 늘리세요.',
    'resources:disk': '디스크 공간을 확보하세요.',
  };

  const key = `${category.category}:${category.subcategory}`;
  return recommendations[key] || `오류 패턴 "${errorPattern}"을 분석하고 적절한 수정을 적용하세요.`;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

async function analyzeErrors(errorLogPath: string): Promise<AnalysisResult> {
  console.log('📊 Starting error analysis...');

  // 오류 로그 읽기
  const errorLogs: ErrorLog[] = JSON.parse(fs.readFileSync(errorLogPath, 'utf-8'));

  if (errorLogs.length === 0) {
    console.log('✅ No errors to analyze');
    return {
      summary: {
        total_errors: 0,
        unique_patterns: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        analysis_timestamp: new Date().toISOString(),
      },
      categorized_errors: [],
      priority_fixes: [],
      recommendations: ['No errors detected. System is healthy.'],
    };
  }

  // 모든 패턴 수집
  const allPatterns = new Map<
    string,
    {
      pattern: ErrorPattern;
      first_seen: string;
      last_seen: string;
    }
  >();

  errorLogs.forEach((log) => {
    log.patterns.forEach((pattern) => {
      const existing = allPatterns.get(pattern.error);
      if (existing) {
        // 기존 패턴 업데이트
        existing.pattern.count += pattern.count;
        existing.pattern.workflows = [
          ...new Set([...existing.pattern.workflows, ...pattern.workflows]),
        ];
        existing.pattern.nodes = [...new Set([...existing.pattern.nodes, ...pattern.nodes])];
        existing.last_seen = log.timestamp;
      } else {
        // 새 패턴 추가
        allPatterns.set(pattern.error, {
          pattern: { ...pattern },
          first_seen: log.timestamp,
          last_seen: log.timestamp,
        });
      }
    });
  });

  // 오류 분류 및 영향도 계산
  const categorizedErrors: CategorizedError[] = [];
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  allPatterns.forEach((data, errorMessage) => {
    const category = categorizeError(errorMessage);
    const impactScore = calculateImpactScore(
      data.pattern.count,
      category.severity,
      data.pattern.workflows.length
    );

    categorizedErrors.push({
      pattern: errorMessage,
      category,
      frequency: data.pattern.count,
      affected_workflows: data.pattern.workflows,
      affected_nodes: data.pattern.nodes,
      impact_score: impactScore,
      first_seen: data.first_seen,
      last_seen: data.last_seen,
    });

    // 심각도별 카운트
    switch (category.severity) {
      case 'critical':
        criticalCount++;
        break;
      case 'high':
        highCount++;
        break;
      case 'medium':
        mediumCount++;
        break;
      case 'low':
        lowCount++;
        break;
    }
  });

  // 영향도 점수로 정렬
  categorizedErrors.sort((a, b) => b.impact_score - a.impact_score);

  // 우선순위 수정 목록 생성 (상위 10개)
  const priorityFixes: PriorityFix[] = categorizedErrors.slice(0, 10).map((error, index) => ({
    rank: index + 1,
    error_pattern: error.pattern,
    category: error.category.category,
    severity: error.category.severity,
    frequency: error.frequency,
    impact_score: error.impact_score,
    fix_type: determineFixType(error.category),
    estimated_effort: estimateEffort(error.category, error.affected_workflows.length),
    automated_fix_available: canAutoFix(error.category),
    recommendation: generateRecommendation(error.pattern, error.category),
  }));

  // 전체 권장사항 생성
  const recommendations: string[] = [];

  if (criticalCount > 0) {
    recommendations.push(
      `🚨 ${criticalCount}개의 심각한 오류가 발견되었습니다. 즉시 조치가 필요합니다.`
    );
  }

  if (highCount > 0) {
    recommendations.push(
      `⚠️  ${highCount}개의 높은 우선순위 오류가 있습니다. 빠른 시일 내에 수정하세요.`
    );
  }

  // 자동 수정 가능한 항목
  const autoFixableCount = priorityFixes.filter((f) => f.automated_fix_available).length;
  if (autoFixableCount > 0) {
    recommendations.push(`✅ ${autoFixableCount}개의 오류는 자동 수정이 가능합니다.`);
  }

  // 카테고리별 통계
  const categoryStats = new Map<string, number>();
  categorizedErrors.forEach((error) => {
    const count = categoryStats.get(error.category.category) || 0;
    categoryStats.set(error.category.category, count + 1);
  });

  categoryStats.forEach((count, category) => {
    recommendations.push(`📊 ${category} 카테고리: ${count}개 오류`);
  });

  // 분석 결과
  const result: AnalysisResult = {
    summary: {
      total_errors: categorizedErrors.reduce((sum, e) => sum + e.frequency, 0),
      unique_patterns: categorizedErrors.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      analysis_timestamp: new Date().toISOString(),
    },
    categorized_errors: categorizedErrors,
    priority_fixes: priorityFixes,
    recommendations,
  };

  return result;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: analyze-errors.ts <error-log-path>');
    process.exit(1);
  }

  const errorLogPath = args[0];

  if (!fs.existsSync(errorLogPath)) {
    console.error(`Error log file not found: ${errorLogPath}`);
    process.exit(1);
  }

  try {
    const result = await analyzeErrors(errorLogPath);

    // 결과 출력
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Error Analysis Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Errors: ${result.summary.total_errors}`);
    console.log(`Unique Patterns: ${result.summary.unique_patterns}`);
    console.log(`Critical: ${result.summary.critical_count}`);
    console.log(`High: ${result.summary.high_count}`);
    console.log(`Medium: ${result.summary.medium_count}`);
    console.log(`Low: ${result.summary.low_count}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 Top Priority Fixes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    result.priority_fixes.slice(0, 5).forEach((fix) => {
      console.log(`\n${fix.rank}. ${fix.error_pattern}`);
      console.log(
        `   Severity: ${fix.severity} | Frequency: ${fix.frequency} | Impact: ${fix.impact_score}`
      );
      console.log(`   Fix Type: ${fix.fix_type} | Effort: ${fix.estimated_effort}`);
      console.log(`   Auto-fix: ${fix.automated_fix_available ? '✅ Yes' : '❌ No'}`);
      console.log(`   → ${fix.recommendation}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Recommendations');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    result.recommendations.forEach((rec) => {
      console.log(`• ${rec}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 결과를 파일로 저장
    const outputPath = path.join(path.dirname(errorLogPath), '..', 'state', 'analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`✅ Analysis result saved to: ${outputPath}`);

    process.exit(0);
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

export { analyzeErrors, AnalysisResult };
