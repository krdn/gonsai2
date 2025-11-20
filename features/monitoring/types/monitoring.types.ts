/**
 * Monitoring Types
 *
 * @description n8n 실행 모니터링 시스템의 타입 정의
 */

/**
 * 메트릭 타입
 */
export type MetricType =
  | 'execution_time'
  | 'node_processing_time'
  | 'ai_token_usage'
  | 'success_rate'
  | 'failure_rate'
  | 'resource_usage'
  | 'cost';

/**
 * 실행 상태
 */
export type ExecutionStatus = 'running' | 'success' | 'failed' | 'canceled' | 'waiting';

/**
 * 알림 레벨
 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/**
 * 알림 채널
 */
export type AlertChannel = 'console' | 'email' | 'webhook' | 'slack' | 'discord';

/**
 * 시간 단위
 */
export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * 실행 메트릭
 */
export interface ExecutionMetric {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration: number; // milliseconds
  nodeMetrics: NodeMetric[];
  aiTokenUsage?: AITokenUsage;
  resourceUsage: ResourceUsage;
  error?: string;
}

/**
 * 노드 메트릭
 */
export interface NodeMetric {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  startedAt: Date;
  finishedAt?: Date;
  duration: number; // milliseconds
  inputItems: number;
  outputItems: number;
  error?: string;
}

/**
 * AI 토큰 사용량
 */
export interface AITokenUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // USD
  provider: 'openai' | 'anthropic' | 'other';
}

/**
 * 리소스 사용량
 */
export interface ResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  networkKB: number;
}

/**
 * 워크플로우 통계
 */
export interface WorkflowStatistics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number; // percentage
  averageDuration: number; // milliseconds
  totalDuration: number; // milliseconds
  totalAITokens?: number;
  totalCost?: number; // USD
  lastExecutionAt?: Date;
  errorRate: number; // percentage
  topErrors: ErrorFrequency[];
}

/**
 * 오류 빈도
 */
export interface ErrorFrequency {
  errorMessage: string;
  count: number;
  lastOccurrence: Date;
}

/**
 * 실시간 실행 상태
 */
export interface RealtimeExecutionStatus {
  runningExecutions: ExecutionSummary[];
  queuedExecutions: number;
  recentCompletions: ExecutionSummary[];
  currentLoad: number; // percentage
  systemHealth: SystemHealth;
}

/**
 * 실행 요약
 */
export interface ExecutionSummary {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: Date;
  duration?: number;
  progress?: number; // percentage
}

/**
 * 시스템 헬스
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  n8nAPI: boolean;
  database: boolean;
  redis: boolean;
  worker: boolean;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

/**
 * 오류 트렌드
 */
export interface ErrorTrend {
  timeRange: TimeRange;
  dataPoints: ErrorDataPoint[];
  topErrorTypes: ErrorTypeStats[];
  totalErrors: number;
  errorRate: number; // percentage
}

/**
 * 시간 범위
 */
export interface TimeRange {
  start: Date;
  end: Date;
  unit: TimeUnit;
}

/**
 * 오류 데이터 포인트
 */
export interface ErrorDataPoint {
  timestamp: Date;
  errorCount: number;
  totalExecutions: number;
  errorRate: number;
}

/**
 * 오류 타입 통계
 */
export interface ErrorTypeStats {
  errorType: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * 비용 분석
 */
export interface CostAnalysis {
  timeRange: TimeRange;
  totalCost: number; // USD
  costByWorkflow: WorkflowCost[];
  costByAIProvider: ProviderCost[];
  costTrend: CostDataPoint[];
  projectedMonthlyCost: number; // USD
}

/**
 * 워크플로우 비용
 */
export interface WorkflowCost {
  workflowId: string;
  workflowName: string;
  totalCost: number;
  executionCount: number;
  averageCostPerExecution: number;
  aiTokenUsage: number;
}

/**
 * 제공자 비용
 */
export interface ProviderCost {
  provider: string;
  totalCost: number;
  tokenUsage: number;
  percentage: number;
}

/**
 * 비용 데이터 포인트
 */
export interface CostDataPoint {
  timestamp: Date;
  cost: number;
  tokenUsage: number;
}

/**
 * 알림 규칙
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: AlertCondition;
  threshold: number;
  level: AlertLevel;
  channels: AlertChannel[];
  cooldownMinutes: number; // 재알림 방지 시간
  lastTriggered?: Date;
}

/**
 * 알림 조건
 */
export interface AlertCondition {
  metric: MetricType;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  timeWindowMinutes: number;
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

/**
 * 알림
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  level: AlertLevel;
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: Record<string, unknown>;
}

/**
 * 알림 채널 설정
 */
export interface AlertChannelConfig {
  channel: AlertChannel;
  enabled: boolean;
  config: ConsoleConfig | EmailConfig | WebhookConfig | SlackConfig | DiscordConfig;
}

/**
 * 콘솔 설정 (빈 객체 허용)
 */
export interface ConsoleConfig {
  [key: string]: never;
}

/**
 * 이메일 설정
 */
export interface EmailConfig {
  to: string[];
  from: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
}

/**
 * Webhook 설정
 */
export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Slack 설정
 */
export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

/**
 * Discord 설정
 */
export interface DiscordConfig {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

/**
 * 대시보드 데이터
 */
export interface DashboardData {
  overview: DashboardOverview;
  realtimeStatus: RealtimeExecutionStatus;
  workflowStatistics: WorkflowStatistics[];
  errorTrend: ErrorTrend;
  costAnalysis: CostAnalysis;
  recentAlerts: Alert[];
  systemMetrics: SystemMetrics;
}

/**
 * 대시보드 개요
 */
export interface DashboardOverview {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  totalAITokens: number;
  totalCost: number;
  activeWorkflows: number;
}

/**
 * 시스템 메트릭
 */
export interface SystemMetrics {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
}

/**
 * CPU 메트릭
 */
export interface CPUMetrics {
  usage: number; // percentage
  cores: number;
  loadAverage: number[];
}

/**
 * 메모리 메트릭
 */
export interface MemoryMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usagePercent: number;
}

/**
 * 디스크 메트릭
 */
export interface DiskMetrics {
  total: number; // bytes
  used: number; // bytes
  free: number; // bytes
  usagePercent: number;
}

/**
 * 네트워크 메트릭
 */
export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
}

/**
 * 로그 집계 설정
 */
export interface LogAggregationConfig {
  enabled: boolean;
  sources: LogSource[];
  retention: {
    days: number;
    maxSize: number; // MB
  };
  aggregation: {
    interval: number; // minutes
    metrics: string[];
  };
}

/**
 * 로그 소스
 */
export interface LogSource {
  name: string;
  type: 'file' | 'stream' | 'database';
  path?: string;
  pattern?: string;
  parser?: 'json' | 'text' | 'custom';
}

/**
 * 집계된 로그
 */
export interface AggregatedLog {
  timestamp: Date;
  source: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown>;
  count: number;
}
