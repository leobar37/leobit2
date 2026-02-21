#!/bin/bash

# Setup Tailscale HTTPS development environment for Avileo
# This configures both frontend and backend to use Tailscale's automatic HTTPS

set -e

echo "🔐 Configuring Avileo for Tailscale HTTPS development..."
echo ""

# Check if tailscale is running
if ! tailscale status >/dev/null 2>&1; then
    echo "❌ Tailscale is not running. Please start it first:"
    echo "   tailscale up"
    exit 1
fi

# Get Tailscale info
TAILSCALE_DNS=$(tailscale status --json | grep '"DNSName"' | head -1 | cut -d'"' -f4)
TAILSCALE_DNS=${TAILSCALE_DNS%.}  # Remove trailing dot
BACKEND_IP=$(tailscale ip -4)

echo "📡 Your Tailscale DNS: $TAILSCALE_DNS"
echo "📍 Your Tailscale IP: $BACKEND_IP"
echo ""

# Configure backend
echo "📝 Updating backend configuration..."
cd packages/backend

# Backup existing .env
if [ -f .env ] && [ ! -f .env.backup ]; then
    cp .env .env.backup
    echo "   💾 Backup created: .env.backup"
fi

# Create Tailscale HTTPS configuration
cat > .env.tailscale << EOF
# Tailscale HTTPS Development Configuration
DATABASE_URL="$(grep DATABASE_URL .env | cut -d'"' -f2)"
PORT="5201"

# HTTPS Tailscale URLs (automatic TLS certificates)
FRONTEND_URL="https://$TAILSCALE_DNS:5173"
BETTER_AUTH_BASE_URL="https://$TAILSCALE_DNS"
BETTER_AUTH_CROSS_SITE="true"

# Electric SQL (keep from original)
VITE_ELECTRIC_SOURCE_ID=$(grep VITE_ELECTRIC_SOURCE_ID .env | cut -d'=' -f2)
VITE_ELECTRIC_TOKEN=$(grep VITE_ELECTRIC_TOKEN .env | cut -d'=' -f2)
EOF

echo "   ✓ Created .env.tailscale"
echo ""

# Configure frontend
echo "📝 Updating frontend configuration..."
cd ../app

cat > .env.local << EOF
# Tailscale HTTPS - Backend access via VPN
# HTTPS is required for cross-site cookies with sameSite: "none"
VITE_API_URL=https://$TAILSCALE_DNS
EOF

echo "   ✓ Updated .env.local"
echo ""

# Make scripts executable
cd ..
chmod +x scripts/start-tailscale-https.sh 2>/dev/null || true

echo "=================================="
echo "✅ Tailscale HTTPS configuration ready!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Start the backend with HTTPS:"
echo "   ./scripts/start-tailscale-https.sh"
echo ""
echo "   Or manually:"
echo "   cd packages/backend"
echo "   cp .env.tailscale .env"
echo "   tailscale serve --https=443 localhost:5201 &"
echo "   bun run dev"
echo ""
echo "2. Start the frontend (on any device with Tailscale):"
echo "   cd packages/app"
echo "   bun run dev --host"
echo ""
echo "3. Access from any device on your Tailscale network:"
echo "   Frontend: https://$TAILSCALE_DNS:5173"
echo "   Backend:  https://$TAILSCALE_DNS"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Both devices must be connected to Tailscale"
echo "   - HTTPS is required for cookies to work cross-site"
echo "   - The browser will show a valid certificate from Tailscale"
echo ""
