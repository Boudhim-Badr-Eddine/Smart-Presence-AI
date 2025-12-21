# Attendance System (Présentiel + Distance) — How to Test

SmartPresence supports:
- **Présentiel (in-person)**: QR check-in + Smart self-checkin (face + optional GPS)
- **Distance (remote)**: Teams participation tracking ("teams_auto" mode)

This guide gives copy/paste commands to test the flows.

## 0) Start services

```bash
./scripts/start.sh
```

## 1) Get an admin token

```bash
API=http://localhost:8000
EMAIL=badrboudhim@smartpresence.com
PASS='Admin@123'

TOKEN=$(curl -sS -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

echo "$TOKEN" | head -c 40; echo
```

## 2) Create a session (admin)

```bash
SESSION_ID=$(curl -sS -X POST "$API/api/admin/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Cours Présentiel",
    "className": "CS101",
    "trainerId": 1,
    "date": "2025-12-17",
    "startTime": "08:30:00",
    "endTime": "10:30:00"
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

echo "SESSION_ID=$SESSION_ID"
```

## 3) Présentiel option A — QR check-in

### 3.1 Generate QR (trainer/admin)

```bash
curl -sS -X POST "$API/api/qr/generate/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o qr.png

file qr.png
```

### 3.2 Student checks in

- Login as a **student** in the UI (or get a student token via `/api/auth/login`).
- The student calls `/api/qr/checkin` with the `token` extracted from the QR URL.

Notes:
- The backend stores attendance with `attendance_records.student_id = students.id` (not `users.id`).
- QR tokens are cached with TTL (Redis when available), so it works across requests.

## 4) Présentiel option B — Smart self-checkin (face)

1) Create a smart-attendance session config:

```bash
curl -sS -X POST "$API/api/smart-attendance/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"session_id\": $SESSION_ID, \"mode\": \"self_checkin\", \"checkin_window_minutes\": 15, \"location_verification_enabled\": false}"
```

2) Student opens the app → self-checkin modal → capture → submit.

## 5) Distance — Teams auto (remote)

1) Create a smart-attendance session config in `teams_auto` mode with meeting identifiers.
2) Run the sync endpoint (trainer/admin):

```bash
curl -sS -X POST "$API/api/smart-attendance/teams/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"session_id": 1}'
```

(Teams sync requires Graph API wiring; the structure is ready, but real data depends on credentials.)
