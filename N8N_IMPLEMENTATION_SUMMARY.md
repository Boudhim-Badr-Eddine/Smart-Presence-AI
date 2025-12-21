# N8N Integration Implementation Summary

## ✅ Completed Components

### 1. Database Schema
**Migration:** `backend/alembic/versions/add_n8n_integration_fields.py`
- ✅ Created `absence` table (id, studentid, date, hours, notified, created_at)
- ✅ Created `pdfabsences` table (id, class, date, pdf_path, created_at)
- ✅ Added `students.pourcentage` (AI attendance score 0-100)
- ✅ Added `students.justification` (AI explanation text)
- ✅ Added `students.alertsent` (WhatsApp notification flag)
- ✅ Added `students.idStr` (String ID for N8N compatibility)

### 2. Database Models
**File:** `backend/app/models/absence.py`
- ✅ Absence model with all required fields
- ✅ PDFAbsence model for daily reports

**File:** `backend/app/models/student.py`
- ✅ Extended with N8N integration fields
- ✅ Properly indexed for query performance

### 3. API Routes
**File:** `backend/app/api/routes/n8n.py`
- ✅ POST /api/upload - Receive PDFs from N8N
- ✅ GET /api/pdfs/{class_name}/{date} - Retrieve specific PDF
- ✅ GET /api/pdfs/recent - List recent reports

**File:** `backend/app/api/router.py`
- ✅ Registered N8N routes in main API router

### 4. Services
**File:** `backend/app/services/attendance.py`
- ✅ `_log_absence_for_n8n()` - Creates absence records when student marked absent
- ✅ Integrated with existing `mark_attendance()` method
- ✅ Auto-updates student stats (already implemented)

**File:** `backend/app/services/n8n_integration.py`
- ✅ N8NIntegrationService class for future webhook integration
- ✅ Methods for all 5 workflow types
- ✅ Prepared for future real-time webhook triggers

### 5. Schemas
**File:** `backend/app/schemas/student.py`
- ✅ Added N8N fields to StudentOut schema
- ✅ Optional fields with defaults

### 6. Documentation
**Files:**
- ✅ `docs/N8N_INTEGRATION.md` - Comprehensive technical documentation
- ✅ `N8N_SETUP_GUIDE.md` - Quick start guide for setup
- ✅ `README.md` - Updated with N8N features

### 7. Testing
**File:** `scripts/test-n8n-integration.sh`
- ✅ Automated test suite for all components
- ✅ Database table verification
- ✅ Column checks
- ✅ Absence creation simulation
- ✅ API endpoint validation

---

## 🔄 N8N Workflow Integration Points

### Workflow 1: Email Parents on Absence
**SmartPresence → N8N:**
1. Trainer marks student absent via API
2. `AttendanceService.mark_attendance()` creates record in `absence` table
3. `notified = FALSE` triggers N8N detection

**N8N → SmartPresence:**
1. N8N queries `SELECT * FROM absence WHERE notified = FALSE`
2. N8N sends email to `parent_email`
3. N8N updates `absence.notified = TRUE`

### Workflow 2: Remind Students 72h Before Exam
**SmartPresence → N8N:**
1. Admin creates controle via `/api/controles`
2. Record stored with `notified = FALSE`

**N8N → SmartPresence:**
1. N8N queries controles daily
2. Calculates days until exam
3. Sends reminder when `diffDays == 3`
4. Updates `controles.notified = TRUE`

### Workflow 3: WhatsApp Alert >8h Absences
**SmartPresence → N8N:**
1. `AttendanceService._update_student_stats()` auto-calculates `total_absence_hours`
2. When >= 8h, student becomes eligible for alert

**N8N → SmartPresence:**
1. N8N queries `SELECT * FROM students WHERE total_absence_hours >= 8 AND alertsent = FALSE`
2. Sends WhatsApp to `parent_phone`
3. Updates `students.alertsent = TRUE`

### Workflow 4: AI Attendance Scoring
**SmartPresence → N8N:**
1. Absence data accumulated in `absence` table
2. Student stats updated continuously

**N8N → SmartPresence:**
1. N8N groups absences by student
2. Calls OpenRouter API for AI analysis
3. AI calculates score (0-100) and justification
4. N8N updates `students.pourcentage` and `students.justification`

### Workflow 5: Daily PDF Reports
**SmartPresence → N8N:**
1. Absence data available in database
2. Student info in `students` table

**N8N → SmartPresence:**
1. N8N aggregates daily absences by class
2. Generates HTML table
3. Converts to PDF via Gotenberg
4. Uploads PDF via `POST /api/upload`
5. SmartPresence stores file and creates `pdfabsences` record

---

## 📊 Database Tables Created

```sql
-- N8N absence tracking
CREATE TABLE absence (
    id SERIAL PRIMARY KEY,
    studentid INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    hours NUMERIC(5,2) NOT NULL,
    notified BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ix_absence_studentid ON absence(studentid);
CREATE INDEX ix_absence_notified ON absence(notified);

-- PDF storage tracking
CREATE TABLE pdfabsences (
    id SERIAL PRIMARY KEY,
    class VARCHAR(50) NOT NULL,
    date VARCHAR(20) NOT NULL,
    pdf_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ix_pdfabsences_class_date ON pdfabsences(class, date);

-- Students table extensions
ALTER TABLE students ADD COLUMN pourcentage INTEGER NULL;
ALTER TABLE students ADD COLUMN justification TEXT NULL;
ALTER TABLE students ADD COLUMN alertsent BOOLEAN DEFAULT FALSE;
ALTER TABLE students ADD COLUMN idStr VARCHAR(20) NULL;
```

---

## 🔐 Security Considerations

1. **Database Access:**
   - N8N requires PostgreSQL credentials
   - Recommendation: Create read-only user for N8N in production
   ```sql
   CREATE USER n8n_readonly WITH PASSWORD 'secure_password';
   GRANT SELECT ON absence, controles, students TO n8n_readonly;
   GRANT INSERT, UPDATE ON absence, pdfabsences TO n8n_readonly;
   ```

2. **API Endpoints:**
   - `/api/upload` currently has no authentication
   - TODO: Add API key or JWT validation for production

3. **PII Data:**
   - Parent emails, phones, absence data are sensitive
   - Ensure N8N server is secured
   - Use SSL/TLS for database connections

---

## 🚀 Deployment Checklist

### SmartPresence Side:
- [x] Run migration: `./scripts/migrate.sh`
- [x] Restart backend: `docker-compose restart backend`
- [x] Verify tables: `./scripts/test-n8n-integration.sh`
- [x] Check API endpoints: `curl http://localhost:8000/api/pdfs/recent`

### N8N Side:
- [ ] Import workflow JSON to N8N
- [ ] Configure PostgreSQL credentials
- [ ] Setup Gmail OAuth2
- [ ] Setup WhatsApp Business API (optional)
- [ ] Get OpenRouter API key
- [ ] Install Gotenberg: `docker run -d -p 3000:3000 gotenberg/gotenberg:8`
- [ ] Update endpoint URLs in workflow nodes
- [ ] Test each workflow manually

### Network Configuration:
- [ ] Ensure N8N can reach SmartPresence PostgreSQL (port 5432)
- [ ] Ensure N8N can reach SmartPresence API (port 8000)
- [ ] Ensure N8N can reach Gotenberg (port 3000)
- [ ] Configure firewall rules if needed

---

## 📖 Documentation Files

| File | Purpose |
|------|---------|
| `N8N_SETUP_GUIDE.md` | Quick start guide with step-by-step setup |
| `docs/N8N_INTEGRATION.md` | Comprehensive technical documentation |
| `scripts/test-n8n-integration.sh` | Automated integration testing |
| `backend/app/services/n8n_integration.py` | Service layer for future webhook integration |
| `backend/app/api/routes/n8n.py` | API endpoints for N8N communication |

---

## 🎯 Testing Commands

```bash
# Full integration test
./scripts/test-n8n-integration.sh

# Check database tables
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
SELECT 
    (SELECT COUNT(*) FROM absence WHERE notified = FALSE) AS pending_emails,
    (SELECT COUNT(*) FROM students WHERE total_absence_hours >= 8 AND alertsent = FALSE) AS pending_whatsapp,
    (SELECT COUNT(*) FROM controles WHERE notified = FALSE) AS pending_exams,
    (SELECT COUNT(*) FROM pdfabsences) AS total_pdfs;
"

# Verify API endpoints
curl http://localhost:8000/openapi.json | jq '.paths | keys[]' | grep -E "(upload|pdfs)"

# Manual absence creation for testing
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
INSERT INTO absence (studentid, date, hours, notified)
SELECT id, NOW(), 2.5, FALSE FROM students LIMIT 1;
"
```

---

## 🔮 Future Enhancements

1. **Real-time Webhooks:**
   - Replace N8N schedule triggers with webhook calls
   - Implement `N8NIntegrationService` webhook methods
   - Add event publishing to attendance marking

2. **Admin Dashboard:**
   - Display AI attendance scores (`pourcentage`)
   - Show PDF download links
   - Alert management interface

3. **Parent Portal:**
   - Allow parents to view absence PDFs
   - Opt-in/out of notifications
   - Preference management (email vs WhatsApp)

4. **Analytics:**
   - Track notification delivery rates
   - AI score trend analysis
   - Class absence comparison reports

---

## ✅ Validation Results

All integration tests PASSED:
- ✅ Database tables created
- ✅ Students table extended
- ✅ Absence records insertable
- ✅ WhatsApp threshold detection working
- ✅ PDF storage functional
- ✅ API endpoints registered
- ✅ Backend startup successful

**Status:** Ready for N8N workflow configuration

---

## 📞 Support

For issues:
1. Check SmartPresence backend logs: `./scripts/logs.sh backend`
2. Review N8N execution logs in N8N UI
3. Run diagnostic: `./scripts/test-n8n-integration.sh`
4. Consult documentation: `docs/N8N_INTEGRATION.md`
