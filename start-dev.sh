#!/bin/bash
# gonsai2 개발 서버 시작 스크립트

cd /home/gon/projects/n8n/gonsai2

echo "==================================="
echo "gonsai2 개발 서버 시작"
echo "==================================="

# 기존 프로세스 종료
pkill -f "next dev -p 3002" 2>/dev/null
pkill -f "nodemon" 2>/dev/null
pkill -f "ts-node.*server.ts" 2>/dev/null
sleep 1

echo "Starting backend server..."
nohup npm run server:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

echo "Starting frontend server..."
cd apps/frontend
nohup npx next dev -p 3002 -H 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "==================================="
echo "✅ 개발 서버 시작 완료!"
echo "==================================="
echo "프론트엔드: http://192.168.0.5:3002"
echo "백엔드 API: http://192.168.0.5:3000"
echo "API 문서:   http://192.168.0.5:3000/api-docs"
echo "==================================="
echo ""
echo "로그 확인:"
echo "  백엔드:     tail -f /tmp/backend.log"
echo "  프론트엔드: tail -f /tmp/frontend.log"
echo ""
echo "서버 종료: pkill -f 'next dev' && pkill -f nodemon"
echo "==================================="
