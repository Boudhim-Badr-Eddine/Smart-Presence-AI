#!/bin/bash
# SmartPresence - Seed Demo Data
# Usage: ./scripts/seed-demo.sh

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

# Detect compose
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD=(docker-compose)
else
  log_error "Docker Compose not installed"
  exit 1
fi

log_info "Seeding demo data into backend DB"

# Ensure services running
if ! "${COMPOSE_CMD[@]}" ps | grep -q backend; then
  log_warning "Backend container not running; starting services"
  "${COMPOSE_CMD[@]}" up -d
fi

# Run seed script inside backend
SEED_CMD=(python -m app.scripts.seed_demo)
if ! "${COMPOSE_CMD[@]}" exec -e FACE_STORAGE_DIR="/app/storage/faces" backend "${SEED_CMD[@]}"; then
  log_error "Seeding failed"
  exit 1
fi

log_success "Demo data seeded successfully"
echo "- Trainers: dam nachit, yassin madani, rachid aitaamou"
echo "- Students: DEV101/DEV102 sample group"
echo "- Sessions & attendance: created"
echo "- Notifications: welcome messages"
echo "- Faces: placeholder images enrolled for first student"
