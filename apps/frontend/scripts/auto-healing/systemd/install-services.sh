#!/bin/bash

# systemd 서비스 설치 스크립트

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER="${USER:-$(whoami)}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Installing n8n Auto-Healing systemd services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 사용자 systemd 디렉토리 확인
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"

echo ""
echo "📂 systemd user directory: $SYSTEMD_USER_DIR"

# 서비스 파일 복사
echo ""
echo "📋 Copying service files..."

for file in "$SCRIPT_DIR"/*.service "$SCRIPT_DIR"/*.timer; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "  - $filename"
        cp "$file" "$SYSTEMD_USER_DIR/"
    fi
done

# systemd 데몬 리로드
echo ""
echo "🔄 Reloading systemd daemon..."
systemctl --user daemon-reload

# 타이머 활성화 및 시작
echo ""
echo "⚡ Enabling and starting timers..."

# Monitor timer
echo "  - n8n-auto-healing-monitor.timer"
systemctl --user enable n8n-auto-healing-monitor.timer
systemctl --user start n8n-auto-healing-monitor.timer

# Analyzer timer
echo "  - n8n-auto-healing-analyzer.timer"
systemctl --user enable n8n-auto-healing-analyzer.timer
systemctl --user start n8n-auto-healing-analyzer.timer

# 사용자 서비스가 부팅 후에도 실행되도록 설정
echo ""
echo "🔐 Enabling linger for user $USER..."
sudo loginctl enable-linger "$USER" || {
    echo "⚠️  Failed to enable linger. Services may not start on boot."
    echo "   Run manually: sudo loginctl enable-linger $USER"
}

# 상태 확인
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Service Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "Monitor Timer:"
systemctl --user status n8n-auto-healing-monitor.timer --no-pager || true

echo ""
echo "Analyzer Timer:"
systemctl --user status n8n-auto-healing-analyzer.timer --no-pager || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Installation completed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "📝 Useful commands:"
echo "  List timers:     systemctl --user list-timers"
echo "  Monitor logs:    journalctl --user -u n8n-auto-healing-monitor -f"
echo "  Analyzer logs:   journalctl --user -u n8n-auto-healing-analyzer -f"
echo "  Stop monitor:    systemctl --user stop n8n-auto-healing-monitor.timer"
echo "  Stop analyzer:   systemctl --user stop n8n-auto-healing-analyzer.timer"
echo "  Restart:         systemctl --user restart n8n-auto-healing-monitor.timer"
echo ""
