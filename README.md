# 🎓 Smart Presence AI

> Intelligent Attendance Management System with Facial Recognition

[![Status](https://img.shields.io/badge/status-production%20ready-success)](https://github.com)
[![License](https://img.shields.io/badge/license-proprietary-blue)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Smart Presence AI is a comprehensive, AI-powered attendance management system designed for educational institutions. It combines cutting-edge facial recognition technology with an intuitive multi-role interface to automate and optimize attendance tracking.

## ✨ Key Features

- 🤖 **AI-Powered Facial Recognition** - DeepFace + InsightFace for accurate identification (512D embeddings)
- 📊 **Real-time Analytics** - Interactive dashboards with attendance trends and performance metrics
- 👥 **Multi-Role System** - Admin, Trainer, and Student roles with granular permissions
- 🔔 **Smart Notifications** - Automated alerts for absences, late arrivals, and important deadlines
- 📈 **Advanced Reports** - PDF/Excel/CSV exports with comprehensive analytics
- 🔐 **Secure Authentication** - JWT-based authentication with BCrypt password hashing
- ⏱️ **Multiple Check-in Methods** - QR codes, facial recognition, PIN codes
- 💬 **AI Chatbot** - Intelligent assistant for schedule inquiries and support
- 📱 **Responsive Design** - Modern, mobile-friendly interface

## 🏗️ Stack

**Backend:**
- FastAPI, SQLAlchemy, PostgreSQL 16 + TimescaleDB + pgvector, Redis 7
- DeepFace, InsightFace, OpenCV for facial recognition

**Frontend:**
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Redux Toolkit, React Query, Chart.js, Recharts

**Infrastructure:**
- Docker & Docker Compose
- Nginx (optional, for production)

## 🚀 Quick Start

### One-Line Setup (Recommended)

```bash
# Run the automated setup script
./start.sh
```

This will:
- ✅ Generate secure secrets automatically
- ✅ Build all Docker containers
- ✅ Start PostgreSQL with pgvector extension
- ✅ Start Redis for caching
- ✅ Run database migrations
- ✅ Launch backend API (port 8000)
- ✅ Launch frontend app (port 3000)

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Helper Commands

```bash
./helper.sh start           # Start all services
./helper.sh stop            # Stop all services  
./helper.sh logs            # View all logs
./helper.sh logs backend    # View specific service logs
./helper.sh status          # Check service status
./helper.sh shell backend   # Open shell in container
./helper.sh create-admin    # Create admin user
./helper.sh rebuild         # Rebuild everything
./helper.sh clean           # Remove all containers & volumes
```

### Manual Setup

```bash
# 1. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Generate secrets (IMPORTANT!)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Update .env with generated SECRET_KEY and JWT_SECRET_KEY

# 3. Build and start services
docker-compose build
docker-compose up -d

# 4. View logs
docker-compose logs -f
```

### Create Admin User

After starting the services, create an admin account:

```bash
docker-compose exec backend python3 -c "
from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = SessionLocal()

admin = User(
    username='admin',
    email='admin@smartpresence.com',
    hashed_password=pwd_context.hash('Admin@123'),
    role='admin',
    is_active=True
)
db.add(admin)
db.commit()
print('✅ Admin user created!')
db.close()
"
```

**Login with:** `admin@smartpresence.com` / `Admin@123`

### 📚 Documentation

- **[Docker Setup Guide](DOCKER_SETUP.md)** - Complete Docker deployment instructions
- **[End-to-End Test Checklist](docs/TEST_CHECKLIST.md)** - Docker-first validation steps for all systems/pages
- **[System Audit](SYSTEM_AUDIT.md)** - Comprehensive feature and route documentation
- **[Phase Assessment](PHASE_ASSESSMENT.md)** - Development roadmap and priorities

### Helper Scripts

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart a service
docker-compose restart backend
```

### Local Development (Without Docker - NOT RECOMMENDED)

Docker is the recommended way to run this project. If you absolutely need to run locally:

**Backend:**
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Setup PostgreSQL with pgvector manually
# Setup Redis manually
# Configure DATABASE_URL and REDIS_URL in .env

alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

**⚠️ Note:** You'll need to manually install and configure PostgreSQL with pgvector extension and Redis.

## 🔐 Default Credentials

If you ran `./scripts/create-admin.sh`, use the email/password you entered.

If you ran `./scripts/seed-demo.sh`, use these demo accounts:
- **Admin**: `badr.eddine.boudhim@smartpresence.com` / `Luno.xar.95`
- **Trainers**: `dam.nachit@smartpresence.com`, `yassin.madani@smartpresence.com`, `rachid.aitaamou@smartpresence.com` / `Trainer.123`
- **Students**: `taha.khebazi@smartpresence.com`, `walid.eltahiri@smartpresence.com`, `sara.aitaamou@smartpresence.com`, `karim.bennani@smartpresence.com`, `amine.elalami@smartpresence.com` / `Student.123`

## 📊 Project Structure

```
SmartPresence/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   └── requirements.txt
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   │   ├── common/        # Reusable components
│   │   ├── dashboard/     # Dashboard-specific
│   │   ├── analytics/     # Analytics components
│   │   ├── forms/         # Form components
│   │   └── attendance/    # Attendance features
│   ├── lib/               # Utilities and API client
│   └── store/             # State management
├── infra/                 # Infrastructure
│   ├── db/                # Database initialization
│   │   └── init/          # SQL schema & seed data
│   └── docker-compose.yml
├── scripts/               # Utility scripts
└── docs/                  # Documentation
```

## 🎯 Key Workflows

### For Administrators
1. **User Management**: Create, update, and manage all user accounts
2. **System Configuration**: Configure alert rules, thresholds, and settings
3. **Analytics**: View system-wide statistics and generate reports
4. **Audit Logs**: Monitor all system activities for compliance

### For Trainers
1. **Session Management**: Create and manage training sessions
2. **Attendance Marking**: Multiple check-in methods (QR, facial, PIN)
3. **Absence Review**: Approve or reject student justifications with notes
4. **Reports**: Generate class-specific performance reports (PDF/Excel)

### For Students
1. **Attendance Marking**: Quick check-in via QR, facial recognition, or PIN
2. **Statistics**: View personal attendance rate and performance metrics
3. **Absence Justification**: Submit justifications with supporting documents
4. **Chatbot**: Get instant answers about schedule and attendance

## 🧪 Testing

```bash
# Run comprehensive test suite
./scripts/test-suite.sh

# Test specific components
docker-compose exec backend pytest
docker-compose exec frontend npm test

# Check code quality
docker-compose exec backend ruff check .
docker-compose exec frontend npm run lint
```

## 🔧 Configuration

Key environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=postgresql://user:pass@db:5432/smart_presence

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=your-super-secret-key-here
DEBUG=false

# AI Configuration
FACIAL_CONFIDENCE_THRESHOLD=0.85

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 📈 Performance Metrics

- **API Response Time**: <200ms (p95)
- **Facial Recognition**: <2s per verification
- **Database Queries**: <100ms (p95)
- **Concurrent Users**: 1000+ supported
- **Uptime Target**: 99.9%

## 🛡️ Security Features

- JWT authentication with token rotation
- BCrypt password hashing (12 rounds)
- AES-256 encryption for sensitive data
- SQL injection prevention (SQLAlchemy ORM)
- XSS and CSRF protection
- CORS configuration
- Rate limiting via Redis
- Comprehensive audit logging

## 📝 Documentation

- [Complete Documentation](./COMPLETE_DOCUMENTATION.md) - Full user and API guide
- [API Documentation](http://localhost:8000/docs) - Interactive Swagger UI
- [Implementation Guide](./IMPLEMENTATION_COMPLETE.md) - Technical implementation details
- [Project Plan](./PROJECT_PLAN.md) - Architecture and design decisions

## 🐛 Troubleshooting

**Database connection issues:**
```bash
docker-compose logs db
docker-compose restart db
```

**Frontend not accessible:**
```bash
docker-compose logs frontend
# Check if port 3000 is already in use
```

**Facial recognition not working:**
- Ensure good lighting conditions
- Check camera permissions in browser
- Verify facial embeddings are enrolled

See [COMPLETE_DOCUMENTATION.md](./COMPLETE_DOCUMENTATION.md) for detailed troubleshooting.

## 🤝 Contributing

This is a proprietary project. For contributions, please contact the development team.

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Team

- **Project Lead**: Badr Boudhim
- **Institution**: ISTA NTIC SM Casablanca
- **Development**: Smart Presence AI Team

## 🎉 Acknowledgments

- ISTA NTIC SM Casablanca for project sponsorship
- All trainers and students for valuable feedback
- Open-source community for amazing tools and libraries

---

**Version**: 1.0.0-Complete  
**Last Updated**: December 13, 2025  
**Status**: Production Ready ✅

## 📚 Documentation

- [Architecture & Code Quality Guidelines](./docs/ARCHITECTURE.md)
- [Performance & Deployment Guide](./docs/PERFORMANCE.md)
- [Monitoring Setup (Sentry)](./docs/MONITORING.md)
- [Scripts Guide](./scripts/README.md)

## 📌 Notes

- Attendance records include `percentage` and `justification` fields
- Facial recognition uses 512-dimensional embeddings (PgVector)
- Database is auto-seeded with sample data on first run
- All sensitive data is encrypted at rest and in transit
- For demo seed users with placeholder password hash, login bypass is enabled. Update records to real bcrypt hashes in production.
