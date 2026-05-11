# Dockerfile for Avileo App (React Router v7)
# Multi-stage build: Bun for deps, Node.js for build, Bun for runtime

# Stage 1: Dependencies (Bun - mas rapido para instalar)
FROM oven/bun:1.3.12-slim AS deps
WORKDIR /app
ENV NODE_ENV=development

# Copiar SOLO los archivos necesarios para instalar dependencias (mejor layer caching)
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/app/package.json ./packages/app/
COPY packages/backend/package.json ./packages/backend/

# Instalar dependencias (esta layer se cachea si los lockfiles no cambian)
# No usamos --frozen-lockfile porque el cache-from puede traer un estado diferente
RUN bun install

# Stage 2: Builder (Node.js para compatibilidad con React Router)
FROM node:20-slim AS builder
WORKDIR /app

# Build arguments para environment variables
ARG VITE_API_URL
ARG VITE_BUILD_ID

# Set build-time environment variables
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BUILD_ID=${VITE_BUILD_ID}
ENV NODE_ENV=production

# Copiar node_modules desde deps (bun monorepo hoists all deps to root node_modules)
COPY --from=deps /app/node_modules ./node_modules

# Copiar el codigo fuente
COPY . .

# Build shared package first (tsup works con Node.js)
RUN cd packages/shared && npm run build

# Build the application con Node.js (evita el issue de Bun's renderToPipeableStream)
RUN cd packages/app && npm run build

# Stage 3: Production (Bun para runtime)
FROM oven/bun:1.3.12-slim AS runner
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/packages/app/build ./packages/app/build
COPY --from=builder /app/packages/app/server.js ./packages/app/server.js

# Install production dependencies only
COPY package.json bun.lock ./
COPY packages/app/package.json ./packages/app/
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN bun install --production --no-frozen-lockfile

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

# Start the application con Doppler secret injection
CMD ["doppler", "run", "--", "bun", "run", "--cwd", "packages/app", "start"]
