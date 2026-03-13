#!/bin/bash
# Init script for PGlite migration mission
# This script is idempotent - safe to run multiple times

set -e

echo "=== Avileo PGlite Migration Setup ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must run from repo root"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "packages/app/node_modules" ]; then
    echo "Installing dependencies..."
    cd packages/app && npm install
    cd ../..
fi

# Check for required env vars
if [ ! -f "packages/app/.env" ]; then
    echo "Warning: packages/app/.env not found"
    echo "Copy .env.example to .env and configure"
fi

# Create backup directory
mkdir -p backups
mkdir -p reports

echo "=== Setup Complete ==="
echo "Ready for migration mission"
