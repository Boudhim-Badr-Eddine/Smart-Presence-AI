#!/bin/bash
# SmartPresence - VIEW SERVICE LOGS
# Usage: ./scripts/logs.sh [service_name]
# Examples:
#   ./scripts/logs.sh              - View all logs
#   ./scripts/logs.sh backend      - View backend logs
#   ./scripts/logs.sh frontend     - View frontend logs
#   ./scripts/logs.sh postgres     - View database logs

# Colors
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

# Detect docker compose (v2) or docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
else
    echo "Docker Compose not installed" >&2
    exit 1
fi

echo -e "${BLUE}📋 SmartPresence Logs${NC}"
echo ""

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Showing logs for all services (Ctrl+C to exit)${NC}"
    echo ""
    "${COMPOSE_CMD[@]}" logs -f
else
    echo -e "${YELLOW}Showing logs for: $SERVICE (Ctrl+C to exit)${NC}"
    echo ""
    "${COMPOSE_CMD[@]}" logs -f "$SERVICE"
fi
