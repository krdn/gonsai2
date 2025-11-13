# Frontend Dockerfile - Multi-stage build for Next.js
# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci

# Copy source code
COPY apps/frontend ./apps/frontend
COPY tsconfig.json ./

# Build the Next.js application
WORKDIR /app/apps/frontend

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_N8N_UI_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_N8N_UI_URL=$NEXT_PUBLIC_N8N_UI_URL

RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy necessary files for production
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/package.json ./apps/frontend/
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/next.config.js ./apps/frontend/

# Set environment to production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3002

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start Next.js server
WORKDIR /app/apps/frontend
CMD ["npm", "start"]