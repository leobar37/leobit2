# Dockerfile for Avileo Backend (ElysiaJS + Bun)
# Multi-stage build for production optimization

# Stage 1: Dependencies
FROM oven/bun:1.3.6-slim AS deps
WORKDIR /app

# Copy package files and bunfig.toml (disables frozen lockfile in CI)
COPY bunfig.toml ./
COPY package.json bun.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install

# Stage 2: Builder
FROM oven/bun:1.3.6-slim AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY package.json bun.lock turbo.json ./
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Build shared package first (required by backend)
RUN cd packages/shared && bun run build

# Build backend
RUN cd packages/backend && bun run build

# Generate Drizzle client
RUN cd packages/backend && bunx drizzle-kit generate

# Stage 3: Production
FROM oven/bun:1.3.6-slim AS runner
WORKDIR /app

# Copy package files for workspace resolution
COPY package.json bun.lock ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/

# Copy node_modules from deps stage (avoids frozen lockfile issues in monorepo)
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/drizzle ./packages/backend/drizzle
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy drizzle-kit for migrations
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/.bin/drizzle-kit ./node_modules/.bin/drizzle-kit

# Install Doppler CLI
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates curl gnupg wget && \
    (curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh || wget -t 3 -qO- https://cli.doppler.com/install.sh) | sh && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --spider -q http://localhost:3000/health || exit 1

# Start the application with Doppler secret injection
CMD ["doppler", "run", "--", "bun", "run", "packages/backend/dist/index.js"]
