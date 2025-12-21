#!/bin/bash
# SmartPresence - Rebuild images (no data loss)
# Usage:
#   ./scripts/rebuild.sh            # rebuild all services
#   ./scripts/rebuild.sh backend    # rebuild one service

set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}$1${NC}"; }
ok() { echo -e "${GREEN}$1${NC}"; }
err() { echo -e "${RED}$1${NC}"; }

cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  err "Docker Compose not installed"; exit 1
fi

SERVICE=${1:-}

log "Rebuilding Docker images..."
if [ -n "$SERVICE" ]; then
  "${COMPOSE_CMD[@]}" build "$SERVICE"
else
  "${COMPOSE_CMD[@]}" build
fi

ok "Rebuild complete"
