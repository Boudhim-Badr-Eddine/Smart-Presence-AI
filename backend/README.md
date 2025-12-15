# Backend (FastAPI)

## Quick start (local)
1. Create and activate a virtualenv.
2. `pip install -r requirements.txt`
3. Export env vars (or `.env`):
   - `DATABASE_URL=postgresql+psycopg://smart_presence:smart_presence@localhost:5432/smart_presence`
   - `REDIS_URL=redis://localhost:6379/0`
   - `SECRET_KEY=change-me`
4. Run: `uvicorn app.main:app --reload`

## Key endpoints (prefixed with `/api`)
- `POST /auth/login` password login
- `POST /auth/login/facial` facial login (stub)
- `POST /auth/enroll` enqueue embeddings (stub)
- CRUD: `/users`, `/sessions`, `/attendance`
- `/chatbot/ask` stub
- `/reports/attendance.{pdf,xlsx,csv}` stubs

## Notes
- DB schema is seeded via Docker Compose init scripts in `infra/db/init/001_schema.sql`.
- Attendance includes `percentage` and `justification` fields.
- Facial login is optional and decoupled from attendance; vector search to be wired later.
