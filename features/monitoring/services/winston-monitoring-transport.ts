/**
 * Winston Monitoring Transport
 *
 * @description Winston 로그를 모니터링 시스템으로 전송하는 커스텀 Transport
 */

import Transport from 'winston-transport';
import { logAggregator } from './log-aggregator.service';

/**
 * 모니터링 Transport 옵션
 */
interface MonitoringTransportOptions extends Transport.TransportStreamOptions {
  sourceName?: string;
}

/**
 * Winston Monitoring Transport 클래스
 */
export class WinstonMonitoringTransport extends Transport {
  private sourceName: string;

  constructor(opts?: MonitoringTransportOptions) {
    super(opts);
    this.sourceName = opts?.sourceName || 'application';
  }

  /**
   * 로그 전송
   */
  async log(info: any, callback: () => void): Promise<void> {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      // 로그 집계기로 전송
      if (logAggregator['logsCollection']) {
        const aggregatedLog = {
          timestamp: new Date(info.timestamp || Date.now()),
          source: this.sourceName,
          level: info.level as 'debug' | 'info' | 'warn' | 'error',
          message: info.message,
          metadata: {
            ...info,
            timestamp: undefined,
            level: undefined,
            message: undefined,
          },
          count: 1,
        };

        await logAggregator['saveAggregatedLog'](this.sourceName, {
          level: aggregatedLog.level,
          message: aggregatedLog.message,
          metadata: aggregatedLog.metadata,
          timestamp: aggregatedLog.timestamp,
        });
      }
    } catch (error) {
      // 로깅 오류는 조용히 무시
      console.error('Failed to send log to monitoring', error);
    }

    callback();
  }
}
