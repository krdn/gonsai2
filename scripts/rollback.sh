#!/bin/bash

###############################################################################
# Gonsai2 Rollback Script
#
# Description: Rollback to previous deployment version
# Usage: ./scripts/rollback.sh [commit-hash]
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/gon/projects/gonsai2"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/logs/rollback-$(date +%Y%m%d_%H%M%S).log"

# Logging function
log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Check if script is run from project root
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  error "Must be run from project root: $PROJECT_ROOT"
  exit 1
fi

log "⏪ Starting Gonsai2 rollback..."

# Step 1: Get target commit
TARGET_COMMIT="$1"

if [ -z "$TARGET_COMMIT" ]; then
  # If no commit specified, use previous commit
  TARGET_COMMIT=$(git rev-parse HEAD~1)
  log "📝 No commit specified, using previous commit: $TARGET_COMMIT"
else
  log "📝 Rolling back to commit: $TARGET_COMMIT"
fi

# Verify commit exists
if ! git cat-file -e "$TARGET_COMMIT" 2>/dev/null; then
  error "Commit $TARGET_COMMIT does not exist"
  exit 1
fi

CURRENT_COMMIT=$(git rev-parse HEAD)
log "📝 Current commit: $CURRENT_COMMIT"

if [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ]; then
  log "ℹ️  Already at target commit"
  exit 0
fi

# Step 2: Confirm rollback
log ""
log "⚠️  WARNING: This will rollback the application to commit $TARGET_COMMIT"
log ""
log "Current state will be lost. Are you sure? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  log "❌ Rollback cancelled"
  exit 0
fi

# Step 3: Create emergency backup
log "💾 Creating emergency backup..."

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/gonsai2_pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz"

# Backup database
docker exec gonsai2-mongodb mongodump \
  --uri="mongodb://superadmin:OTLStEurQnmblNqu4eFrgaKXULUOCctX@localhost:27017/gonsai2?authSource=admin" \
  --out=/tmp/backup 2>&1 | tee -a "$LOG_FILE"

docker cp gonsai2-mongodb:/tmp/backup "$BACKUP_DIR/db_backup_tmp"

# Create compressed backup
tar -czf "$BACKUP_FILE" \
  -C "$BACKUP_DIR" db_backup_tmp \
  -C "$PROJECT_ROOT" apps/backend/dist \
  -C "$PROJECT_ROOT" apps/frontend/.next 2>&1 | tee -a "$LOG_FILE"

# Cleanup
rm -rf "$BACKUP_DIR/db_backup_tmp"
docker exec gonsai2-mongodb rm -rf /tmp/backup

log "✅ Emergency backup created: $BACKUP_FILE"

# Step 4: Stop services
log "🛑 Stopping services..."

if command -v pm2 &> /dev/null; then
  pm2 stop gonsai2-backend gonsai2-frontend 2>&1 | tee -a "$LOG_FILE" || true
  log "✅ Services stopped"
else
  warning "PM2 not found, services may still be running"
fi

# Step 5: Checkout target commit
log "📥 Checking out commit $TARGET_COMMIT..."

# Stash any uncommitted changes
if ! git diff-index --quiet HEAD --; then
  warning "Uncommitted changes detected, stashing..."
  git stash 2>&1 | tee -a "$LOG_FILE"
fi

git checkout "$TARGET_COMMIT" 2>&1 | tee -a "$LOG_FILE"
log "✅ Checked out commit $TARGET_COMMIT"

# Step 6: Install dependencies
log "📦 Installing dependencies..."
npm ci 2>&1 | tee -a "$LOG_FILE"

# Install backend dependencies
cd "$PROJECT_ROOT/apps/backend"
npm ci 2>&1 | tee -a "$LOG_FILE"

# Install frontend dependencies
cd "$PROJECT_ROOT/apps/frontend"
npm ci 2>&1 | tee -a "$LOG_FILE"

cd "$PROJECT_ROOT"
log "✅ Dependencies installed"

# Step 7: Build applications
log "🔨 Building applications..."

# Build backend
cd "$PROJECT_ROOT/apps/backend"
npm run build 2>&1 | tee -a "$LOG_FILE"
log "✅ Backend build complete"

# Build frontend
cd "$PROJECT_ROOT/apps/frontend"
npm run build 2>&1 | tee -a "$LOG_FILE"
log "✅ Frontend build complete"

cd "$PROJECT_ROOT"

# Step 8: Restart services
log "🔄 Restarting services..."

if command -v pm2 &> /dev/null; then
  # Start backend with PM2
  cd "$PROJECT_ROOT/apps/backend"
  pm2 start ecosystem.config.js --env production 2>&1 | tee -a "$LOG_FILE"

  # Start frontend with PM2
  cd "$PROJECT_ROOT/apps/frontend"
  pm2 start npm --name "gonsai2-frontend" -- start 2>&1 | tee -a "$LOG_FILE"

  # Save PM2 configuration
  pm2 save 2>&1 | tee -a "$LOG_FILE"

  log "✅ Services restarted with PM2"
else
  warning "PM2 not found, please restart services manually"
fi

cd "$PROJECT_ROOT"

# Step 9: Health check
log "🏥 Running health checks..."
sleep 5  # Wait for services to start

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
  log "✅ Backend health check passed"
else
  error "Backend health check failed (HTTP $BACKEND_HEALTH)"
  error "Rollback may have failed. Check logs: pm2 logs gonsai2-backend"
  exit 1
fi

# Check frontend health
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/health || echo "000")
if [ "$FRONTEND_HEALTH" = "200" ]; then
  log "✅ Frontend health check passed"
else
  warning "Frontend health check failed (HTTP $FRONTEND_HEALTH)"
  warning "Check logs: pm2 logs gonsai2-frontend"
fi

# Step 10: Rollback summary
log ""
log "=========================================="
log "✅ Rollback completed successfully!"
log "=========================================="
log ""
log "📊 Rollback Summary:"
log "  - Previous commit: $CURRENT_COMMIT"
log "  - Current commit: $TARGET_COMMIT"
log "  - Emergency backup: $BACKUP_FILE"
log "  - Log file: $LOG_FILE"
log ""
log "🔍 Verify rollback:"
log "  - Backend: http://localhost:3000/health"
log "  - Frontend: http://localhost:3002"
log "  - API Docs: http://localhost:3000/api-docs"
log ""
log "📝 Check logs:"
log "  - pm2 logs gonsai2-backend"
log "  - pm2 logs gonsai2-frontend"
log ""
log "⏩ To return to latest version:"
log "  - git checkout main"
log "  - ./scripts/deploy.sh"
log ""
