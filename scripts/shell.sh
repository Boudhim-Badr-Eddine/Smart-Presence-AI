#!/bin/bash
# SmartPresence - OPEN SHELL IN A CONTAINER
# Usage: ./scripts/shell.sh [service]
# Services: backend, frontend, postgres
# Examples:
#   ./scripts/shell.sh backend   - Open bash in backend container
#   ./scripts/shell.sh frontend  - Open sh in frontend container
#   ./scripts/shell.sh postgres  - Open psql in postgres container

# Colors
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

# Detect docker compose (v2) or docker-compose (v1)
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
else
    echo -e "${RED}❌ Docker Compose not installed${NC}" >&2
    exit 1
fi

SERVICE="${1:-backend}"

echo -e "${BLUE}🔓 Opening shell in: $SERVICE${NC}"
echo ""

case "$SERVICE" in
    backend)
        echo -e "${YELLOW}You are in the backend container (Python/FastAPI)${NC}"
        echo "Commands: python, pip, alembic, uvicorn, etc."
        echo "Type 'exit' to quit"
        echo ""
        "${COMPOSE_CMD[@]}" exec backend bash
        ;;
    frontend)
        echo -e "${YELLOW}You are in the frontend container (Node.js/Next.js)${NC}"
        echo "Commands: npm, node, next, etc."
        echo "Type 'exit' to quit"
        echo ""
        "${COMPOSE_CMD[@]}" exec frontend sh
        ;;
    postgres)
        echo -e "${YELLOW}You are in psql (PostgreSQL client)${NC}"
        echo "Commands: SELECT, CREATE, etc."
        echo "Type '\\q' to quit"
        echo ""
        "${COMPOSE_CMD[@]}" exec postgres psql -U postgres -d smartpresence
        ;;
    redis)
        echo -e "${YELLOW}You are in redis-cli (Redis client)${NC}"
        echo "Commands: GET, SET, PING, etc."
        echo "Type 'exit' or 'quit' to quit"
        echo ""
        "${COMPOSE_CMD[@]}" exec redis redis-cli
        ;;
    *)
        echo -e "${RED}❌ Unknown service: $SERVICE${NC}"
        echo ""
        echo -e "${BLUE}Available services:${NC}"
        echo "  ./scripts/shell.sh backend      - Python/FastAPI shell"
        echo "  ./scripts/shell.sh frontend     - Node.js/Next.js shell"
        echo "  ./scripts/shell.sh postgres     - PostgreSQL client"
        echo "  ./scripts/shell.sh redis        - Redis client"
        exit 1
        ;;
esac
