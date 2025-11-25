# ==================================================
# gonsai2 Frontend Dockerfile
# Multi-stage build for optimized Next.js production
# ==================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY apps/frontend/package*.json ./

# Install dependencies
RUN npm ci

# ==================================================
# Stage 2: Builder
# ==================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY apps/frontend ./

# Copy .env.production for build (overrides .dockerignore)
# Next.js will automatically load NEXT_PUBLIC_* variables during build
COPY apps/frontend/.env.production ./.env.production

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
# Next.js automatically reads .env.production and bundles NEXT_PUBLIC_* variables
RUN npm run build

# ==================================================
# Stage 3: Production
# ==================================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application (standalone mode)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002 || exit 1

# Start application
CMD ["node", "server.js"]
