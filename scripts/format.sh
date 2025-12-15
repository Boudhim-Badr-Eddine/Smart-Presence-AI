#!/bin/bash
# SmartPresence - FORMAT CODE
# Formats Python (black) and JavaScript/TypeScript (prettier) code
# Usage: ./scripts/format.sh

# Colors
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}🎨 Formatting Code${NC}"
echo ""

# Format Python backend
echo -e "${YELLOW}Formatting Python code...${NC}"
docker-compose exec -T backend black app --quiet

# Format JavaScript/TypeScript frontend
echo -e "${YELLOW}Formatting JavaScript/TypeScript code...${NC}"
docker-compose exec -T frontend npx prettier --write . --ignore-path .prettierignore 2>/dev/null || echo "Prettier skipped (optional)"

echo ""
echo -e "${GREEN}✅ Code formatted!${NC}"
echo ""
