module.exports = {
  apps: [
    {
      name: 'gonsai2-backend',
      script: 'npm',
      args: 'run server',
      cwd: '/home/gon/projects/gonsai2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // .env 파일에서 환경 변수 로드
      env_file: '/home/gon/projects/gonsai2/apps/backend/.env',
      env: {
        NODE_ENV: 'production',
      },
      env_development: {
        NODE_ENV: 'development',
      },
      error_file: '/home/gon/projects/gonsai2/logs/pm2-error.log',
      out_file: '/home/gon/projects/gonsai2/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // PM2 시작 시 자동으로 로그 디렉토리 생성
      post_update: ['mkdir -p logs'],
    },
  ],
};
