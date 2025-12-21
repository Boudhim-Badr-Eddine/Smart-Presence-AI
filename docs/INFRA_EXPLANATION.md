# Infrastructure Explanation

SmartPresence runs via Docker Compose with four services:

- `postgres` (PostgreSQL + pgvector) on host `5432`
- `redis` on host `6380` (container port `6379`)
- `backend` (FastAPI) on host `8000`
- `frontend` (Next.js) on host `3000`

## Where it’s defined

- Compose file: `docker-compose.yml`
- Setup guide: `DOCKER_SETUP.md`
- Scripts: `scripts/README.md`

## Recommended workflow

- Start: `./scripts/start.sh`
- Seed demo accounts for testing: `./scripts/seed-demo.sh`
- Status: `./scripts/status.sh`
- Logs: `./scripts/logs.sh backend` / `./scripts/logs.sh frontend`
- Stop: `./scripts/stop.sh`
