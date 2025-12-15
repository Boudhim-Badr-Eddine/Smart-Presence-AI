#!/bin/bash
# SmartPresence Service Status Checker - Enhanced Version
# Displays comprehensive health status with diagnostics and suggestions
# Usage: ./scripts/status.sh [service]

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log_info "SmartPresence System Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Container status
echo -e "${YELLOW}🐳 Container Status:${NC}"
if docker-compose ps 2>/dev/null | grep -q "smartpresence"; then
  docker-compose ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || log_error "Failed to get container status"
else
  log_warn "No containers running"
  echo "   Run: ./scripts/start.sh"
  echo ""
  exit 0
fi

echo ""

# Port availability with enhanced checks
echo -e "${YELLOW}🔌 Port Availability:${NC}"

check_port() {
  local port=$1
  local service=$2
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} Port $port ($service)"
    return 0
  else
    echo -e "   ${RED}✗${NC} Port $port ($service)"
    return 1
  fi
}

check_port 3000 "Frontend"
check_port 8000 "Backend API"
check_port 5432 "PostgreSQL"
check_port 6379 "Redis"

echo ""

# Service health check with detailed diagnostics
echo -e "${YELLOW}🏥 Service Health:${NC}"

# Frontend
echo -n "   Frontend (3000): "
if curl -s -m 2 http://localhost:3000 > /dev/null 2>&1; then
  log_success "Responding"
else
  log_error "Not responding"
  log_warn "   → Check: ./scripts/logs.sh frontend"
fi

# Backend API
echo -n "   Backend (8000): "
if curl -s -m 2 http://localhost:8000/docs > /dev/null 2>&1; then
  log_success "API responding"
else
  log_error "API not responding"
  log_warn "   → Check: ./scripts/logs.sh backend"
fi

# PostgreSQL connectivity
echo -n "   PostgreSQL (5432): "
if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
  TABLES=$(docker-compose exec -T postgres psql -U postgres -d smartpresence -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "?")
  log_success "Connected ($TABLES tables)"
else
  log_error "Not responding"
  log_warn "   → Check: docker-compose logs postgres"
fi

# Redis connectivity
echo -n "   Redis (6379): "
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
  INFO=$(docker-compose exec -T redis redis-cli info 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
  log_success "Connected (${INFO:-?} used)"
else
  log_error "Not responding"
  log_warn "   → Check: docker-compose logs redis"
fi

echo ""

# System diagnostics
echo -e "${YELLOW}📊 System Diagnostics:${NC}"

# Disk usage
DISK=$(docker system df 2>/dev/null | tail -1 | awk '{print $4}')
echo "   Disk Usage: $DISK"

# Container count
COUNT=$(docker-compose ps -q 2>/dev/null | wc -l)
echo "   Running Containers: $COUNT/4"

# Overall status
echo ""
if [ "$COUNT" -eq 4 ]; then
  log_success "All services online"
elif [ "$COUNT" -gt 0 ]; then
  log_warn "Partial startup - $((4 - COUNT)) service(s) missing"
else
  log_error "No services running"
  echo "   Run: ./scripts/start.sh"
fi

echo ""
echo -e "${BLUE}📚 Quick Links:${NC}"
echo "   Frontend:   http://localhost:3000"
echo "   Backend:    http://localhost:8000"
echo "   API Docs:   http://localhost:8000/docs"
echo ""

echo -e "${BLUE}🔧 Troubleshooting:${NC}"
echo "   ./scripts/logs.sh backend    - View backend logs"
echo "   ./scripts/logs.sh frontend   - View frontend logs"
echo "   ./scripts/shell.sh backend   - Open backend shell"
echo "   ./scripts/stop.sh            - Stop all services"
echo ""
