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

echo -e "${BLUE}📋 SmartPresence Logs${NC}"
echo ""

SERVICE="${1:-}"

if [ -z "$SERVICE" ]; then
    echo -e "${YELLOW}Showing logs for all services (Ctrl+C to exit)${NC}"
    echo ""
    docker-compose logs -f
else
    echo -e "${YELLOW}Showing logs for: $SERVICE (Ctrl+C to exit)${NC}"
    echo ""
    docker-compose logs -f "$SERVICE"
fi
