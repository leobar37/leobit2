#!/bin/bash

# Start Avileo backend with Tailscale HTTPS
# This creates an HTTPS endpoint using Tailscale's automatic certificates

set -e

echo "🔐 Starting Avileo backend with Tailscale HTTPS..."
echo ""

# Check if tailscale is running
if ! tailscale status >/dev/null 2>&1; then
    echo "❌ Tailscale is not running. Please start it first:"
    echo "   tailscale up"
    exit 1
fi

# Get Tailscale DNS name
TAILSCALE_DNS=$(tailscale status --json | grep -o '"DNSName": "[^"]*' | head -1 | cut -d'"' -f4)
TAILSCALE_DNS=${TAILSCALE_DNS%.}  # Remove trailing dot

echo "📡 Tailscale DNS: $TAILSCALE_DNS"
echo ""

# Start the backend in the background
echo "🚀 Starting backend on port 5201..."
cd packages/backend

# Use the Tailscale configuration
if [ -f .env.tailscale ]; then
    echo "📋 Using .env.tailscale configuration"
    export $(cat .env.tailscale | grep -v '^#' | xargs)
fi

# Start bun dev in background
bun run dev &
dev_pid=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 3

# Start Tailscale serve for HTTPS
echo ""
echo "🔒 Starting Tailscale HTTPS proxy..."
echo "   HTTPS endpoint: https://$TAILSCALE_DNS"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $dev_pid 2>/dev/null || true
    tailscale serve --https=443 off 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

# Start tailscale serve (this blocks)
tailscale serve --https=443 localhost:5201

# Cleanup on exit
cleanup
