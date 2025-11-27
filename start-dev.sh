#!/bin/bash
# gonsai2 개발 서버 시작 스크립트

cd /home/gon/projects/n8n/gonsai2

echo "Starting backend server..."
npm run server:dev &

echo "Starting frontend server..."
cd apps/frontend
npx next dev -p 3002 -H 0.0.0.0 &

echo ""
echo "==================================="
echo "개발 서버 시작 완료!"
echo "==================================="
echo "프론트엔드: http://192.168.0.5:3002"
echo "백엔드 API: http://192.168.0.5:3000"
echo "==================================="
