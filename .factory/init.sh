#!/bin/bash
set -euo pipefail

cd "/Users/leobar37/code/avileo"

bun install --frozen-lockfile 2>/dev/null || bun install
mkdir -p data-avileo/extractions/JUAVIK/canonical data-avileo/extractions/JUAVIK/reports data-avileo/consolidated

if [ ! -f packages/backend/.env ]; then
  echo "Warning: packages/backend/.env is missing; backend/seed validation may be blocked."
fi

echo "Mission init complete."
