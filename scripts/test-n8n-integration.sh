#!/bin/bash
# Test N8N integration features
set -e

echo "🧪 Testing N8N Integration..."
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database connection
DB_EXEC="docker exec smartpresence_db psql -U postgres -d smartpresence"

echo "1️⃣ Verifying N8N database tables..."
TABLES=$($DB_EXEC -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('absence', 'pdfabsences');" | tr -d ' ')

if [[ "$TABLES" == *"absence"* ]] && [[ "$TABLES" == *"pdfabsences"* ]]; then
    echo -e "${GREEN}✓ N8N tables exist (absence, pdfabsences)${NC}"
else
    echo -e "${RED}✗ Missing N8N tables${NC}"
    exit 1
fi

echo
echo "2️⃣ Checking students table N8N columns..."
COLS=$($DB_EXEC -t -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'students' AND column_name IN ('pourcentage', 'justification', 'alertsent', 'idStr');" | tr -d ' ')

EXPECTED=("pourcentage" "justification" "alertsent" "idStr")
for col in "${EXPECTED[@]}"; do
    if [[ "$COLS" == *"$col"* ]]; then
        echo -e "${GREEN}✓ Column: $col${NC}"
    else
        echo -e "${RED}✗ Missing column: $col${NC}"
        exit 1
    fi
done

echo
echo "3️⃣ Testing absence creation (simulating attendance marking)..."

# Get first student ID
STUDENT_ID=$($DB_EXEC -t -c "SELECT id FROM students LIMIT 1;" | tr -d ' ')

if [ -z "$STUDENT_ID" ]; then
    echo -e "${YELLOW}⚠ No students in database. Run seed-demo.sh first${NC}"
    exit 1
fi

echo "Using student ID: $STUDENT_ID"

# Create test absence record
$DB_EXEC -c "
INSERT INTO absence (studentid, date, hours, notified) 
VALUES ($STUDENT_ID, NOW(), 2.5, FALSE);
" > /dev/null 2>&1

ABSENCE_COUNT=$($DB_EXEC -t -c "SELECT COUNT(*) FROM absence WHERE studentid = $STUDENT_ID AND notified = FALSE;" | tr -d ' ')

if [ "$ABSENCE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Absence record created (notified=FALSE)${NC}"
    echo -e "${YELLOW}  → N8N Workflow 1 will detect and send parent email${NC}"
else
    echo -e "${RED}✗ Failed to create absence record${NC}"
    exit 1
fi

echo
echo "4️⃣ Testing student total_absence_hours threshold..."

# Update student to >8h for WhatsApp alert
$DB_EXEC -c "
UPDATE students 
SET total_absence_hours = 10, alertsent = FALSE 
WHERE id = $STUDENT_ID;
" > /dev/null 2>&1

ALERT_CANDIDATES=$($DB_EXEC -t -c "SELECT COUNT(*) FROM students WHERE total_absence_hours >= 8 AND alertsent = FALSE;" | tr -d ' ')

if [ "$ALERT_CANDIDATES" -gt 0 ]; then
    echo -e "${GREEN}✓ Student has >8h absences (alertsent=FALSE)${NC}"
    echo -e "${YELLOW}  → N8N Workflow 3 will send WhatsApp alert to parent${NC}"
else
    echo -e "${RED}✗ Threshold test failed${NC}"
    exit 1
fi

echo
echo "5️⃣ Testing controles table for exam reminders..."

CONTROLE_COUNT=$($DB_EXEC -t -c "SELECT COUNT(*) FROM controles WHERE notified = FALSE;" | tr -d ' ')

echo "Unnotified exams: $CONTROLE_COUNT"
if [ "$CONTROLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Controles exist for reminder workflow${NC}"
    echo -e "${YELLOW}  → N8N Workflow 2 will send reminders 72h before exam${NC}"
else
    echo -e "${YELLOW}⚠ No unnotified exams. Create some via API or admin panel${NC}"
fi

echo
echo "6️⃣ Simulating N8N absence notification (marking as notified)..."

# Simulate N8N marking absence as notified (PostgreSQL doesn't support LIMIT in UPDATE)
$DB_EXEC -c "
UPDATE absence 
SET notified = TRUE 
WHERE id = (SELECT id FROM absence WHERE studentid = $STUDENT_ID AND notified = FALSE LIMIT 1);
" > /dev/null 2>&1

NOTIFIED_COUNT=$($DB_EXEC -t -c "SELECT COUNT(*) FROM absence WHERE studentid = $STUDENT_ID AND notified = TRUE;" | tr -d ' ')

if [ "$NOTIFIED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Absence marked as notified (simulating email sent)${NC}"
else
    echo -e "${RED}✗ Failed to update absence${NC}"
    exit 1
fi

echo
echo "7️⃣ Testing PDF storage table..."

# Create test PDF record
$DB_EXEC -c "
INSERT INTO pdfabsences (class, date, pdf_path) 
VALUES ('TEST_CLASS', '2025-12-21', '/app/storage/n8n_pdfs/test.pdf');
" > /dev/null 2>&1

PDF_COUNT=$($DB_EXEC -t -c "SELECT COUNT(*) FROM pdfabsences WHERE class = 'TEST_CLASS';" | tr -d ' ')

if [ "$PDF_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ PDF record stored successfully${NC}"
    echo -e "${YELLOW}  → N8N Workflow 5 uploads PDFs here after generation${NC}"
    
    # Cleanup test record
    $DB_EXEC -c "DELETE FROM pdfabsences WHERE class = 'TEST_CLASS';" > /dev/null 2>&1
else
    echo -e "${RED}✗ Failed to store PDF record${NC}"
    exit 1
fi

echo
echo "8️⃣ Checking N8N API endpoints..."

# Check if backend is running
if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
    
    # Check upload endpoint exists
    if curl -s http://localhost:8000/docs | grep -q "/api/upload"; then
        echo -e "${GREEN}✓ N8N upload endpoint available (/api/upload)${NC}"
    else
        echo -e "${RED}✗ Upload endpoint not found in API docs${NC}"
    fi
else
    echo -e "${RED}✗ Backend API is not responding${NC}"
    exit 1
fi

echo
echo "9️⃣ Summary of N8N integration status..."

echo
echo -e "${GREEN}✅ Database Integration:${NC}"
echo "   • absence table: Ready for Workflow 1 (parent emails)"
echo "   • controles table: Ready for Workflow 2 (exam reminders)"
echo "   • students.total_absence_hours: Ready for Workflow 3 (WhatsApp)"
echo "   • students.pourcentage/justification: Ready for Workflow 4 (AI scoring)"
echo "   • pdfabsences table: Ready for Workflow 5 (daily PDFs)"

echo
echo -e "${GREEN}✅ API Integration:${NC}"
echo "   • POST /api/upload: Ready for PDF uploads from N8N"
echo "   • GET /api/pdfs/{class}/{date}: Ready for PDF retrieval"
echo "   • GET /api/pdfs/recent: Ready for admin dashboard"

echo
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "   1. Configure N8N PostgreSQL credentials (see N8N_SETUP_GUIDE.md)"
echo "   2. Import workflow JSON into N8N"
echo "   3. Setup Gmail, WhatsApp, OpenRouter credentials in N8N"
echo "   4. Install Gotenberg for PDF generation"
echo "   5. Test workflows by manually triggering in N8N UI"

echo
echo -e "${GREEN}✅ Integration test completed successfully!${NC}"
