# SmartPresence – End-to-end Test Checklist (Docker)

This checklist verifies that **every page is dynamic** (real backend/DB), and that the main systems work end-to-end.

## 0) Start/Restart the stack (Docker-first)

From repo root:

```bash
./scripts/stop.sh
./scripts/start.sh
./scripts/status.sh
```

If you changed code and want a clean rebuild:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 1) Sanity: services are up

- Backend health:

```bash
curl -sS http://localhost:8000/health | head
```

- Backend docs:
  - Open `http://localhost:8000/docs`

- Frontend:
  - Open `http://localhost:3000`

- Logs (if something fails):

```bash
./scripts/logs.sh backend
./scripts/logs.sh frontend
```

## 2) Seed accounts (admin/trainer/student)

Use the project scripts (recommended):

```bash
./scripts/seed-demo.sh
```

Expected demo credentials (from the script output):
- Admin: `admin@smartpresence.com` / `admin123`
- Trainer: `trainer@smartpresence.com` / `trainer123`
- Student: `student@smartpresence.com` / `student123`

If you prefer a manual admin-only creation:

```bash
./scripts/create-admin.sh
```

Expected: you have at least 1 **admin**, 1 **trainer**, 1 **student** account to test role pages.

## 3) Auth (Password + Facial)

### 3.1 Password login

- Go to `http://localhost:3000/auth/login`
- Login with admin credentials

Expected:
- Redirects to the correct role dashboard (`/admin`, `/trainer`, or `/student`)
- No console errors

Role routing expectations:
- If you open a wrong-role route (e.g. student visits `/trainer/sessions`), it auto-redirects to `/${yourRole}`.
- If you are logged out and open a protected page, it redirects to `/auth/login`.

### 3.2 Facial login (real backend)

Prerequisite: the user must be facial-enrolled.

- As admin, open `http://localhost:3000/admin/users`
- Create a **student** (or trainer) with **3 face captures**
- Logout
- Go back to `http://localhost:3000/auth/login` → **Reconnaissance faciale** tab
- Enter email, capture face, login

Expected:
- Login succeeds only when backend verifies
- If not enrolled / face mismatch: shows real error (no fake success)

Also expected:
- On success, you land on the correct role dashboard and stay logged in on refresh.

## 4) Admin pages (dynamic)

Login as **admin** and verify each page renders real data:

- `/admin` (Dashboard)
  - Cards render without crashes
- `/admin/users`
  - Create user + facial enrollment (uses backend)
- `/admin/faces`
  - User list loads dynamically and refresh works
- `/admin/import`
  - Download template
  - Upload CSV/XLSX and import
- Notifications bell
  - Open bell: loads from backend
- Exports
  - Run each export format (CSV/XLSX/PDF) and download works

Expected:
- No “mock/demo” behavior
- Any unimplemented integration returns explicit error (e.g. `501 Not Implemented`)

## 5) Trainer flow (sessions + attendance)

Login as **trainer**:

- `/trainer/sessions`
  - Confirm sessions list loads
- Create or open a session
- `/trainer/mark-attendance`
  - Mark attendance and verify it persists after refresh

If your UI exposes smart-attendance monitoring:
- Open the live monitor panel for a session
  - It refreshes and shows live counts

Expected:
- Attendance changes persist (DB-backed)
- Live monitor pulls from backend on refresh

Role routing sanity:
- Visiting any `/student/*` page as trainer redirects to `/trainer`.

## 6) Student flow (QR + self check-in)

Login as **student**:

### 6.1 QR check-in (online)

- Obtain a QR token from the trainer/session workflow (where your UI provides it)
- Open the student check-in page with token, e.g.:
  - `http://localhost:3000/student/qr-checkin?token=...`
- Click **Check In Now**

Expected:
- Token verifies
- Check-in succeeds and is recorded

### 6.2 QR check-in (offline queue + sync)

- Open `student/qr-checkin` with a valid token
- Turn **offline** (browser devtools → Network → Offline)
- Click **Check In Now**
- Turn **online** again

Expected:
- Offline check-in is queued
- When back online, it syncs to backend automatically

### 6.3 Self check-in (smart attendance)

- Start a session configured for smart self check-in (trainer/admin workflow)
- As student, open the session and start self check-in (camera)
- Allow camera and location

Expected:
- Request hits backend `/api/smart-attendance/self-checkin`
- Result is real: `approved` / `flagged` / `rejected` with reasons

### 6.4 Self check-in (offline queue + sync)

- Start self check-in
- Turn **offline** right before submitting
- Submit (it should queue)
- Turn **online** again

Expected:
- Pending items sync on reconnect

Role routing sanity:
- Visiting any `/trainer/*` or `/admin/*` page as student redirects to `/student`.

## 7) Fraud detection + alerts

Admin:
- Open fraud detection panel (if available in your admin UI)
- Ensure list loads and resolve flow works

Trainer:
- Open live alerts monitor and acknowledge an alert

Expected:
- Resolve/ack actions persist and disappear from “unacknowledged” lists

## 8) Automated tests (optional but recommended)

Backend unit tests:

```bash
./scripts/test.sh
```

Frontend e2e (Playwright):

```bash
cd frontend
npm run test:e2e
```

## 9) If something fails

- Check backend logs:

```bash
./scripts/logs.sh backend
```

- Confirm the frontend is pointing to the backend base URL:
  - `NEXT_PUBLIC_API_BASE_URL` should resolve to the FastAPI host inside Docker usage.

- Hard refresh the browser (or clear site data) if you suspect cached assets.
