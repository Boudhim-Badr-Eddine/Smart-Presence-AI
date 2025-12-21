# Copilot Coding Agent Instructions for SmartPresence

## Project Overview
SmartPresence is a full-stack intelligent attendance system with facial recognition, real-time tracking, and AI chatbot integration. It consists of a FastAPI backend (Python), a Next.js frontend (TypeScript/React), PostgreSQL (with pgvector), and Redis, all orchestrated via Docker Compose.

## Architecture & Key Components
- **Backend** (`backend/app/`): FastAPI app with modular services (attendance, alerts, fraud detection, integrations). Key modules:
  - `api/routes/`: API endpoints (see `smart_attendance.py` for main flows)
  - `services/`: Business logic (e.g., `SelfCheckinService`, `TeamsIntegrationService`, `SmartAlertsService`)
  - `models/`, `schemas/`: SQLAlchemy models and Pydantic schemas
  - `core/`: Middleware, audit logging, and core utilities
- **Frontend** (`frontend/`): Next.js 14 app with React 18, Tailwind CSS, and TanStack Table. Key components:
  - `components/SelfCheckinModal.tsx`: Student check-in (camera, geolocation, feedback)
  - `components/LiveAttendanceMonitor.tsx`: Trainer dashboard (real-time monitoring)
  - `components/FraudDetectionPanel.tsx`: Admin fraud review
  - `lib/config.ts`: Centralized API config (uses `NEXT_PUBLIC_API_BASE_URL`)
- **Infrastructure**:
  - `docker-compose.yml`: Orchestrates backend, frontend, db, and cache
  - `scripts/`: Helper scripts for build, test, migration, and admin tasks

## Developer Workflows
- **Build & Run (Docker, recommended):**
  ```bash
  docker-compose build
  docker-compose up -d
  # Logs
  docker-compose logs -f [service]
  ```
- **Scripts:** (see `scripts/README.md`)
  - `start.sh`, `stop.sh`, `status.sh`, `logs.sh`: Service control
  - `migrate.sh`: Run Alembic migrations
  - `create-admin.sh`: Create admin user
  - `format.sh`, `lint.sh`: Code style (Black, Ruff, Prettier)
  - `test.sh`: Run backend tests
  - `test-scripts.sh`: Test helper scripts
- **Frontend:**
  ```bash
  cd frontend
  npm run dev      # Local dev
  npm run build    # Production build
  npm run test:e2e # Playwright E2E tests
  ```
- **Environment:**
  - Copy `.env.example` to `.env` in root, backend, and frontend. Set strong secrets for production.

## Project-Specific Patterns & Conventions
- **API Design:** RESTful, versionless, all endpoints under `/api/`
- **Authentication:** JWT-based, required for most endpoints
- **Facial Recognition:** Uses InsightFace, OpenCV; embeddings stored in pgvector
- **Audit Logging:** All critical actions logged via middleware (`core/audit_middleware.py`)
- **Fraud Detection:** Automated via `anomaly_detection.py` and flagged for admin review
- **Integrations:** LMS (Canvas, Blackboard), HR (Workday, BambooHR) via service stubs in `services/integrations.py`
- **Frontend State:** React Query for async data, Zustand for global state
- **Testing:**
  - Backend: Pytest (see `backend/tests/`)
  - Frontend: Playwright (see `frontend/tests/`)
- **Database:** Alembic for migrations; auto-seeded with demo data on first run

## References
Use these files in the repository root:
- `README.md` (overview)
- `DOCKER_SETUP.md` (Docker deployment)
- `SMART_ATTENDANCE_IMPLEMENTATION.md` (smart attendance details)
- `docs/INTEGRATION_GUIDE.md` (integrations)
- `scripts/README.md` (scripts)

## Tips for AI Agents
- Always use provided scripts for setup, migration, and admin tasks—avoid manual DB or container manipulation.
- Follow the modular service structure for new backend features; add new endpoints under `api/routes/` and business logic under `services/`.
- For new frontend features, prefer colocated state and logic in components, and use `lib/config.ts` for API URLs.
- Reference existing components and services for patterns before introducing new dependencies or approaches.
