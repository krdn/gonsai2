#!/bin/bash

###############################################################################
# Gonsai2 Production Deployment Script
#
# Description: Automated deployment with safety checks and rollback capability
# Usage: ./scripts/deploy.sh [--skip-backup] [--skip-tests]
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
LOG_FILE="$PROJECT_ROOT/logs/deploy-$(date +%Y%m%d_%H%M%S).log"

# Flags
SKIP_BACKUP=false
SKIP_TESTS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--skip-backup] [--skip-tests]"
      exit 1
      ;;
  esac
done

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

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

# Check if script is run from project root
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
  error "Must be run from project root: $PROJECT_ROOT"
  exit 1
fi

# Check if .env files exist
if [ ! -f "$PROJECT_ROOT/apps/backend/.env" ]; then
  error "Backend .env file not found"
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/apps/frontend/.env.local" ]; then
  warning "Frontend .env.local file not found, using defaults"
fi

log "🚀 Starting Gonsai2 deployment..."

# Step 1: Pre-deployment checks
log "📋 Running pre-deployment checks..."

# Check Node.js version
REQUIRED_NODE_VERSION="18"
CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$CURRENT_NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  error "Node.js version must be >= $REQUIRED_NODE_VERSION (current: $CURRENT_NODE_VERSION)"
  exit 1
fi

# Check disk space (minimum 5GB)
AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
  error "Insufficient disk space. Need at least 5GB, available: ${AVAILABLE_SPACE}GB"
  exit 1
fi

# Check if MongoDB is running
if ! docker ps | grep -q gonsai2-mongodb; then
  error "MongoDB container is not running. Start it with: docker-compose up -d"
  exit 1
fi

log "✅ Pre-deployment checks passed"

# Step 2: Create backup (unless skipped)
if [ "$SKIP_BACKUP" = false ]; then
  log "💾 Creating backup..."

  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/gonsai2_pre_deploy_$(date +%Y%m%d_%H%M%S).tar.gz"

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

  log "✅ Backup created: $BACKUP_FILE"
else
  warning "⚠️  Skipping backup (--skip-backup flag)"
fi

# Step 3: Get current commit for rollback reference
CURRENT_COMMIT=$(git rev-parse HEAD)
log "📝 Current commit: $CURRENT_COMMIT"

# Step 4: Pull latest code
log "📥 Pulling latest changes from repository..."
git fetch origin
git pull origin main 2>&1 | tee -a "$LOG_FILE"

NEW_COMMIT=$(git rev-parse HEAD)
log "📝 New commit: $NEW_COMMIT"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
  log "ℹ️  No new changes to deploy"
  exit 0
fi

# Step 5: Install dependencies
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

# Step 6: Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
  log "🧪 Running tests..."

  # Backend tests
  cd "$PROJECT_ROOT/apps/backend"
  if npm run test 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ Backend tests passed"
  else
    error "Backend tests failed"
    exit 1
  fi

  # Frontend tests (if configured)
  cd "$PROJECT_ROOT/apps/frontend"
  if [ -f "package.json" ] && grep -q '"test"' package.json; then
    if npm run test 2>&1 | tee -a "$LOG_FILE"; then
      log "✅ Frontend tests passed"
    else
      error "Frontend tests failed"
      exit 1
    fi
  else
    warning "Frontend tests not configured, skipping"
  fi

  cd "$PROJECT_ROOT"
else
  warning "⚠️  Skipping tests (--skip-tests flag)"
fi

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

# Step 8: Run database migrations (if any)
log "🗄️  Running database migrations..."
cd "$PROJECT_ROOT/apps/backend"

if [ -f "scripts/migrate.js" ]; then
  MONGODB_URI="mongodb://superadmin:OTLStEurQnmblNqu4eFrgaKXULUOCctX@localhost:27017/gonsai2?authSource=admin" \
    node scripts/migrate.js 2>&1 | tee -a "$LOG_FILE"
  log "✅ Migrations complete"
else
  log "ℹ️  No migration script found, skipping"
fi

cd "$PROJECT_ROOT"

# Step 9: Restart services
log "🔄 Restarting services..."

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
  # Stop old processes
  pm2 stop gonsai2-backend gonsai2-frontend 2>&1 | tee -a "$LOG_FILE" || true

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

# Step 10: Health check
log "🏥 Running health checks..."
sleep 5  # Wait for services to start

# Check backend health
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$BACKEND_HEALTH" = "200" ]; then
  log "✅ Backend health check passed"
else
  error "Backend health check failed (HTTP $BACKEND_HEALTH)"
  error "Check logs: pm2 logs gonsai2-backend"
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

# Step 11: Cleanup old backups (keep last 30 days)
log "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "gonsai2_pre_deploy_*.tar.gz" -mtime +30 -delete 2>&1 | tee -a "$LOG_FILE"
log "✅ Cleanup complete"

# Step 12: Deployment summary
log ""
log "=========================================="
log "✅ Deployment completed successfully!"
log "=========================================="
log ""
log "📊 Deployment Summary:"
log "  - Previous commit: $CURRENT_COMMIT"
log "  - New commit: $NEW_COMMIT"
log "  - Backup: $BACKUP_FILE"
log "  - Log file: $LOG_FILE"
log ""
log "🔍 Verify deployment:"
log "  - Backend: http://localhost:3000/health"
log "  - Frontend: http://localhost:3002"
log "  - API Docs: http://localhost:3000/api-docs"
log ""
log "📝 Check logs:"
log "  - pm2 logs gonsai2-backend"
log "  - pm2 logs gonsai2-frontend"
log ""
log "⏪ Rollback (if needed):"
log "  - ./scripts/rollback.sh $CURRENT_COMMIT"
log ""
