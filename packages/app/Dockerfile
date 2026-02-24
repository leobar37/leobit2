# Dockerfile for Avileo App (React Router v7 + Bun)
# Multi-stage build for production optimization

# Stage 1: Dependencies
FROM oven/bun:1.1.38-slim AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY packages/app/package.json ./packages/app/
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1.1.38-slim AS builder
WORKDIR /app

# Copy all dependencies (including workspace symlinks) from deps stage
COPY --from=deps /app ./

# Copy source code
COPY turbo.json ./
COPY packages/app ./packages/app
COPY packages/shared ./packages/shared

# Build shared package first
RUN cd packages/shared && bun run build

# Build arguments for environment variables
ARG VITE_API_URL
ARG VITE_BUILD_ID

# Set build-time environment variables
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BUILD_ID=${VITE_BUILD_ID}
ENV NODE_ENV=production

# Build the application
RUN cd packages/app && bun run build

# Stage 3: Production
FROM oven/bun:1.1.38-slim AS runner
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/packages/app/build ./packages/app/build
COPY --from=builder /app/packages/app/server.js ./packages/app/server.js

# Install production dependencies only
COPY package.json bun.lock ./
COPY packages/app/package.json ./packages/app/
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN bun install --frozen-lockfile --production

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
CMD ["doppler", "run", "--", "bun", "run", "--cwd", "packages/app", "start"]
