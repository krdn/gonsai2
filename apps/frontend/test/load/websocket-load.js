/**
 * K6 Load Test - WebSocket Connections
 *
 * Tests WebSocket connection scalability and message handling.
 */

import { check } from 'k6';
import ws from 'k6/ws';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics
const wsConnections = new Counter('ws_connections_total');
const wsConnectionErrors = new Rate('ws_connection_errors');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsConnectionDuration = new Trend('ws_connection_duration');
const wsMessageLatency = new Trend('ws_message_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Start with 10 connections
    { duration: '1m', target: 50 },    // Scale to 50 connections
    { duration: '1m', target: 100 },   // Scale to 100 connections
    { duration: '2m', target: 100 },   // Hold at 100 connections
    { duration: '30s', target: 0 },    // Ramp down
  ],

  thresholds: {
    ws_connection_errors: ['rate<0.05'],        // Error rate below 5%
    ws_connection_duration: ['p(95)<2000'],     // 95% connections under 2s
    ws_message_latency: ['p(95)<500'],          // 95% messages under 500ms
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

export default function () {
  const startTime = Date.now();
  let connected = false;
  let messagesReceived = 0;

  const response = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', () => {
      connected = true;
      wsConnections.add(1);

      const connectionTime = Date.now() - startTime;
      wsConnectionDuration.add(connectionTime);

      console.log(`WebSocket connected in ${connectionTime}ms`);

      // Subscribe to workflow execution updates
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        channel: 'workflow.executions',
      });

      socket.send(subscribeMessage);
      wsMessagesSent.add(1);

      // Send periodic ping messages
      socket.setInterval(() => {
        const pingTime = Date.now();
        socket.send(JSON.stringify({
          type: 'ping',
          timestamp: pingTime,
        }));
        wsMessagesSent.add(1);
      }, 5000); // Every 5 seconds
    });

    socket.on('message', (data) => {
      messagesReceived++;
      wsMessagesReceived.add(1);

      try {
        const message = JSON.parse(data);

        // Calculate latency for ping-pong
        if (message.type === 'pong' && message.timestamp) {
          const latency = Date.now() - message.timestamp;
          wsMessageLatency.add(latency);
        }

        check(message, {
          'message has type': (m) => m.type !== undefined,
          'message is valid JSON': () => true,
        });
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnectionErrors.add(1);
    });

    socket.on('close', () => {
      console.log(`WebSocket closed. Received ${messagesReceived} messages.`);
    });

    // Keep connection open for 30 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });

  if (!connected) {
    wsConnectionErrors.add(1);
  }
}

// Handle summary
export function handleSummary(data) {
  const summary = generateSummary(data);

  return {
    'test-results/websocket-load-summary.json': JSON.stringify(data, null, 2),
    'test-results/websocket-load-summary.txt': summary,
    stdout: summary,
  };
}

function generateSummary(data) {
  let summary = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '📊 K6 Load Test Summary - WebSocket\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  // Test duration
  const duration = data.state.testRunDurationMs / 1000;
  summary += `⏱️  Test Duration: ${duration.toFixed(1)}s\n\n`;

  // Connection metrics
  const totalConnections = data.metrics.ws_connections_total?.values.count || 0;
  const connectionErrors = data.metrics.ws_connection_errors?.values.rate || 0;
  const connectionDuration = data.metrics.ws_connection_duration?.values || {};

  summary += '🔌 WebSocket Connections:\n';
  summary += `  Total: ${totalConnections}\n`;
  summary += `  Error Rate: ${(connectionErrors * 100).toFixed(2)}%\n`;
  summary += `  Avg Connection Time: ${(connectionDuration.avg || 0).toFixed(2)}ms\n`;
  summary += `  P95 Connection Time: ${(connectionDuration['p(95)'] || 0).toFixed(2)}ms\n\n`;

  // Message metrics
  const messagesSent = data.metrics.ws_messages_sent?.values.count || 0;
  const messagesReceived = data.metrics.ws_messages_received?.values.count || 0;
  const messageLatency = data.metrics.ws_message_latency?.values || {};

  summary += '💬 Messages:\n';
  summary += `  Sent: ${messagesSent}\n`;
  summary += `  Received: ${messagesReceived}\n`;
  summary += `  Avg Latency: ${(messageLatency.avg || 0).toFixed(2)}ms\n`;
  summary += `  P95 Latency: ${(messageLatency['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `  P99 Latency: ${(messageLatency['p(99)'] || 0).toFixed(2)}ms\n\n`;

  // Virtual Users
  const maxVUs = data.metrics.vus?.values.max || 0;
  summary += `👥 Max Concurrent Connections: ${maxVUs}\n\n`;

  // Throughput
  const messagesPerSecond = messagesReceived / duration;
  summary += `🚀 Message Throughput: ${messagesPerSecond.toFixed(2)} msg/s\n\n`;

  // Threshold results
  summary += '🎯 Threshold Results:\n';

  const thresholds = data.thresholds || {};
  Object.keys(thresholds).forEach(threshold => {
    const result = thresholds[threshold];
    const passed = result.ok ? '✅ PASS' : '❌ FAIL';
    summary += `  ${threshold}: ${passed}\n`;
  });

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return summary;
}
