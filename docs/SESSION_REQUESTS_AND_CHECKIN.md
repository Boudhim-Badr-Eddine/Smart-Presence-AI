# Session Request and Student Check-in System - Documentation

## Overview
SmartPresence implements a role-based attendance system where:
1. **Admins** create sessions
2. **Trainers** can request sessions from admins
3. **Students** check in to active sessions via smart attendance

---

## 🎯 Session Request Feature (Trainer → Admin)

### How It Works
Since only admins can create sessions, trainers must request session creation through a formal request system with real-time notifications.

### For Trainers

#### Requesting a Session
1. **Navigate to Trainer Dashboard** (`/trainer`)
2. **Click "Demander une session"** button (highlighted in amber)
3. **Fill in the session request form:**
   - Session Title (required)
   - Class/Group (required)
   - Date (required)
   - Start Time & End Time (required)
   - Session Type (optional: course, TD, TP, exam, workshop)
   - Notes/Remarks (optional: additional details for admins)
4. **Submit Request** - Admins receive instant notification

#### Tracking Your Requests
- View your requests via `/trainer/session-requests` (coming soon)
- See status: **pending**, **approved**, or **rejected**
- Receive notification when admin responds

### For Admins

#### Viewing Session Requests
Requests appear in **real-time** on the admin dashboard:
- **Location**: Admin Dashboard → "Demandes de sessions" panel (top of page)
- **Notification Badge**: Shows count of pending requests
- **Auto-refresh**: Uses WebSocket for instant updates

#### Approving/Rejecting Requests
1. **View request details:**
   - Trainer name & email
   - Requested session title, class, date, time
   - Session type and notes
2. **Choose action:**
   - **Approve**: Click "Approuver" button, optionally add a response message
   - **Reject**: Click "Rejeter" button, provide reason (recommended)
3. **Trainer gets notified** instantly of your decision

#### After Approval
- **Manual Step Required**: Admin must still create the session manually via `/admin/sessions`
- Future enhancement: Auto-create session from approved requests

---

## ✅ Student Check-in System

### Overview
Students check in to attendance sessions that trainers have activated. This uses the **Smart Attendance** system with facial recognition, geolocation, and fraud detection.

### How Students Check In

#### Prerequisites
1. **Trainer must activate an attendance session:**
   - Trainer goes to `/trainer/smart-attendance`
   - Creates an attendance session linked to a scheduled session
   - Chooses mode: `self_checkin`, `teams_auto`, or `hybrid`
   - Session becomes active for student check-ins

2. **Student must have:**
   - Camera access (for facial recognition)
   - Location access (optional but recommended for verification)
   - Enrolled in the class/session

#### Check-in Process
1. **Student receives notification** (or sees active session on dashboard)
2. **Navigate to check-in page** - typically `/student/check-in` or via session link
3. **SelfCheckinModal appears** with instructions
4. **Grant camera permission** when prompted
5. **Position face** in the camera frame:
   - Look directly at camera
   - Ensure good lighting
   - Remove glasses/masks if possible (for better recognition)
6. **Grant location permission** (optional - improves verification)
7. **Capture photo** - system automatically:
   - Verifies face matches student's stored facial data
   - Checks liveness (not a photo of a photo)
   - Validates geolocation (if enabled)
   - Runs fraud detection algorithms
8. **Receive feedback:**
   - ✅ **Approved**: Check-in successful, marked present
   - ⚠️ **Flagged**: Sent for manual review by trainer
   - ❌ **Rejected**: Check-in failed (reason provided)

#### Where to Find Active Sessions
**Student Dashboard** (`/student`):
- "Prochains cours" section shows upcoming sessions
- Active attendance sessions display a "Check In" button
- Or access via direct link shared by trainer

**Alternative Methods:**
- QR Code scanning (if trainer enables QR check-in)
- Teams auto-detection (for hybrid/remote sessions)

---

## 🔄 Complete Attendance Flow

```
1. Admin creates session (or approves trainer request)
   ↓
2. Session appears in trainer's schedule
   ↓
3. Trainer activates "Smart Attendance Session"
   ↓
4. Students receive notification / see active session
   ↓
5. Students check in via:
   - Self check-in (camera + face recognition)
   - QR code scan
   - Teams auto-detection (if remote)
   ↓
6. System processes check-in:
   - Facial verification
   - Liveness detection
   - Geolocation validation
   - Fraud detection
   ↓
7. Trainer monitors in real-time:
   - /trainer/smart-attendance (Live Attendance Monitor)
   - Reviews flagged check-ins
   - Approves/rejects suspicious entries
   ↓
8. Attendance records finalized
   ↓
9. Data synced to LMS/HR systems (if configured)
```

---

## 📋 API Endpoints

### Session Requests

#### Create Request (Trainer)
```
POST /api/session-requests
Body: {
  "title": "Introduction to React",
  "class_name": "DEV-2024",
  "session_date": "2025-12-25",
  "start_time": "10:00",
  "end_time": "12:00",
  "session_type": "course",
  "notes": "Need projector"
}
```

#### Get My Requests (Trainer)
```
GET /api/session-requests/my-requests?limit=20&status_filter=pending
```

#### Get All Requests (Admin)
```
GET /api/session-requests/all?limit=50&status_filter=pending
```

#### Approve/Reject Request (Admin)
```
PUT /api/session-requests/{request_id}/status
Body: {
  "status": "approved",  // or "rejected"
  "admin_response": "Session approved for next week"
}
```

### Student Check-in

#### Self Check-in
```
POST /api/smart-attendance/self-checkin?session_id=123
Body: FormData with:
  - photo: (image file)
  - latitude: (optional)
  - longitude: (optional)
```

#### Live Monitoring (Trainer)
```
GET /api/smart-attendance/sessions/{session_id}/live
```

---

## 🔔 Real-time Notifications

### Event Types
- `session_request.created` - New trainer request
- `session_request.updated` - Admin approved/rejected
- `student_stats_updated` - Student attendance changed
- `session_created` - New session added
- `attendance.marked` - Student checked in

### WebSocket Integration
Frontend components subscribe to these events for real-time updates without polling.

---

## 🛠️ Database Schema

### session_requests Table
```sql
CREATE TABLE session_requests (
  id SERIAL PRIMARY KEY,
  trainer_id INTEGER NOT NULL,
  trainer_name VARCHAR(200) NOT NULL,
  trainer_email VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  class_name VARCHAR(100) NOT NULL,
  session_date VARCHAR(50) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  session_type VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  admin_response TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI Components

### Trainer
- **SessionRequestModal** - Form to request sessions
- **Trainer Dashboard** - "Demander une session" button

### Admin
- **SessionRequestsPanel** - Real-time list of requests with approve/reject
- **Admin Dashboard** - Displays panel at top

### Student
- **SelfCheckinModal** - Camera-based facial check-in
- **Student Dashboard** - Shows active sessions for check-in

---

## 🚀 Migration & Deployment

### Run Migration
```bash
# From project root
./scripts/migrate.sh
# or
docker-compose exec backend alembic upgrade head
```

### Verify Setup
1. Admin can create sessions: ✅
2. Trainer can request sessions: ✅ (new feature)
3. Admin sees requests in real-time: ✅
4. Trainer gets notified of approval/rejection: ✅
5. Students can check in to active sessions: ✅ (existing)

---

## 📝 Notes

- **Session creation remains admin-only** for control and oversight
- **Request system** streamlines communication between trainers and admins
- **Real-time notifications** ensure instant response times
- **Student check-in** requires trainer to activate attendance session first
- **Fraud detection** automatically flags suspicious check-ins for review

---

## 🔮 Future Enhancements

1. **Auto-create sessions** from approved requests
2. **Bulk approve/reject** for admins
3. **Request templates** for recurring sessions
4. **Student-initiated check-in** without session activation (location-based)
5. **Mobile app** for easier student check-ins
6. **Push notifications** for mobile devices
