#!/bin/bash
# SmartPresence - LINT CODE
# Checks code quality with Ruff (Python) and ESLint (JavaScript)
# Usage: ./scripts/lint.sh

# Colors
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}🔍 Linting Code${NC}"
echo ""

EXIT_CODE=0

# Lint Python backend
echo -e "${YELLOW}Checking Python code (Ruff)...${NC}"
if docker-compose exec -T backend ruff check app --fix; then
    echo -e "${GREEN}✓ Python linting passed${NC}"
else
    echo -e "${RED}✗ Python linting found issues (auto-fixed where possible)${NC}"
    EXIT_CODE=1
fi
echo ""

# Lint JavaScript/TypeScript frontend
echo -e "${YELLOW}Checking JavaScript/TypeScript code (ESLint)...${NC}"
if docker-compose exec -T frontend npm run lint 2>/dev/null; then
    echo -e "${GREEN}✓ JavaScript linting passed${NC}"
else
    echo -e "${YELLOW}⚠ JavaScript linting skipped or found issues${NC}"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Linting complete!${NC}"
else
    echo -e "${RED}⚠️  Some linting issues were found and auto-fixed${NC}"
fi
echo ""
