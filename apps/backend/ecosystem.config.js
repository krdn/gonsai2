/**
 * PM2 Ecosystem Configuration
 *
 * @description PM2 프로세스 관리 설정
 */

module.exports = {
  apps: [
    {
      // Application Configuration
      name: 'gonsai2-backend',
      script: './dist/server.js',
      cwd: '/home/gon/projects/gonsai2/apps/backend',

      // Cluster Mode
      instances: 'max', // CPU 코어 수만큼 인스턴스 실행
      exec_mode: 'cluster',

      // Memory Management
      max_memory_restart: '1G',

      // Log Configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // Watch & Restart
      watch: false, // 프로덕션에서는 비활성화
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        HOST: '0.0.0.0',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
      },

      // Graceful Start/Stop
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,

      // Health Check
      health_check: {
        interval: 30000, // 30초마다 체크
        timeout: 5000,
        max_consecutive_failures: 3,
        path: '/health',
      },
    },
  ],
};
