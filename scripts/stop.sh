#!/bin/bash
# SmartPresence Service Stopper - Enhanced Version
# Stops all services with graceful shutdown and cleanup options
# Usage: ./scripts/stop.sh

# Color codes
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Trap Ctrl+C
trap 'log_warning "Shutdown interrupted"; exit 1' INT TERM

log_info "SmartPresence Services - Graceful Shutdown"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if services are running
if ! docker-compose ps 2>/dev/null | grep -q "smartpresence"; then
  log_warning "No services currently running"
  exit 0
fi

# Count running containers
RUNNING=$(docker-compose ps --quiet 2>/dev/null | wc -l)
if [ "$RUNNING" -gt 0 ]; then
  log_info "Found $RUNNING running container(s)"
  log_info "Stopping services (this may take up to 10 seconds)..."
  echo ""
  
  # Stop containers with timeout
  if docker-compose down --timeout 10 2>&1; then
    log_success "All services stopped gracefully"
  else
    log_warning "Some services required forced shutdown"
    docker-compose kill 2>/dev/null || true
    docker-compose down 2>/dev/null || true
    log_success "Services stopped"
  fi
else
  log_warning "No running services found"
fi

echo ""

# Ask about volume cleanup
read -p "Remove volumes and data? (y/N) " -n 1 -r CLEANUP
echo ""

if [[ $CLEANUP =~ ^[Yy]$ ]]; then
  log_info "Removing volumes..."
  
  # Get list of volumes before removal
  VOLUMES=$(docker-compose config --volumes 2>/dev/null | tail -n +2 | wc -l)
  
  if docker-compose down -v 2>/dev/null; then
    log_success "Volumes removed ($VOLUMES volumes cleaned)"
    log_warning "Database data has been deleted"
  else
    log_error "Failed to remove volumes"
    exit 1
  fi
else
  log_info "Keeping volumes and data for next startup"
fi

echo ""
log_success "SmartPresence shutdown complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}To start services again:${NC}"
echo "   ./scripts/start.sh"
echo ""
