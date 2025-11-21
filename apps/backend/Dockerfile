# ==================================================
# gonsai2 Backend Dockerfile
# Multi-stage build for optimized production image
# ==================================================

# Stage 1: Dependencies
FROM node:25-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files from root (monorepo structure)
COPY package*.json ./
COPY tsconfig*.json ./

# Copy backend package files
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies (including dev for build)
RUN npm ci

# ==================================================
# Stage 2: Builder
# ==================================================
FROM node:25-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build --workspace=apps/backend || npx tsc -p apps/backend/tsconfig.json

# ==================================================
# Stage 3: Production
# ==================================================
FROM node:25-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 gonsai2

# Copy built application
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/package*.json ./apps/backend/

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R gonsai2:nodejs /app

# Switch to non-root user
USER gonsai2

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "dist/apps/backend/src/server.js"]
