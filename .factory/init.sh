#!/bin/bash
# Init script for drizzle-sync full integration mission
# Idempotent — safe to run multiple times

set -e

echo "=== Avileo Mission Init ==="

# Install dependencies if node_modules is missing or outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock" ]; then
  echo "Installing dependencies..."
  bun install
fi

# Ensure drizzle-sync is built (needed for cross-package imports)
if [ ! -d "packages/drizzle-sync/dist" ]; then
  echo "Building drizzle-sync package..."
  cd packages/drizzle-sync && bun run build && cd ../..
fi

# Ensure shared is built
if [ ! -d "packages/shared/dist" ]; then
  echo "Building shared package..."
  cd packages/shared && bun run build && cd ../..
fi

echo "=== Init complete ==="
