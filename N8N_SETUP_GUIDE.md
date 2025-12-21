# N8N Automation Integration - Quick Start

## Overview
This guide helps you configure N8N workflows to work with SmartPresence for automated notifications and reporting.

## Prerequisites
- N8N running (on your colleague's PC or server)
- PostgreSQL database accessible from N8N
- Gmail account with OAuth2 credentials
- WhatsApp Business API account (optional, for Workflow 3)
- Gotenberg service for PDF generation

---

## Step 1: Database Access from N8N

### Option A: N8N in Docker (Same Host)
```yaml
# N8N docker-compose.yml
services:
  n8n:
    image: n8nio/n8n
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
    ports:
      - "5678:5678"
    extra_hosts:
      - "host.docker.internal:host-gateway"  # Access host services
```

**PostgreSQL Connection:**
- Host: `host.docker.internal`
- Port: `5432`
- Database: `smartpresence`
- Username: `postgres`
- Password: (from `.env` file)

### Option B: N8N External (Different PC)
**PostgreSQL Connection:**
- Host: `<smartpresence-server-ip>`  (e.g., 192.168.1.100)
- Port: `5432`
- Database: `smartpresence`
- Username: `postgres`
- Password: (from `.env` file)

**Firewall:** Open port 5432 on SmartPresence server
```bash
sudo ufw allow 5432/tcp
```

---

## Step 2: Import Workflow to N8N

1. Open N8N web interface: `http://<n8n-host>:5678`
2. Click **Workflows** → **Import from File**
3. Upload the workflow JSON (provided by user)
4. Workflow will appear in your workflow list

---

## Step 3: Configure Credentials in N8N

### 3.1 PostgreSQL Account
1. In N8N, go to **Credentials** → **Add Credential** → **Postgres**
2. Name: `Postgres account`
3. Fill in:
   - Host: `host.docker.internal` (or SmartPresence server IP)
   - Database: `smartpresence`
   - User: `postgres`
   - Password: (from SmartPresence `.env`)
   - Port: `5432`
   - SSL: `disable` (or `prefer` for production)
4. Click **Test & Save**

### 3.2 Gmail OAuth2
1. Go to **Credentials** → **Add Credential** → **Gmail OAuth2**
2. Name: `Gmail account`
3. Click **Connect my account**
4. Sign in with Google account
5. Grant permissions to N8N
6. Save credentials

**Admin Email:** Configure `mohamed.fanani.pro@gmail.com` (or your admin email) in error handler nodes

### 3.3 WhatsApp Business API (Optional - Workflow 3)
1. Sign up for WhatsApp Business API at [Meta for Developers](https://developers.facebook.com/docs/whatsapp)
2. Get API credentials (Phone Number ID, Access Token)
3. In N8N, go to **Credentials** → **Add Credential** → **WhatsApp**
4. Name: `WhatsApp account`
5. Fill in your credentials
6. Save

### 3.4 OpenRouter API (Workflow 4 - AI Scoring)
1. Get API key from [OpenRouter](https://openrouter.ai/)
2. In N8N HTTP Request1 node, update header:
   ```
   Authorization: Bearer sk-or-v1-YOUR_API_KEY_HERE
   ```

---

## Step 4: Setup Gotenberg (PDF Generation)

Gotenberg converts HTML to PDF for Workflow 5.

### Install Gotenberg with Docker
```bash
docker run -d \
  --name gotenberg \
  --restart always \
  -p 3000:3000 \
  gotenberg/gotenberg:8
```

**Verify:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"up"}
```

**N8N Configuration:**
In HTTP Request2 node, URL should be:
```
http://host.docker.internal:3000/forms/chromium/convert/html
```

---

## Step 5: Update N8N Workflow Endpoints

### 5.1 Upload Endpoint (Workflow 5)
In HTTP Request node (PDF upload):
```
URL: http://host.docker.internal:8000/api/upload
Method: POST
Content-Type: multipart/form-data
Body: file (binary data)
```

If SmartPresence is on different server:
```
URL: http://<smartpresence-ip>:8000/api/upload
```

### 5.2 Schedule Triggers
Recommended schedules:
- **Workflow 1 (Absence emails):** Every 5 minutes
- **Workflow 2 (Exam reminders):** Daily at 8:00 AM
- **Workflow 3 (WhatsApp alerts):** Every hour
- **Workflow 4 (AI scoring):** Daily at 6:00 PM
- **Workflow 5 (Daily PDFs):** Daily at 11:59 PM

To change schedule:
1. Click Schedule Trigger node
2. Modify **Rule** → **Interval** or **Cron**

---

## Step 6: Test Integration

### Test 1: Mark Student Absent (Workflow 1)
```bash
# On SmartPresence server
curl -X POST http://localhost:8000/api/attendance/mark \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "session_id": 1,
    "student_id": 31,
    "status": "absent"
  }'
```

**Expected:**
1. Record created in `absence` table with `notified=FALSE`
2. N8N detects record on next schedule run
3. Email sent to parent
4. `absence.notified` updated to `TRUE`

**Verify:**
```sql
-- Check absence table
SELECT * FROM absence WHERE notified = FALSE;

-- Check after N8N runs
SELECT * FROM absence WHERE notified = TRUE ORDER BY created_at DESC LIMIT 5;
```

### Test 2: Create Exam (Workflow 2)
```bash
# Create exam 3 days in the future
curl -X POST http://localhost:8000/api/controles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "module": "Mathematics",
    "date": "2025-12-24T10:00:00",
    "class_name": "FS202",
    "notified": false
  }'
```

**Expected:**
1. N8N calculates days until exam
2. When `diffDays == 3`, sends reminder emails to all students in FS202
3. Updates `controles.notified = TRUE`

### Test 3: Trigger WhatsApp Alert (Workflow 3)
```sql
-- Manually set student absence hours > 8
UPDATE students 
SET total_absence_hours = 10, alertsent = FALSE 
WHERE id = 31;
```

**Expected:**
1. N8N queries students with `total_absence_hours >= 8 AND alertsent=FALSE`
2. Sends WhatsApp to `parent_phone`
3. Updates `alertsent = TRUE`

### Test 4: AI Scoring (Workflow 4)
This runs automatically on schedule. To test manually:
1. Ensure students have absence records
2. Open N8N workflow
3. Click **Execute Workflow** button
4. Check students table for `pourcentage` and `justification` updates

### Test 5: PDF Generation (Workflow 5)
1. Ensure there are absences for today
2. Trigger workflow manually or wait for 11:59 PM
3. Check SmartPresence API:
```bash
curl http://localhost:8000/api/pdfs/recent
```

**Expected:**
```json
[
  {
    "id": 1,
    "class": "FS202",
    "date": "2025-12-21",
    "pdf_path": "/app/storage/n8n_pdfs/absences_FS202_2025-12-21.pdf",
    "created_at": "2025-12-21T23:59:30"
  }
]
```

---

## Step 7: Monitor Execution

### N8N Execution Logs
1. Open N8N UI
2. Click **Executions** tab
3. View success/failure status
4. Click execution to see detailed logs

### SmartPresence Logs
```bash
# Backend logs
./scripts/logs.sh backend

# Database queries
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
  SELECT 
    (SELECT COUNT(*) FROM absence WHERE notified = FALSE) AS pending_emails,
    (SELECT COUNT(*) FROM students WHERE total_absence_hours >= 8 AND alertsent = FALSE) AS pending_whatsapp,
    (SELECT COUNT(*) FROM pdfabsences WHERE DATE(created_at) = CURRENT_DATE) AS pdfs_today;
"
```

---

## Troubleshooting

### Issue: N8N can't connect to PostgreSQL
**Symptoms:** Node error "connection refused" or "ECONNREFUSED"

**Solutions:**
1. Check PostgreSQL is accessible:
   ```bash
   docker exec smartpresence_db psql -U postgres -c "SELECT 1"
   ```
2. Verify firewall allows port 5432
3. If N8N in Docker, use `host.docker.internal` instead of `localhost`
4. Test connection from N8N container:
   ```bash
   docker exec n8n ping host.docker.internal
   ```

### Issue: Emails not sending
**Symptoms:** Workflow succeeds but no emails received

**Solutions:**
1. Check Gmail OAuth2 credentials are valid
2. Re-authorize Gmail account in N8N
3. Verify parent_email exists in students table:
   ```sql
   SELECT id, first_name, last_name, parent_email 
   FROM students WHERE parent_email IS NULL;
   ```
4. Check Gmail spam folder
5. Review N8N error output in execution logs

### Issue: WhatsApp messages fail
**Symptoms:** HTTP 401/403 errors in N8N logs

**Solutions:**
1. Verify WhatsApp API credentials
2. Check phone numbers are E.164 format: `+212XXXXXXXXX`
3. Update phone numbers:
   ```sql
   UPDATE students SET parent_phone = '+212679082057' WHERE id = 31;
   ```
4. Verify WhatsApp Business API is active

### Issue: PDF upload fails (404 or 500 error)
**Symptoms:** N8N HTTP Request node fails, "Connection refused"

**Solutions:**
1. Check SmartPresence backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```
2. Verify upload endpoint exists:
   ```bash
   curl http://localhost:8000/docs | grep "upload"
   ```
3. Check `/app/storage/n8n_pdfs` directory exists:
   ```bash
   docker exec smartpresence_backend ls -la /app/storage/n8n_pdfs
   ```
4. Create directory if missing:
   ```bash
   docker exec smartpresence_backend mkdir -p /app/storage/n8n_pdfs
   ```

### Issue: Gotenberg not responding
**Symptoms:** HTML to PDF conversion fails

**Solutions:**
1. Verify Gotenberg is running:
   ```bash
   curl http://localhost:3000/health
   ```
2. Restart Gotenberg:
   ```bash
   docker restart gotenberg
   ```
3. Check Gotenberg logs:
   ```bash
   docker logs gotenberg
   ```

### Issue: AI scoring returns JSON parse errors
**Symptoms:** "Unexpected token" or "Invalid JSON" in N8N logs

**Solution:** This is known issue with AI responses. Code in JavaScript10 node handles cleanup:
```javascript
// Removes escaped newlines and markdown code blocks
let cleanedResponse = rawResponse
  .replace(/^\\n+/, '')
  .replace(/\\n+$/, '')
  .replace(/\\n/g, '\n')
  .trim();
```

If still failing:
1. Check OpenRouter API key is valid
2. Try different AI model (replace `google/gemma-3-27b-it:free` with `anthropic/claude-3-haiku`)
3. Simplify AI prompt in Code in JavaScript9 node

---

## Data Flow Reference

```
┌─────────────────────┐
│  SmartPresence      │
│  (FastAPI Backend)  │
└──────┬──────────────┘
       │
       │ Writes to DB
       ▼
┌─────────────────────────────┐
│  PostgreSQL Database        │
│  - absence (notified=FALSE) │
│  - students (alertsent)     │
│  - controles (notified)     │
└──────┬──────────────────────┘
       │
       │ N8N queries every 5min/hour/day
       ▼
┌──────────────────────┐
│  N8N Workflows       │
│  1. Absence emails   │
│  2. Exam reminders   │
│  3. WhatsApp alerts  │
│  4. AI scoring       │
│  5. PDF reports      │
└──────┬───────────────┘
       │
       ├──► Gmail (Send emails)
       ├──► WhatsApp API (Send messages)
       ├──► OpenRouter API (AI scoring)
       └──► Gotenberg → SmartPresence /api/upload (PDFs)
```

---

## Production Recommendations

1. **Use webhook triggers instead of polling** (more efficient than schedule triggers)
2. **Separate N8N PostgreSQL user** with read-only permissions
3. **Enable SSL** for PostgreSQL connections
4. **Rate limit** email/WhatsApp to avoid spam
5. **Backup N8N workflows** regularly (export JSON)
6. **Monitor execution errors** with N8N's error workflow feature
7. **Rotate API keys** quarterly (OpenRouter, WhatsApp)
8. **GDPR compliance:** Ensure parent consent for automated messages

---

## Support
- N8N Documentation: https://docs.n8n.io/
- SmartPresence Docs: `/docs/N8N_INTEGRATION.md`
- Admin Email: mohamed.fanani.pro@gmail.com
