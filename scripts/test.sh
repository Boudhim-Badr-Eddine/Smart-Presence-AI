#!/bin/bash
# SmartPresence - RUN TESTS
# Runs pytest for backend and jest for frontend
# Usage: ./scripts/test.sh [backend|frontend|all]

# Colors
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}🧪 Running Tests${NC}"
echo ""

TEST_TARGET="${1:-all}"

run_backend_tests() {
    echo -e "${YELLOW}Running backend tests (pytest)...${NC}"
    docker-compose exec -T backend pytest -v || return 1
}

run_frontend_tests() {
    echo -e "${YELLOW}Running frontend tests (jest)...${NC}"
    docker-compose exec -T frontend npm test -- --passWithNoTests || return 1
}

case "$TEST_TARGET" in
    backend)
        run_backend_tests && echo -e "\n${GREEN}✓ Backend tests passed${NC}" || echo -e "\n${RED}✗ Backend tests failed${NC}"
        ;;
    frontend)
        run_frontend_tests && echo -e "\n${GREEN}✓ Frontend tests passed${NC}" || echo -e "\n${RED}✗ Frontend tests failed${NC}"
        ;;
    all|*)
        EXIT_CODE=0
        run_backend_tests && echo -e "\n${GREEN}✓ Backend tests passed${NC}" || { echo -e "\n${RED}✗ Backend tests failed${NC}"; EXIT_CODE=1; }
        run_frontend_tests && echo -e "\n${GREEN}✓ Frontend tests passed${NC}" || { echo -e "\n${RED}✗ Frontend tests failed${NC}"; EXIT_CODE=1; }
        exit $EXIT_CODE
        ;;
esac
