# SmartPresence Scripts Guide

This folder contains helper scripts to manage your SmartPresence application. All scripts are designed to work with Docker and should be run from the project root or scripts directory.

## 🚀 Core Scripts

### `start.sh`
**Purpose:** Start all Docker services (PostgreSQL, Redis, Backend, Frontend)

**Usage:**
```bash
./scripts/start.sh
```

**What it does:**
- Starts all containers in detached mode
- Shows colored output for service status
- Displays access URLs when complete:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/docs

**When to use:** First time starting the app, or after stopping services

---

### `stop.sh`
**Purpose:** Stop all Docker services

**Usage:**
```bash
./scripts/stop.sh
```

**What it does:**
- Stops all running containers
- Prompts to remove volumes (database data)
- Choose `y` to completely reset, `n` to preserve data

**When to use:** When you're done working, or need to restart fresh

---

### `status.sh`
**Purpose:** Check health and status of all services

**Usage:**
```bash
./scripts/status.sh
```

**What it does:**
- Shows container status (Up/Down)
- Checks port availability (3000, 8000, 5432, 6379)
- Tests health endpoints for frontend and backend
- Verifies PostgreSQL and Redis connectivity

**When to use:** Troubleshooting issues, verifying services are running correctly

---

### `logs.sh`
**Purpose:** View logs from services

**Usage:**
```bash
# View all logs (follows in real-time)
./scripts/logs.sh

# View specific service logs
./scripts/logs.sh backend
./scripts/logs.sh frontend
./scripts/logs.sh postgres
./scripts/logs.sh redis
```

**What it does:**
- Shows container logs with timestamps
- Follows logs in real-time (Ctrl+C to exit)
- Filter by specific service if needed

**When to use:** Debugging errors, monitoring application behavior

---

### `shell.sh`
**Purpose:** Open interactive shell in containers

**Usage:**
```bash
# Backend shell (bash)
./scripts/shell.sh backend

# Frontend shell (sh)
./scripts/shell.sh frontend

# PostgreSQL shell (psql)
./scripts/shell.sh postgres

# Redis shell (redis-cli)
./scripts/shell.sh redis
```

**What it does:**
- Opens interactive terminal inside container
- Backend: Bash shell (run Python commands, alembic migrations)
- Frontend: Shell (run npm commands, inspect files)
- PostgreSQL: psql CLI (run SQL queries)
- Redis: redis-cli (inspect cache)

**When to use:** Running database migrations, debugging, inspecting data

**Example workflows:**
```bash
# Run database migrations
./scripts/shell.sh backend
# Inside container:
alembic upgrade head
exit

# Check Redis cache
./scripts/shell.sh redis
# Inside redis-cli:
KEYS *
GET some_key
exit
```

---

## 👤 User Management

### `create-admin.sh`
**Purpose:** Create an admin user account

**Usage:**
```bash
./scripts/create-admin.sh
```

**What it does:**
- Prompts for email and password
- Creates admin user in database with hashed password
- Checks for duplicates before creating

**When to use:** First-time setup, creating new admin accounts

**Example:**
```bash
./scripts/create-admin.sh
Enter admin email: admin@example.com
Enter admin password: ********
✓ Admin user created successfully
```

---

## 🔧 Development Scripts

### `format.sh`
**Purpose:** Auto-format code (Black for Python, Prettier for TypeScript/React)

**Usage:**
```bash
./scripts/format.sh
```

**What it does:**
- Formats backend Python code with Black
- Formats frontend TypeScript/React code with Prettier
- Fixes indentation, quotes, spacing automatically

**When to use:** Before committing code, maintaining code style consistency

---

### `lint.sh`
**Purpose:** Lint code and check for errors (Ruff for Python, ESLint for TypeScript/React)

**Usage:**
```bash
./scripts/lint.sh
```

**What it does:**
- Lints backend Python code with Ruff (auto-fixes issues)
- Lints frontend TypeScript/React code with ESLint
- Reports code quality issues and potential bugs

**When to use:** Before committing, during code review, CI/CD pipeline
### `test.sh`
**Purpose:** Run automated tests (pytest for backend, jest for frontend)

**Usage:**
```bash
# Run all tests
./scripts/test.sh

# Run backend tests only
./scripts/test.sh backend

./scripts/test.sh frontend
```

**What it does:**
- Runs pytest test suite for backend
- Runs jest test suite for frontend
- Shows pass/fail status with colored output

**When to use:** Before merging code, verifying changes don't break existing functionality

### First-Time Setup
```bash
# 1. Start services

# 2. Wait for services to be ready (check status)
./scripts/status.sh

# 3. Create admin account
./scripts/create-admin.sh

# 4. Access application
# Frontend: http://localhost:3000
# Backend API Docs: http://localhost:8000/docs
```

### Daily Development
```bash
# Start work
./scripts/start.sh
./scripts/logs.sh backend  # Monitor backend logs

# Make code changes...

# Format and lint before commit
./scripts/format.sh
./scripts/lint.sh

# Run tests
./scripts/test.sh

# Stop when done
./scripts/stop.sh
```

### Debugging Issues
```bash
# Check service status
./scripts/status.sh

# View logs for errors
./scripts/logs.sh backend
./scripts/logs.sh frontend

# Open shell to investigate
./scripts/shell.sh backend

# Check database
./scripts/shell.sh postgres
# Inside psql:
\dt  # List tables
SELECT * FROM users LIMIT 5;
```

### Database Migrations
```bash
# Create new migration
./scripts/shell.sh backend
alembic revision --autogenerate -m "add new column"

# Apply migration
alembic upgrade head
exit

# Verify migration
./scripts/shell.sh postgres
\d users  # Describe users table
```

### Reset Everything
```bash
# Stop and remove all data
./scripts/stop.sh
# Choose 'y' when prompted to remove volumes

# Start fresh
./scripts/start.sh
./scripts/create-admin.sh
```

---

## 🛠️ Troubleshooting

### Services won't start
```bash
# Check what's running
docker-compose ps

# Check logs for errors
./scripts/logs.sh

# Try stopping and starting fresh
./scripts/stop.sh
./scripts/start.sh
```

### Port already in use
```bash
# Check what's using ports
sudo lsof -i :3000  # Frontend
sudo lsof -i :8000  # Backend
sudo lsof -i :5432  # PostgreSQL
sudo lsof -i :6379  # Redis

# Kill the process or change ports in .env file
```

### Database connection errors
```bash
# Check PostgreSQL is running
./scripts/status.sh

# Check database logs
./scripts/logs.sh postgres

# Verify connection from backend
./scripts/shell.sh backend
python -c "from app.core.database import engine; print(engine)"
```

### Can't access frontend/backend
```bash
# Verify services are up
./scripts/status.sh

# Check if ports are accessible
curl http://localhost:3000
curl http://localhost:8000/health

# Check firewall settings
sudo ufw status
```

---

## 📝 Notes

- All scripts assume Docker and Docker Compose are installed and running
- Scripts use ANSI colors for better readability (green = success, red = error, yellow = warning)
- Scripts are executable (`chmod +x` has been applied)
- Run scripts from project root or scripts directory
- Environment variables are loaded from `.env` file in project root

---

## 🔗 Related Documentation

- [Docker Setup Guide](../DOCKER_SETUP.md) - Detailed Docker configuration
- [Infrastructure Explanation](../docs/INFRA_EXPLANATION.md) - How the infrastructure works
- [Launch Checklist](../LAUNCH_CHECKLIST.md) - Pre-production testing guide

---

**Need help?** Check logs with `./scripts/logs.sh` or service status with `./scripts/status.sh`
