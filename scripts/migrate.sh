#!/bin/bash
# SmartPresence - Run Alembic Migrations
# Usage: ./scripts/migrate.sh [revision]
# Examples:
#   ./scripts/migrate.sh            # upgrade head
#   ./scripts/migrate.sh add        # autogenerate revision with message 'add'

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log() { echo -e "${BLUE}$1${NC}"; }
ok() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }
err() { echo -e "${RED}$1${NC}"; }

cd "$(dirname "$0")/.."

# Detect docker compose (v2) or docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  err "Docker Compose not installed."; exit 1;
fi

if ! "${COMPOSE_CMD[@]}" config --services 2>/dev/null | grep -q '^backend$'; then
  err "Backend service not defined or not running."; exit 1;
fi

ACTION=${1:-upgrade}
MESSAGE=${2:-"auto"}

case "$ACTION" in
  upgrade)
    log "Running Alembic upgrade..."
    HEAD_COUNT=$("${COMPOSE_CMD[@]}" exec -T backend alembic -c alembic.ini heads 2>/dev/null | awk 'NF' | wc -l | tr -d ' ')
    if [ "${HEAD_COUNT}" -gt 1 ]; then
      warn "Multiple Alembic heads detected (${HEAD_COUNT}); upgrading to 'heads'..."
      "${COMPOSE_CMD[@]}" exec -T backend alembic -c alembic.ini upgrade heads && ok "Upgrade complete" || err "Upgrade failed"
    else
      "${COMPOSE_CMD[@]}" exec -T backend alembic -c alembic.ini upgrade head && ok "Upgrade complete" || err "Upgrade failed"
    fi
    ;;
  add)
    log "Autogenerating Alembic revision..."
    "${COMPOSE_CMD[@]}" exec -T backend alembic -c alembic.ini revision --autogenerate -m "$MESSAGE" && ok "Revision created" || err "Revision failed" ;;
  downgrade)
    log "Downgrading Alembic..."
    "${COMPOSE_CMD[@]}" exec -T backend alembic -c alembic.ini downgrade -1 && ok "Downgrade complete" || err "Downgrade failed" ;;
  *)
    warn "Unknown action. Use: upgrade|add|downgrade"; exit 1 ;;
esac
