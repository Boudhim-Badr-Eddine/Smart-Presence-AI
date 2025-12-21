#!/bin/bash
# N8N Auto-Configuration Script
# This script helps configure N8N workflow with SmartPresence credentials

set -e

echo "🔧 N8N Auto-Configuration for SmartPresence Integration"
echo "========================================================"
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get SmartPresence server IP
SMARTPRESENCE_IP=$(hostname -I | awk '{print $1}')
echo -e "${BLUE}SmartPresence Server IP:${NC} $SMARTPRESENCE_IP"

# Get database password from .env
if [ -f .env ]; then
    DB_PASSWORD=$(grep DB_PASSWORD .env | cut -d '=' -f2)
    echo -e "${BLUE}Database Password:${NC} $DB_PASSWORD"
else
    echo -e "${RED}Error: .env file not found!${NC}"
    exit 1
fi

echo
echo -e "${YELLOW}📋 N8N Configuration Details:${NC}"
echo "-----------------------------"
echo
echo "1️⃣  PostgreSQL Connection:"
echo "   Host: $SMARTPRESENCE_IP"
echo "   Port: 5432"
echo "   Database: smartpresence"
echo "   Username: postgres"
echo "   Password: $DB_PASSWORD"
echo "   SSL: disable"
echo

echo "2️⃣  SmartPresence API Endpoints:"
echo "   Upload URL: http://$SMARTPRESENCE_IP:8000/api/upload"
echo "   Health Check: http://$SMARTPRESENCE_IP:8000/api/health"
echo

echo "3️⃣  Gotenberg PDF Service:"
echo "   URL: http://host.docker.internal:3000/forms/chromium/convert/html"
echo "   (Install: docker run -d -p 3000:3000 gotenberg/gotenberg:8)"
echo

echo "4️⃣  Required N8N Credentials:"
echo "   ✓ PostgreSQL account (see #1 above)"
echo "   ✓ Gmail OAuth2 (configure in N8N UI)"
echo "   ✓ WhatsApp Business API (optional)"
echo "   ✓ OpenRouter API key (for AI scoring)"
echo

# Create N8N configuration file
CONFIG_FILE="n8n_config.txt"
cat > $CONFIG_FILE <<EOF
# N8N Configuration for SmartPresence
# Generated: $(date)

=== POSTGRESQL CREDENTIALS ===
Host: $SMARTPRESENCE_IP
Port: 5432
Database: smartpresence
Username: postgres
Password: $DB_PASSWORD
SSL Mode: disable

=== SMARTPRESENCE API ===
Base URL: http://$SMARTPRESENCE_IP:8000
Upload Endpoint: http://$SMARTPRESENCE_IP:8000/api/upload
Health Check: http://$SMARTPRESENCE_IP:8000/api/health

=== GOTENBERG (PDF Generation) ===
URL: http://host.docker.internal:3000/forms/chromium/convert/html
Install: docker run -d --name gotenberg -p 3000:3000 gotenberg/gotenberg:8

=== N8N WORKFLOW ENDPOINTS TO UPDATE ===
1. All PostgreSQL nodes → Use credentials above
2. HTTP Request node (Upload) → URL: http://$SMARTPRESENCE_IP:8000/api/upload
3. HTTP Request2 node (Gotenberg) → URL: http://host.docker.internal:3000/forms/chromium/convert/html

=== ADMIN EMAIL FOR ERROR NOTIFICATIONS ===
mohamed.fanani.pro@gmail.com

=== TESTING COMMANDS ===
# Test database connection
docker exec smartpresence_db psql -U postgres -d smartpresence -c "SELECT COUNT(*) FROM students;"

# Test API connection
curl http://$SMARTPRESENCE_IP:8000/api/health

# Check pending absences
docker exec smartpresence_db psql -U postgres -d smartpresence -c "SELECT COUNT(*) FROM absence WHERE notified = FALSE;"
EOF

echo -e "${GREEN}✅ Configuration file created: $CONFIG_FILE${NC}"
echo

# Create JSON with updated endpoints
WORKFLOW_FILE="n8n_workflow_configured.json"
echo -e "${YELLOW}📝 Creating configured workflow JSON...${NC}"

# Note: User should provide their original workflow JSON
# This creates a reference file with correct endpoints
cat > $WORKFLOW_FILE <<'JSONEOF'
{
  "meta": {
    "note": "N8N Workflow for SmartPresence - Configured",
    "smartpresence_ip": "REPLACE_WITH_ACTUAL_IP",
    "endpoints": {
      "postgres_host": "REPLACE_WITH_ACTUAL_IP",
      "upload_url": "http://REPLACE_WITH_ACTUAL_IP:8000/api/upload",
      "gotenberg_url": "http://host.docker.internal:3000/forms/chromium/convert/html"
    }
  },
  "instructions": [
    "1. Import your original workflow JSON into N8N",
    "2. Update PostgreSQL nodes with host: REPLACE_WITH_ACTUAL_IP",
    "3. Update HTTP Request node URL to: http://REPLACE_WITH_ACTUAL_IP:8000/api/upload",
    "4. Verify all credentials are configured",
    "5. Test workflow execution"
  ]
}
JSONEOF

# Replace placeholder with actual IP
sed -i "s/REPLACE_WITH_ACTUAL_IP/$SMARTPRESENCE_IP/g" $WORKFLOW_FILE

echo -e "${GREEN}✅ Workflow reference created: $WORKFLOW_FILE${NC}"
echo

# Install Gotenberg if not running
echo -e "${YELLOW}5️⃣  Checking Gotenberg installation...${NC}"
if docker ps | grep -q gotenberg; then
    echo -e "${GREEN}✓ Gotenberg is running${NC}"
else
    echo -e "${YELLOW}⚠ Gotenberg not found. Installing...${NC}"
    read -p "Install Gotenberg now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker run -d --name gotenberg --restart always -p 3000:3000 gotenberg/gotenberg:8
        sleep 3
        if curl -s http://localhost:3000/health > /dev/null; then
            echo -e "${GREEN}✅ Gotenberg installed and running!${NC}"
        else
            echo -e "${RED}✗ Gotenberg installation failed${NC}"
        fi
    fi
fi

echo
echo -e "${GREEN}✅ Auto-configuration complete!${NC}"
echo
echo -e "${BLUE}📁 Generated Files:${NC}"
echo "   • $CONFIG_FILE - Copy this to your colleague's PC"
echo "   • $WORKFLOW_FILE - Reference for endpoint configuration"
echo
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "   1. Copy $CONFIG_FILE to colleague's PC with N8N"
echo "   2. Open N8N UI: http://<colleague-pc-ip>:5678"
echo "   3. Import your workflow JSON"
echo "   4. Configure PostgreSQL credentials using values from $CONFIG_FILE"
echo "   5. Update HTTP Request node URLs with SmartPresence IP ($SMARTPRESENCE_IP)"
echo "   6. Setup Gmail OAuth2 in N8N"
echo "   7. Test workflow execution"
echo
echo -e "${YELLOW}💡 Tip:${NC} Use 'cat $CONFIG_FILE' to view all credentials"
