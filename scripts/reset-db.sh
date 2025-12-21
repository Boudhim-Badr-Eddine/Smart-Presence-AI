#!/bin/bash
# SmartPresence - Reset database + migrate + seed mini dataset
# - Deletes the existing Postgres volume (ALL DB DATA LOST)
# - Starts postgres/redis/backend
# - Runs migrations
# - Seeds demo dataset (admin + trainers + students)
# Usage:
#   ./scripts/reset-db.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Detect docker compose (v2) or docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  log_error "Docker Compose not installed"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_warning "This will DELETE the current database volume (old data removed)."
read -p "Continue? (y/N) " -n 1 -r CONFIRM
echo
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
  log_warning "Cancelled"
  exit 1
fi

log_info "Stopping services and removing volumes (DB reset)..."
"${COMPOSE_CMD[@]}" down -v --remove-orphans

log_info "Starting services (no rebuild)..."
"${COMPOSE_CMD[@]}" up -d postgres redis backend

log_info "Waiting for backend to respond..."
for i in {1..60}; do
  if curl -fsS http://localhost:8000/health >/dev/null 2>&1 || curl -fsS http://localhost:8000/docs >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

log_info "Running migrations..."
./scripts/migrate.sh upgrade

log_info "Seeding mini dataset (admin + trainers + students)..."
"${COMPOSE_CMD[@]}" exec -T backend python -m app.scripts.seed_mini

log_success "DB reset + seed complete"
log_success "Admin login: badr.eddine.boudhim@smartpresence.com / Luno.xar.95"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
