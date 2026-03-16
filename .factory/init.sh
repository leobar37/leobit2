#!/bin/bash
set -e

cd /Users/leobar37/.supacode/repos/avileo/feature/improvements

# Install dependencies (idempotent)
bun install --frozen-lockfile 2>/dev/null || bun install

echo "Init complete."
