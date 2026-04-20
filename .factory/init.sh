#!/bin/bash
# Avileo Sync Core Integration - Environment Setup
# Idempotent setup script for worker sessions

set -e

echo "🔧 Setting up Avileo environment..."

# Install dependencies if node_modules is missing or outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock" ]; then
  echo "📦 Installing dependencies..."
  bun install
fi

# Build shared packages first (dependency of others)
echo "🔨 Building shared packages..."
cd packages/shared && bun run build
cd ../drizzle-sync && bun run build

echo "✅ Environment ready"
