# 🚀 READY TO USE - N8N Configuration Instructions

## ✅ SmartPresence Server Configuration Complete!

**Server IP:** `192.168.11.111`  
**Database:** Ready and accessible  
**API:** Running on port 8000  
**Gotenberg PDF:** Installed on port 3001  

---

## 📋 For Your Colleague (N8N PC Setup)

### Step 1: Import Workflow to N8N

1. Open N8N web interface: `http://<colleague-pc-ip>:5678`
2. Click **"Workflows"** (left sidebar)
3. Click **"Add workflow"** → **"Import from File"**
4. Select the workflow JSON file you provided
5. Workflow will appear in the editor

---

### Step 2: Configure PostgreSQL Credentials

1. In N8N, click **"Credentials"** (left sidebar)
2. Click **"Add Credential"** → Search for **"Postgres"**
3. Name: `Postgres account`
4. Fill in these values:

```
Host: 192.168.11.111
Database: smartpresence
User: postgres
Password: postgres
Port: 5432
SSL: disable
```

5. Click **"Test & Save"**
6. ✅ Should show "Connection successful"

---

### Step 3: Configure Gmail OAuth2

1. In N8N, go to **"Credentials"** → **"Add Credential"** → **"Gmail OAuth2"**
2. Name: `Gmail account`
3. Click **"Connect my account"**
4. Sign in with Google account: **mohamed.fanani.pro@gmail.com** (or admin email)
5. Grant N8N permissions
6. Click **"Save"**

---

### Step 4: Update Workflow Endpoints

Open the imported workflow and update these nodes:

#### A) HTTP Request2 Node (Gotenberg PDF)
- Click the "HTTP Request2" node
- Update URL to: `http://host.docker.internal:3001/forms/chromium/convert/html`
- Method: `POST`
- Content-Type: `multipart/form-data`

#### B) HTTP Request Node (Upload PDF to SmartPresence)
- Click the "HTTP Request" node
- Update URL to: `http://192.168.11.111:8000/api/upload`
- Method: `POST`
- Content-Type: `multipart/form-data`

#### C) All PostgreSQL Nodes
- Click each "Select rows from a table" node
- Ensure credentials are set to **"Postgres account"** (from Step 2)

---

### Step 5: Configure OpenRouter API (AI Scoring)

1. Get API key from https://openrouter.ai/
2. In workflow, find **"HTTP Request1"** node (AI scoring)
3. Under **"Headers"**, update:
   ```
   Authorization: Bearer sk-or-v1-YOUR_API_KEY_HERE
   ```

---

### Step 6: (Optional) WhatsApp Business API

1. Sign up at https://developers.facebook.com/docs/whatsapp
2. In N8N, add **"WhatsApp"** credentials
3. In workflow, find **"Send message"** node (WhatsApp)
4. Select your WhatsApp credentials

---

### Step 7: Test Each Workflow

#### Test 1: Database Connection
1. In workflow editor, click **any PostgreSQL node**
2. Click **"Execute Node"** button
3. ✅ Should show student data from database

#### Test 2: Absence Email Workflow
```bash
# On SmartPresence server, create test absence:
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
INSERT INTO absence (studentid, date, hours, notified) 
VALUES (2, NOW(), 2.0, FALSE);
"
```

Then in N8N:
1. Click **"Execute Workflow"** button (top right)
2. Check **"Executions"** tab
3. ✅ Should send email to parent

#### Test 3: PDF Generation
1. Manually trigger Workflow 5 (Daily PDF)
2. Check executions tab
3. ✅ PDF should be uploaded to SmartPresence

---

### Step 8: Activate Workflows

1. In N8N workflow editor, toggle **"Active"** switch (top right)
2. Workflows will now run on schedule:
   - **Workflow 1** (Absence emails): Every 5 minutes
   - **Workflow 2** (Exam reminders): Daily at 8:00 AM
   - **Workflow 3** (WhatsApp alerts): Every hour
   - **Workflow 4** (AI scoring): Daily at 6:00 PM
   - **Workflow 5** (Daily PDFs): Daily at 11:59 PM

---

## 🔍 Troubleshooting

### ❌ "Connection refused" error
**Solution:** Check if SmartPresence server IP is reachable:
```bash
ping 192.168.11.111
```

### ❌ PostgreSQL connection fails
**Solutions:**
1. Verify firewall allows port 5432
2. Test from N8N PC:
   ```bash
   telnet 192.168.11.111 5432
   ```
3. If using Docker for N8N, use `host.docker.internal` instead of IP

### ❌ Gmail authorization error
**Solutions:**
1. Re-authorize Gmail account in N8N credentials
2. Check Gmail "Less secure app access" settings
3. Use Gmail App Password instead of main password

### ❌ PDF generation fails
**Solutions:**
1. Verify Gotenberg is accessible:
   ```bash
   curl http://localhost:3001/health
   ```
2. Check N8N can reach Gotenberg (use `host.docker.internal:3001`)

### ❌ Emails not sending
**Check:**
1. Parent email exists in students table
2. Gmail credentials are valid
3. Check spam folder
4. Review N8N execution logs for errors

---

## 📊 Monitoring & Verification

### Check Pending Notifications
```bash
# Pending absence emails
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
SELECT COUNT(*) FROM absence WHERE notified = FALSE;
"

# Students with >8h absences (WhatsApp pending)
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
SELECT id, first_name, last_name, total_absence_hours 
FROM students 
WHERE total_absence_hours >= 8 AND alertsent = FALSE;
"

# Upcoming exams (reminders pending)
docker exec smartpresence_db psql -U postgres -d smartpresence -c "
SELECT module, date, class FROM controles WHERE notified = FALSE;
"
```

### View N8N Execution History
1. Open N8N UI
2. Click **"Executions"** (left sidebar)
3. See all workflow runs with success/failure status
4. Click any execution to see detailed logs

### Check Generated PDFs
```bash
curl http://192.168.11.111:8000/api/pdfs/recent
```

---

## ✅ Success Checklist

- [ ] N8N workflow imported
- [ ] PostgreSQL credentials configured and tested
- [ ] Gmail OAuth2 connected
- [ ] Gotenberg URL updated (port 3001)
- [ ] SmartPresence upload URL updated (192.168.11.111:8000)
- [ ] OpenRouter API key configured
- [ ] Test workflow executed successfully
- [ ] Workflows activated (toggle switch ON)
- [ ] Executions tab shows successful runs

---

## 🎉 You're All Set!

Once activated, the workflows will automatically:

✅ **Send emails to parents** when students are marked absent  
✅ **Remind students** 3 days before exams  
✅ **Alert via WhatsApp** when >8h cumulative absences  
✅ **Calculate AI scores** daily with explanations  
✅ **Generate PDF reports** every night at 11:59 PM  

**Support:** Check `N8N_SETUP_GUIDE.md` for detailed troubleshooting  
**Admin Email:** mohamed.fanani.pro@gmail.com
