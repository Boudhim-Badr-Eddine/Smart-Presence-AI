#!/bin/bash
# SmartPresence - Full Docker reset for this project
# - Stops containers
# - Removes project images
# - Optionally removes volumes (DB/data reset)
# - Prunes build cache (optional)
# Usage:
#   ./scripts/reset-docker.sh

set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}$1${NC}"; }
ok() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
err() { echo -e "${RED}$1${NC}"; }

cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  err "Docker Compose not installed"; exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "SmartPresence Docker Reset"
warn "This will stop SmartPresence containers and remove images."

read -p "Remove DB/data volumes too? (y/N) " -n 1 -r REMOVE_VOLUMES
echo

read -p "Also prune ALL Docker build cache (can free lots of space)? (y/N) " -n 1 -r PRUNE_BUILDER
echo

read -p "Also prune UNUSED Docker images/containers/networks? (y/N) " -n 1 -r PRUNE_UNUSED
echo

PRUNE_UNUSED_VOLUMES=""
if [[ $PRUNE_UNUSED =~ ^[Yy]$ ]]; then
  read -p "Include UNUSED volumes too? (y/N) " -n 1 -r PRUNE_UNUSED_VOLUMES
  echo
fi

echo
log "Stopping services..."
"${COMPOSE_CMD[@]}" down --remove-orphans || true

if [[ $REMOVE_VOLUMES =~ ^[Yy]$ ]]; then
  log "Removing volumes (DB/data will be deleted)..."
  "${COMPOSE_CMD[@]}" down -v --remove-orphans || true
fi

log "Removing project images (if present)..."
# These are the images built by this repo's compose file
for img in smartpresence_backend:latest smartpresence_frontend:latest; do
  if docker image inspect "$img" >/dev/null 2>&1; then
    docker image rm -f "$img" || true
  fi
done

if [[ $PRUNE_BUILDER =~ ^[Yy]$ ]]; then
  log "Pruning Docker builder cache..."
  docker builder prune -af || true
fi

if [[ $PRUNE_UNUSED =~ ^[Yy]$ ]]; then
  if [[ $PRUNE_UNUSED_VOLUMES =~ ^[Yy]$ ]]; then
    log "Pruning unused Docker resources (including unused volumes)..."
    docker system prune -af --volumes || true
  else
    log "Pruning unused Docker resources (images/containers/networks)..."
    docker system prune -af || true
  fi
fi

ok "Reset complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Next: ./scripts/start.sh (fast) or ./scripts/rebuild.sh (if you changed Dockerfiles)"
