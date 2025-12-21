# Integration Guide

This guide covers all external integrations available in SmartPresence AI, including calendar sync, LMS exports, HR system integration, and webhooks.

---

## Table of Contents

1. [Calendar Integrations](#calendar-integrations)
2. [LMS Integrations](#lms-integrations)
3. [HR System Integrations](#hr-system-integrations)
4. [Webhook Configuration](#webhook-configuration)
5. [API Authentication](#api-authentication)

---

## Calendar Integrations

### iCalendar Export

Export sessions to standard iCalendar (.ics) format for import into any calendar application.

**Endpoint:** `GET /api/integrations/calendar/ical`

**Query Parameters:**
- `start_date` (optional): ISO 8601 format (e.g., `2024-01-01T00:00:00`)
- `end_date` (optional): ISO 8601 format

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.smartpresence.com/api/integrations/calendar/ical?start_date=2024-01-01T00:00:00&end_date=2024-12-31T23:59:59" \
  -o sessions.ics
```

**Response:** `.ics` file download

---

### Google Calendar Sync (Stub)

**Endpoint:** `POST /api/integrations/calendar/google/sync`

**Status:** Not yet implemented

**Planned Features:**
- OAuth2 authentication
- Automatic session sync
- Two-way synchronization
- Conflict resolution

**TODO:**
1. Set up Google Cloud Project
2. Enable Google Calendar API
3. Configure OAuth2 credentials
4. Implement token refresh logic

---

### Microsoft Outlook/365 Sync (Stub)

**Endpoint:** `POST /api/integrations/calendar/outlook/sync`

**Status:** Not yet implemented

**Planned Features:**
- Microsoft Graph API integration
- Teams meeting link generation
- Calendar availability checking
- Shared calendar support

**TODO:**
1. Register app in Azure AD
2. Configure Microsoft Graph permissions
3. Implement OAuth2 flow
4. Add Teams integration

---

## LMS Integrations

### Moodle Export

Export attendance data in Moodle-compatible CSV format.

**Endpoint:** `GET /api/integrations/lms/moodle/export`

**Query Parameters:**
- `session_id` (optional): Filter by specific session
- `start_date` (optional): ISO 8601 format
- `end_date` (optional): ISO 8601 format

**CSV Format:**
```csv
Student ID,Student Email,Session ID,Status,Timestamp,Method
123,student@example.com,456,present,2024-01-15T10:30:00,facial
```

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.smartpresence.com/api/integrations/lms/moodle/export?session_id=456" \
  -o attendance_moodle.csv
```

**Moodle Import Steps:**
1. Download CSV from API
2. In Moodle, navigate to course → Grades → Import
3. Select "CSV file" format
4. Upload the downloaded file
5. Map columns to Moodle fields
6. Complete import

---

### Canvas LMS Sync (Stub)

**Endpoint:** `POST /api/integrations/lms/canvas/sync`

**Request Body:**
```json
{
  "course_id": "12345",
  "session_id": 456
}
```

**Status:** Not yet implemented

**Planned Features:**
- Canvas API integration
- Automatic attendance column creation
- Grade sync
- Assignment creation for sessions

**TODO:**
1. Obtain Canvas API token
2. Configure Canvas API base URL
3. Implement attendance rollup
4. Add grade weighting options

---

### Blackboard Sync (Stub)

**Endpoint:** `POST /api/integrations/lms/blackboard/sync`

**Status:** Not yet implemented

**Planned Features:**
- Blackboard REST API integration
- Attendance tracking column
- Grade center sync
- Student notification

**TODO:**
1. Set up Blackboard developer account
2. Configure OAuth2 credentials
3. Implement REST API client
4. Map attendance to grade items

---

## HR System Integrations

### Attendance Summary Export

Generate HR-ready attendance summaries for individual students/employees.

**Endpoint:** `GET /api/integrations/hr/attendance-summary/{student_id}`

**Query Parameters:**
- `start_date` (optional): Default is 30 days ago
- `end_date` (optional): Default is today

**Response:**
```json
{
  "student_id": 123,
  "student_email": "employee@company.com",
  "period_start": "2024-01-01T00:00:00",
  "period_end": "2024-01-31T23:59:59",
  "total_sessions": 20,
  "present": 18,
  "absent": 2,
  "late": 0,
  "attendance_rate": 90.0
}
```

**Use Cases:**
- Monthly attendance reports
- Performance reviews
- Payroll verification
- Compliance audits

---

### Workday Sync (Stub)

**Endpoint:** `POST /api/integrations/hr/workday/sync`

**Request Body:**
```json
{
  "employee_id": "EMP123",
  "student_id": 456
}
```

**Status:** Not yet implemented

**Planned Features:**
- Workday REST/SOAP API integration
- Time tracking sync
- Absence management
- Leave request correlation

**TODO:**
1. Set up Workday tenant
2. Configure API credentials
3. Implement time entry creation
4. Add absence type mapping

---

### BambooHR Sync (Stub)

**Endpoint:** `POST /api/integrations/hr/bamboohr/sync`

**Status:** Not yet implemented

**Planned Features:**
- BambooHR API integration
- Time off request sync
- Employee directory sync
- Custom field mapping

**TODO:**
1. Obtain BambooHR API key
2. Configure subdomain
3. Implement time off correlation
4. Add custom field support

---

## Webhook Configuration

Configure webhooks to send real-time notifications to external systems.

### Creating a Webhook

**Endpoint:** `POST /api/webhooks`

**Request Body:**
```json
{
  "name": "Slack Attendance Alerts",
  "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "event_type": "attendance.marked",
  "secret": "your-webhook-secret",
  "headers": {
    "Content-Type": "application/json"
  },
  "is_active": true,
  "retry_count": 3,
  "timeout_seconds": 10
}
```

### Event Types

- `attendance.marked` - Fired when attendance is recorded
- `session.created` - New session created
- `session.updated` - Session details updated
- `student.enrolled` - Student enrolled in course
- `alert.created` - Absence alert triggered
- `fraud.detected` - Anomaly detected by ML model

### Webhook Payload Format

```json
{
  "event_type": "attendance.marked",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "student_id": 123,
    "session_id": 456,
    "status": "present",
    "method": "facial",
    "confidence": 0.95
  }
}
```

### Webhook Security

All webhook requests include:
- `X-SmartPresence-Signature` header with HMAC-SHA256 signature
- `X-SmartPresence-Event` header with event type
- `X-SmartPresence-Timestamp` header with Unix timestamp

**Verify Signature (Python):**
```python
import hmac
import hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

---

## API Authentication

All integration endpoints require JWT bearer token authentication.

### Obtaining a Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include in `Authorization` header:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.smartpresence.com/api/integrations/...
```

### Token Expiration

- Default expiration: 24 hours
- Refresh tokens: Not yet implemented
- Re-authenticate when token expires

---

## Rate Limiting

All integration endpoints are subject to rate limiting:

- **Standard users:** 100 requests/hour
- **Admin users:** 1000 requests/hour
- **Webhook triggers:** 10 requests/second

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642262400
```

---

## Error Handling

### Common Error Codes

- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Integration service down

### Error Response Format

```json
{
  "detail": "Error message here",
  "status_code": 400,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Support & Resources

- **API Documentation:** https://docs.smartpresence.com/api
- **Developer Portal:** https://developers.smartpresence.com
- **Support Email:** integrations@smartpresence.com
- **Status Page:** https://status.smartpresence.com

---

## Changelog

### v1.0.0 (2024-01)
- Initial integration framework
- iCalendar export (functional)
- Moodle CSV export (functional)
- HR attendance summary (functional)
- Webhook service (functional)
- Google Calendar (stub)
- Outlook sync (stub)
- Canvas LMS (stub)
- Blackboard (stub)
- Workday (stub)
- BambooHR (stub)
