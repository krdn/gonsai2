/**
 * Alert Manager Service
 *
 * @description 임계값 기반 알림 시스템
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { CronJob } from 'cron';
import { log } from '../../../apps/backend/src/utils/logger';
import { metricsCollector } from './metrics-collector.service';
import { socketIOService } from '../../../apps/backend/src/services/socketio.service';
import {
  AlertRule,
  Alert,
  AlertLevel,
  AlertChannel,
  AlertChannelConfig,
  EmailConfig,
  WebhookConfig,
  SlackConfig,
  DiscordConfig,
  AlertCondition,
  MetricType,
} from '../types/monitoring.types';

/**
 * 기본 알림 규칙
 */
const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_failure_rate',
    name: 'High Failure Rate',
    description: '실행 실패율이 10% 초과',
    enabled: true,
    condition: {
      metric: 'failure_rate',
      operator: 'gt',
      timeWindowMinutes: 10,
      aggregation: 'avg',
    },
    threshold: 10,
    level: 'critical',
    channels: ['console', 'webhook'],
    cooldownMinutes: 30,
  },
  {
    id: 'slow_execution',
    name: 'Slow Execution',
    description: '평균 실행 시간이 30초 초과',
    enabled: true,
    condition: {
      metric: 'execution_time',
      operator: 'gt',
      timeWindowMinutes: 10,
      aggregation: 'avg',
    },
    threshold: 30000, // milliseconds
    level: 'warning',
    channels: ['console'],
    cooldownMinutes: 15,
  },
  {
    id: 'high_cost',
    name: 'High AI Cost',
    description: 'AI 비용이 $10 초과',
    enabled: true,
    condition: {
      metric: 'cost',
      operator: 'gt',
      timeWindowMinutes: 60,
      aggregation: 'sum',
    },
    threshold: 10,
    level: 'warning',
    channels: ['console', 'email'],
    cooldownMinutes: 60,
  },
];

/**
 * Alert Manager 클래스
 */
export class AlertManagerService {
  private db: Db | null = null;
  private rulesCollection: Collection<AlertRule> | null = null;
  private alertsCollection: Collection<Alert> | null = null;
  private client: MongoClient | null = null;
  private cronJob: CronJob | null = null;
  private channelConfigs: Map<AlertChannel, AlertChannelConfig> = new Map();

  constructor() {
    log.info('Alert Manager Service initialized');
  }

  /**
   * MongoDB 연결 및 초기화
   */
  async initialize(): Promise<void> {
    try {
      // MongoDB 연결
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gonsai2';
      this.client = new MongoClient(mongoUri);
      await this.client.connect();

      this.db = this.client.db();
      this.rulesCollection = this.db.collection<AlertRule>('alert_rules');
      this.alertsCollection = this.db.collection<Alert>('alerts');

      // 인덱스 생성
      await this.createIndexes();

      // 기본 알림 규칙 로드
      await this.loadDefaultRules();

      // 알림 채널 설정 로드
      this.loadChannelConfigs();

      log.info('Alert Manager initialized');
    } catch (error) {
      log.error('Failed to initialize Alert Manager', error);
      throw error;
    }
  }

  /**
   * 인덱스 생성
   */
  private async createIndexes(): Promise<void> {
    if (!this.rulesCollection || !this.alertsCollection) return;

    await this.rulesCollection.createIndex({ id: 1 }, { unique: true });
    await this.rulesCollection.createIndex({ enabled: 1 });

    await this.alertsCollection.createIndex({ ruleId: 1, triggeredAt: -1 });
    await this.alertsCollection.createIndex({ level: 1, resolved: 1 });
    await this.alertsCollection.createIndex({ triggeredAt: -1 });

    log.info('Alert collections indexes created');
  }

  /**
   * 기본 알림 규칙 로드
   */
  private async loadDefaultRules(): Promise<void> {
    if (!this.rulesCollection) return;

    for (const rule of DEFAULT_ALERT_RULES) {
      const existing = await this.rulesCollection.findOne({ id: rule.id });
      if (!existing) {
        await this.rulesCollection.insertOne(rule);
        log.info('Default alert rule loaded', { ruleId: rule.id });
      }
    }
  }

  /**
   * 알림 채널 설정 로드
   */
  private loadChannelConfigs(): void {
    // Console (기본 활성화)
    this.channelConfigs.set('console', {
      channel: 'console',
      enabled: true,
      config: {},
    });

    // Email
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      this.channelConfigs.set('email', {
        channel: 'email',
        enabled: true,
        config: {
          to: (process.env.ALERT_EMAIL_TO || '').split(','),
          from: process.env.ALERT_EMAIL_FROM || '',
          smtpHost: process.env.ALERT_SMTP_HOST || '',
          smtpPort: parseInt(process.env.ALERT_SMTP_PORT || '587'),
          smtpUser: process.env.ALERT_SMTP_USER || '',
          smtpPassword: process.env.ALERT_SMTP_PASSWORD || '',
        } as EmailConfig,
      });
    }

    // Webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channelConfigs.set('webhook', {
        channel: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        } as WebhookConfig,
      });
    }

    // Slack
    if (process.env.ALERT_SLACK_WEBHOOK_URL) {
      this.channelConfigs.set('slack', {
        channel: 'slack',
        enabled: true,
        config: {
          webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL,
          channel: process.env.ALERT_SLACK_CHANNEL,
          username: 'n8n Alert Bot',
          iconEmoji: ':warning:',
        } as SlackConfig,
      });
    }

    // Discord
    if (process.env.ALERT_DISCORD_WEBHOOK_URL) {
      this.channelConfigs.set('discord', {
        channel: 'discord',
        enabled: true,
        config: {
          webhookUrl: process.env.ALERT_DISCORD_WEBHOOK_URL,
          username: 'n8n Alert Bot',
        } as DiscordConfig,
      });
    }

    log.info('Alert channel configs loaded', {
      channels: Array.from(this.channelConfigs.keys()),
    });
  }

  /**
   * 알림 모니터링 시작
   */
  start(): void {
    if (this.cronJob) {
      log.warn('Alert monitoring already started');
      return;
    }

    // 1분마다 알림 체크
    this.cronJob = new CronJob(
      '* * * * *', // 매분 실행
      async () => {
        await this.checkAlerts();
      },
      null,
      true,
      'UTC'
    );

    log.info('Alert monitoring started');
  }

  /**
   * 알림 모니터링 중지
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      log.info('Alert monitoring stopped');
    }
  }

  /**
   * 알림 체크
   */
  private async checkAlerts(): Promise<void> {
    try {
      if (!this.rulesCollection) return;

      const rules = await this.rulesCollection.find({ enabled: true }).toArray();

      for (const rule of rules) {
        await this.evaluateRule(rule);
      }
    } catch (error) {
      log.error('Failed to check alerts', error);
    }
  }

  /**
   * 알림 규칙 평가
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    try {
      // 쿨다운 체크
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();

        if (timeSinceLastTrigger < cooldownMs) {
          return; // 쿨다운 기간 중
        }
      }

      // 메트릭 값 조회
      const metricValue = await this.getMetricValue(rule.condition);

      // 조건 평가
      const triggered = this.evaluateCondition(
        metricValue,
        rule.condition.operator,
        rule.threshold
      );

      if (triggered) {
        await this.triggerAlert(rule, metricValue);
      }
    } catch (error) {
      log.error('Failed to evaluate alert rule', error, { ruleId: rule.id });
    }
  }

  /**
   * 메트릭 값 조회
   */
  private async getMetricValue(condition: AlertCondition): Promise<number> {
    const timeRange = metricsCollector.createTimeRange(condition.timeWindowMinutes, 'minute');

    switch (condition.metric) {
      case 'execution_time':
        return await metricsCollector.calculateAverageExecutionTime(timeRange);

      case 'failure_rate':
        const successRate = await metricsCollector.calculateSuccessRate(timeRange);
        return 100 - successRate;

      case 'cost':
        return await metricsCollector.calculateTotalCost(timeRange);

      case 'ai_token_usage':
        return await metricsCollector.calculateTotalAITokens(timeRange);

      default:
        return 0;
    }
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(
    value: number,
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq',
    threshold: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'lt':
        return value < threshold;
      case 'gte':
        return value >= threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      default:
        return false;
    }
  }

  /**
   * 알림 트리거
   */
  private async triggerAlert(rule: AlertRule, metricValue: number): Promise<void> {
    try {
      const alert: Alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        level: rule.level,
        message: this.buildAlertMessage(rule, metricValue),
        triggeredAt: new Date(),
        resolved: false,
        metadata: {
          metricValue,
          threshold: rule.threshold,
          condition: rule.condition,
        },
      };

      // 알림 저장
      if (this.alertsCollection) {
        await this.alertsCollection.insertOne(alert);
      }

      // 알림 전송
      await this.sendAlert(alert, rule.channels);

      // 마지막 트리거 시간 업데이트
      if (this.rulesCollection) {
        await this.rulesCollection.updateOne(
          { id: rule.id },
          { $set: { lastTriggered: new Date() } }
        );
      }

      log.warn('Alert triggered', {
        alertId: alert.id,
        ruleId: rule.id,
        level: alert.level,
      });
    } catch (error) {
      log.error('Failed to trigger alert', error, { ruleId: rule.id });
    }
  }

  /**
   * 알림 메시지 구성
   */
  private buildAlertMessage(rule: AlertRule, metricValue: number): string {
    const formattedValue =
      rule.condition.metric === 'cost'
        ? `$${metricValue.toFixed(2)}`
        : rule.condition.metric === 'execution_time'
          ? `${(metricValue / 1000).toFixed(2)}s`
          : `${metricValue.toFixed(2)}%`;

    return `${rule.description}: ${formattedValue} (threshold: ${rule.threshold})`;
  }

  /**
   * 알림 전송
   */
  private async sendAlert(alert: Alert, channels: AlertChannel[]): Promise<void> {
    for (const channel of channels) {
      const config = this.channelConfigs.get(channel);

      if (!config || !config.enabled) {
        continue;
      }

      try {
        switch (channel) {
          case 'console':
            await this.sendConsoleAlert(alert);
            break;
          case 'email':
            await this.sendEmailAlert(alert, config.config as EmailConfig);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, config.config as WebhookConfig);
            break;
          case 'slack':
            await this.sendSlackAlert(alert, config.config as SlackConfig);
            break;
          case 'discord':
            await this.sendDiscordAlert(alert, config.config as DiscordConfig);
            break;
        }

        log.info('Alert sent', { alertId: alert.id, channel });
      } catch (error) {
        log.error('Failed to send alert', error, { alertId: alert.id, channel });
      }
    }
  }

  /**
   * 콘솔 알림
   */
  private async sendConsoleAlert(alert: Alert): Promise<void> {
    const levelIcon = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';

    console.log('\n' + '='.repeat(80));
    console.log(`${levelIcon} [${alert.level.toUpperCase()}] ${alert.ruleName}`);
    console.log('='.repeat(80));
    console.log(`Message: ${alert.message}`);
    console.log(`Time: ${alert.triggeredAt.toISOString()}`);
    console.log('='.repeat(80) + '\n');

    // WebSocket으로도 전송
    socketIOService.broadcast('alert.triggered', {
      id: alert.id,
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      level: alert.level,
      message: alert.message,
      triggeredAt: alert.triggeredAt.toISOString(),
      metadata: alert.metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 이메일 알림 (간단한 구현)
   */
  private async sendEmailAlert(alert: Alert, config: EmailConfig): Promise<void> {
    // 실제 이메일 전송 구현 필요 (nodemailer 등 사용)
    log.info('Email alert (not implemented)', {
      alertId: alert.id,
      to: config.to,
    });
  }

  /**
   * Webhook 알림
   */
  private async sendWebhookAlert(alert: Alert, config: WebhookConfig): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Webhook responded with ${response.status}`);
      }
    } catch (error) {
      log.error('Failed to send webhook alert', error);
      throw error;
    }
  }

  /**
   * Slack 알림
   */
  private async sendSlackAlert(alert: Alert, config: SlackConfig): Promise<void> {
    try {
      const color =
        alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'good';

      const payload = {
        channel: config.channel,
        username: config.username,
        icon_emoji: config.iconEmoji,
        attachments: [
          {
            color,
            title: `[${alert.level.toUpperCase()}] ${alert.ruleName}`,
            text: alert.message,
            ts: Math.floor(alert.triggeredAt.getTime() / 1000),
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook responded with ${response.status}`);
      }
    } catch (error) {
      log.error('Failed to send Slack alert', error);
      throw error;
    }
  }

  /**
   * Discord 알림
   */
  private async sendDiscordAlert(alert: Alert, config: DiscordConfig): Promise<void> {
    try {
      const color =
        alert.level === 'critical' ? 0xff0000 : alert.level === 'warning' ? 0xffa500 : 0x00ff00;

      const payload = {
        username: config.username,
        avatar_url: config.avatarUrl,
        embeds: [
          {
            title: `[${alert.level.toUpperCase()}] ${alert.ruleName}`,
            description: alert.message,
            color,
            timestamp: alert.triggeredAt.toISOString(),
          },
        ],
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook responded with ${response.status}`);
      }
    } catch (error) {
      log.error('Failed to send Discord alert', error);
      throw error;
    }
  }

  /**
   * 알림 조회
   */
  async getAlerts(resolved?: boolean, level?: AlertLevel, limit: number = 50): Promise<Alert[]> {
    try {
      if (!this.alertsCollection) {
        throw new Error('Alerts collection not initialized');
      }

      const query: any = {};

      if (resolved !== undefined) {
        query.resolved = resolved;
      }

      if (level) {
        query.level = level;
      }

      return await this.alertsCollection
        .find(query)
        .sort({ triggeredAt: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      log.error('Failed to get alerts', error);
      throw error;
    }
  }

  /**
   * 알림 확인
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    try {
      if (!this.alertsCollection) {
        throw new Error('Alerts collection not initialized');
      }

      await this.alertsCollection.updateOne(
        { id: alertId },
        {
          $set: {
            acknowledgedAt: new Date(),
            acknowledgedBy,
          },
        }
      );

      log.info('Alert acknowledged', { alertId, acknowledgedBy });
    } catch (error) {
      log.error('Failed to acknowledge alert', error);
      throw error;
    }
  }

  /**
   * 알림 해결
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      if (!this.alertsCollection) {
        throw new Error('Alerts collection not initialized');
      }

      await this.alertsCollection.updateOne(
        { id: alertId },
        {
          $set: {
            resolved: true,
            resolvedAt: new Date(),
          },
        }
      );

      log.info('Alert resolved', { alertId });
    } catch (error) {
      log.error('Failed to resolve alert', error);
      throw error;
    }
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    this.stop();

    if (this.client) {
      await this.client.close();
      log.info('Alert Manager disconnected from MongoDB');
    }
  }
}

/**
 * 싱글톤 인스턴스
 */
export const alertManager = new AlertManagerService();
