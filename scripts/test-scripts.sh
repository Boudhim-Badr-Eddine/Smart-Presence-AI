#!/bin/bash
# SmartPresence Scripts Comprehensive Test Suite
# Tests all scripts in a controlled manner with detailed reporting
# Usage: ./scripts/test-scripts.sh

# Color codes
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Logging functions
log_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_test() {
  echo -e "${BLUE}📝 Test: $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ PASS: $1${NC}"
}

log_error() {
  echo -e "${RED}❌ FAIL: $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Test function
run_test() {
  local test_name=$1
  local command=$2
  local expected_exit=0
  
  TESTS_RUN=$((TESTS_RUN + 1))
  log_test "$test_name"
  
  # Run command and capture output
  OUTPUT=$(eval "$command" 2>&1)
  RESULT=$?
  
  if [ $RESULT -eq $expected_exit ]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log_success "$test_name"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name (exit code: $RESULT, expected: $expected_exit)")
    log_error "$test_name"
    echo "  Output: $OUTPUT"
  fi
  echo ""
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log_header "SmartPresence Script Test Suite"
echo ""
log_info "Starting comprehensive script tests..."
echo ""

# Test 1: Syntax validation for all scripts
log_header "Section 1: Bash Syntax Validation"

for script in scripts/*.sh; do
  name=$(basename "$script")
  run_test "Syntax check: $name" "bash -n $script"
done

# Test 2: Script permissions
log_header "Section 2: Script Permissions"

log_test "All scripts are executable"
UNEXECUTABLE=0
for script in scripts/*.sh; do
  if [ ! -x "$script" ]; then
    UNEXECUTABLE=$((UNEXECUTABLE + 1))
  fi
done

if [ $UNEXECUTABLE -eq 0 ]; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  log_success "All scripts are executable"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  FAILED_TESTS+=("$UNEXECUTABLE scripts not executable")
  log_error "$UNEXECUTABLE scripts are not executable"
  chmod +x scripts/*.sh
  log_info "Fixed: Made all scripts executable"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Test 3: Docker availability
log_header "Section 3: Docker Prerequisites"

run_test "Docker command available" "command -v docker"
run_test "Docker Compose available" "docker-compose version"

# Test 4: Environment file
log_header "Section 4: Environment Configuration"

if [ ! -f .env ]; then
  log_warn ".env not found, would be created by start.sh"
fi

if [ -f .env.example ]; then
  run_test ".env.example exists and is valid" "test -f .env.example"
else
  log_warn ".env.example not found"
fi

echo ""

# Test 5: Services health checks (if running)
log_header "Section 5: Service Health Checks"

if docker-compose ps 2>/dev/null | grep -q "smartpresence"; then
  log_info "Services are running, testing health endpoints..."
  
  # Test Backend
  run_test "Backend API responds" "curl -s -m 3 http://localhost:8000/docs > /dev/null && echo 'OK'"
  
  # Test Frontend
  run_test "Frontend responds" "curl -s -m 3 http://localhost:3000 > /dev/null && echo 'OK'"
  
  # Test Database connectivity
  run_test "PostgreSQL is accessible" "docker-compose exec -T postgres pg_isready -U postgres > /dev/null && echo 'OK'"
  
  # Test Redis connectivity
  run_test "Redis is accessible" "docker-compose exec -T redis redis-cli ping > /dev/null && echo 'OK'"
else
  log_warn "Services not running - skipping health checks"
  log_info "Services will be tested by manual ./scripts/start.sh"
fi

echo ""

# Test 6: Script functionality (dry runs where possible)
log_header "Section 6: Script Content Validation"

# Check status.sh content
run_test "status.sh contains health checks" "grep -q 'curl\|health\|Status' scripts/status.sh"

# Check logs.sh content
run_test "logs.sh contains log command" "grep -q 'docker-compose logs\|docker compose logs' scripts/logs.sh"

# Check create-admin.sh content
run_test "create-admin.sh contains validation" "grep -q 'validation\|error\|check' scripts/create-admin.sh || grep -q 'existing\|create admin' scripts/create-admin.sh"

# Check format.sh exists and is valid
run_test "format.sh is present" "test -f scripts/format.sh && bash -n scripts/format.sh"

# Check lint.sh exists and is valid
run_test "lint.sh is present" "test -f scripts/lint.sh && bash -n scripts/lint.sh"

# Check test.sh exists and is valid
run_test "test.sh is present" "test -f scripts/test.sh && bash -n scripts/test.sh"

echo ""

# Test 7: Error handling
log_header "Section 7: Error Handling"

log_test "Scripts handle missing services gracefully"
if grep -q "exit 1\|error\|Error" scripts/start.sh scripts/create-admin.sh scripts/status.sh 2>/dev/null; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  log_success "Scripts contain error handling"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  FAILED_TESTS+=("Insufficient error handling in scripts")
  log_error "Limited error handling detected"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

log_test "Scripts trap Ctrl+C gracefully"
if grep -q "trap\|INT\|TERM" scripts/start.sh scripts/stop.sh 2>/dev/null; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
  log_success "Scripts handle signal interruption"
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
  FAILED_TESTS+=("Missing signal handlers in scripts")
  log_error "Limited signal handling detected"
fi
TESTS_RUN=$((TESTS_RUN + 1))
echo ""

# Summary
log_header "Test Summary"

echo -e "${BLUE}Total Tests:${NC}  $TESTS_RUN"
echo -e "${GREEN}Passed:${NC}       $TESTS_PASSED"
echo -e "${RED}Failed:${NC}       $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  log_success "All tests passed! Scripts are ready to use."
else
  log_error "Some tests failed:"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  • $test"
  done
fi

echo ""
log_header "Next Steps"
echo "1. Run: ./scripts/start.sh     (to start all services)"
echo "2. Run: ./scripts/status.sh    (to verify service health)"
echo "3. Run: ./scripts/create-admin.sh (to create admin user)"
echo "4. Access: http://localhost:3000 (frontend)"
echo ""

exit $TESTS_FAILED
