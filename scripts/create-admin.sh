#!/bin/bash
# SmartPresence Admin User Creator - Enhanced Version
# Creates a new admin user with validation and error handling
# Usage: ./scripts/create-admin.sh

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

log_info "SmartPresence Admin User Creator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if backend is running
log_info "Checking backend service..."
if ! docker-compose ps --services --filter "status=running" 2>/dev/null | grep -q "^backend$"; then
  log_error "Backend service is not running"
  echo ""
  echo "Start it with: ./scripts/start.sh"
  echo "Check status: ./scripts/status.sh"
  exit 1
fi
log_success "Backend is running"
echo ""

# Collect and validate user input
log_info "Creating admin user"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Username
read -p "Admin username [admin]: " ADMIN_USERNAME
ADMIN_USERNAME=${ADMIN_USERNAME:-admin}

if [ ${#ADMIN_USERNAME} -lt 3 ]; then
  log_error "Username must be at least 3 characters"
  exit 1
fi

# Email
read -p "Admin email [admin@smartpresence.com]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@smartpresence.com}

if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  log_error "Invalid email format"
  exit 1
fi

# Password with validation
while true; do
  read -s -p "Admin password (min 8 chars): " ADMIN_PASSWORD
  echo ""
  
  if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    log_warn "Password must be at least 8 characters"
    continue
  fi
  
  read -s -p "Confirm password: " ADMIN_PASSWORD_CONFIRM
  echo ""
  
  if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
    log_warn "Passwords don't match"
    continue
  fi
  
  break
done

echo ""
log_info "Creating user: $ADMIN_USERNAME ($ADMIN_EMAIL)"
echo ""

# Execute Python script with environment variables
docker-compose exec -T \
  -e ADMIN_USERNAME="$ADMIN_USERNAME" \
  -e ADMIN_EMAIL="$ADMIN_EMAIL" \
  -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  backend python3 << 'EOF'
import os
import sys
from app.db.session import SessionLocal
from app.models.user import User
from app.services.auth import get_password_hash

db = SessionLocal()

username = os.environ.get('ADMIN_USERNAME', 'admin')
email = os.environ.get('ADMIN_EMAIL', 'admin@smartpresence.com')
password = os.environ.get('ADMIN_PASSWORD')

if not password:
  print('❌ Password missing from environment')
  sys.exit(1)

try:
  # Check if admin exists
  existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
  if existing:
    print('❌ Admin user already exists!')
    print(f'   Username: {existing.username}')
    print(f'   Email: {existing.email}')
    print('')
    print('💡 To create a different user, use a unique username and email.')
    sys.exit(0)

  # Create admin
  admin = User(
    username=username,
    email=email,
    password_hash=get_password_hash(password),
    role='admin',
    is_active=True,
  )
  db.add(admin)
  db.commit()

  print('✅ Admin user created successfully!')
  print('')
  print('Login Credentials:')
  print(f'  Username: {username}')
  print(f'  Email:    {email}')
  print('  Password: (the one you just entered)')

except Exception as e:
  print(f'❌ Error creating admin: {str(e)}')
  db.rollback()
  sys.exit(1)
finally:
  db.close()
EOF

RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo ""
  log_success "Admin user creation complete!"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "   1. Go to http://localhost:3000"
  echo "   2. Login with the credentials above"
  echo "   3. Change password after first login (recommended)"
else
  log_error "Failed to create admin user"
  exit 1
fi

echo ""
