#!/bin/bash
set -e

echo "Installing dependencies..."
bun install

echo "Generating database migrations..."
bun run db:generate

echo "Applying migrations..."
bun run db:migrate

echo "Setup complete!"
