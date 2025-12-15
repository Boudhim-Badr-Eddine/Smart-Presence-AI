# 🐳 SmartPresence Docker Setup Guide

## Quick Start

### 1. Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### 2. Initial Setup

```bash
# Clone the repository (if not already done)
cd /home/luno-xar/SmartPresence

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env file and set strong secrets
# IMPORTANT: Change SECRET_KEY and JWT_SECRET_KEY in production!
nano .env
```

### 3. Generate Strong Secrets

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

Update your `.env` file with these generated keys.

### 4. Build and Start Services

```bash
# Build all containers
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 5. Verify Installation

The services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 6. Database Migrations

Migrations run automatically on backend startup. To run manually:

```bash
# Access backend container
docker-compose exec backend bash

# Run migrations
alembic upgrade head

# Exit container
exit
```

### 7. Create Admin User

```bash
# Access backend container
docker-compose exec backend bash

# Run Python shell
python3 -c "
from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = SessionLocal()

# Create admin user
admin = User(
    username='admin',
    email='admin@smartpresence.com',
    hashed_password=pwd_context.hash('Admin@123'),
    role='admin',
    is_active=True
)
db.add(admin)
db.commit()
print('Admin user created successfully!')
db.close()
"
```

## 🔧 Development Workflow

### Hot Reload
Both frontend and backend support hot reload in development mode:
- **Backend**: File changes auto-reload via `--reload` flag
- **Frontend**: Next.js Fast Refresh enabled

### Accessing Containers

```bash
# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh

# PostgreSQL shell
docker-compose exec postgres psql -U postgres -d smartpresence

# Redis CLI
docker-compose exec redis redis-cli
```

### Managing Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart specific service
docker-compose restart backend

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

## 📦 Production Deployment

### 1. Update Environment Variables

Edit `.env` for production:

```env
DB_PASSWORD=<strong-random-password>
SECRET_KEY=<strong-random-key-min-32-chars>
JWT_SECRET_KEY=<strong-random-jwt-key-min-32-chars>
```

### 2. Use Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    restart: always
    
  redis:
    restart: always
    
  backend:
    restart: always
    environment:
      - NODE_ENV=production
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
    
  frontend:
    restart: always
    build:
      context: ./frontend
      target: runner
    command: node server.js
```

Start with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Enable HTTPS

Use a reverse proxy (Nginx/Traefik) with Let's Encrypt:

```nginx
server {
    listen 443 ssl http2;
    server_name smartpresence.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🎯 InsightFace Model Setup

The InsightFace model downloads automatically on first use. To pre-download:

```bash
# Access backend container
docker-compose exec backend bash

# Download model
python3 -c "
from insightface.app import FaceAnalysis
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)
print('Model downloaded successfully!')
"
```

For GPU support, modify `backend/Dockerfile`:
- Change base image to `python:3.11-cuda11.8` or similar
- Add CUDA dependencies

## 🧪 Testing

```bash
# Run backend tests
docker-compose exec backend pytest

# Run frontend tests
docker-compose exec frontend npm test

# E2E tests
docker-compose exec frontend npx playwright test
```

## 📊 Monitoring & Logs

```bash
# View all logs
docker-compose logs -f

# View logs since last hour
docker-compose logs --since 1h

# View logs with timestamps
docker-compose logs -f -t

# Export logs
docker-compose logs > docker-logs.txt
```

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify pgvector extension
docker-compose exec postgres psql -U postgres -d smartpresence -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

### Backend Not Starting
```bash
# Check dependencies
docker-compose exec backend pip list

# Run migrations manually
docker-compose exec backend alembic upgrade head

# Check database connectivity
docker-compose exec backend python3 -c "from app.database import engine; print(engine.connect())"
```

### Frontend Build Errors
```bash
# Clear Next.js cache
docker-compose exec frontend rm -rf .next

# Reinstall dependencies
docker-compose exec frontend npm ci --legacy-peer-deps

# Rebuild
docker-compose restart frontend
```

## 📁 Volume Management

Data is persisted in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis persistence
- `upload_data`: User uploads and avatars

### Backup Database
```bash
# Backup
docker-compose exec postgres pg_dump -U postgres smartpresence > backup.sql

# Restore
docker-compose exec -T postgres psql -U postgres smartpresence < backup.sql
```

### Backup Volumes
```bash
# Backup uploads
docker run --rm -v smartpresence_upload_data:/data -v $(pwd):/backup ubuntu tar czf /backup/uploads-backup.tar.gz /data
```

## 🚀 Performance Optimization

### Enable Redis Caching
Already configured! Just ensure `REDIS_URL` is set in `.env`.

### Database Connection Pooling
Configure in `backend/app/database.py`:
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True
)
```

### Horizontal Scaling
```bash
# Scale backend workers
docker-compose up -d --scale backend=3

# Add load balancer (Nginx/HAProxy)
```

## 🔐 Security Checklist

- ✅ Change all default passwords
- ✅ Use strong SECRET_KEY and JWT_SECRET_KEY
- ✅ Enable HTTPS in production
- ✅ Configure firewall (only expose 80/443)
- ✅ Regular security updates: `docker-compose pull`
- ✅ Enable PostgreSQL SSL
- ✅ Implement rate limiting (backend middleware)
- ✅ Regular backups

## 📖 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL + Docker](https://hub.docker.com/_/postgres)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

---

**Need Help?** Check the logs first: `docker-compose logs -f`
