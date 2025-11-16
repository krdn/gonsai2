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
      env: {
        NODE_ENV: 'production',
        N8N_API_KEY:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGZjZGQ0ZS04M2FhLTRmNTAtODc5Mi1hODU2ZWNhM2YxMGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTI0MjYwfQ.hyAirUwqDFUmQMGDxiFsONMJpFZxl8dve0Y1xrkkkrc',
        N8N_BASE_URL: 'http://localhost:5678',
        MONGODB_URI:
          'mongodb://superadmin:OTLStEurQnmblNqu4eFrgaKXULUOCctX@localhost:27017/gonsai2?authSource=admin',
        HOST: '0.0.0.0',
        WS_PORT: '3001',
      },
      env_development: {
        NODE_ENV: 'development',
        N8N_API_KEY:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjNGZjZGQ0ZS04M2FhLTRmNTAtODc5Mi1hODU2ZWNhM2YxMGUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYyOTI0MjYwfQ.hyAirUwqDFUmQMGDxiFsONMJpFZxl8dve0Y1xrkkkrc',
        N8N_BASE_URL: 'http://localhost:5678',
        MONGODB_URI:
          'mongodb://superadmin:OTLStEurQnmblNqu4eFrgaKXULUOCctX@localhost:27017/gonsai2?authSource=admin',
        HOST: '0.0.0.0',
        PORT: '3000',
        WS_PORT: '3001',
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
