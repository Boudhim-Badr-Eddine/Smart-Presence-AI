#!/bin/bash
# Setup script for Controles feature
# This script runs migrations and seeds comprehensive data

set -e

echo "🚀 Setting up Controles feature..."

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

echo "📦 Running database migrations..."
python -m alembic upgrade head

echo "🌱 Seeding comprehensive data (trainers, students, controles)..."
python -m app.scripts.seed_comprehensive

echo "✅ Setup complete!"
echo ""
echo "📋 What was added:"
echo "  - Controles table (for tests/exams)"
echo "  - Enhanced trainer profiles (education, certifications, etc.)"
echo "  - New trainers: Mehdi Ouafic, Ihssan Boudhim, Halima Bourhim"
echo "  - New students: Salma, Hajar, Reda, Manaf, Yasser, and more"
echo "  - Sample controles for different classes"
echo ""
echo "🔐 Login credentials:"
echo "  Trainers: {firstname}.{lastname}@smartpresence.com / Trainer@123"
echo "  Students: {firstname}.{lastname}@smartpresence.com / Student@123"
echo ""
echo "📡 API Endpoints:"
echo "  GET    /api/controles - List all controles"
echo "  POST   /api/controles - Create new controle (admin/trainer)"
echo "  GET    /api/controles/{id} - Get specific controle"
echo "  PUT    /api/controles/{id} - Update controle (admin/trainer)"
echo "  DELETE /api/controles/{id} - Delete controle (admin)"
echo "  POST   /api/controles/{id}/notify - Send notifications (admin/trainer)"
echo "  GET    /api/controles/upcoming/week - Get upcoming controles"
