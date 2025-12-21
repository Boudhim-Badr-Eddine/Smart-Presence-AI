"""
Comprehensive seed script with new trainers, students, and controles data.
Run this after migration to populate the database with real data.
"""

from datetime import date, datetime, time, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.controle import Controle
from app.models.student import Student
from app.models.trainer import Trainer
from app.models.user import User
from app.services.auth import get_password_hash


def seed_comprehensive_data():
    """Seed database with comprehensive trainer, student, and controle data."""
    db = SessionLocal()
    
    try:
        print("🌱 Starting comprehensive data seeding...")
        
        # Seed trainers
        trainers_data = [
            {
                "username": "mehdi.ouafic",
                "email": "mehdi.ouafic@smartpresence.com",
                "first_name": "Mehdi",
                "last_name": "Ouafic",
                "specialization": "Web Development & Frontend",
                "years_experience": 8,
                "phone": "+212 6 12 34 56 01",
                "office_location": "Bureau 301",
                "education": "Master en Informatique",
                "certifications": "AWS Certified Developer, React Expert",
                "availability": "Lun-Ven: 9h-17h",
            },
            {
                "username": "ihssan.boudhim",
                "email": "ihssan.boudhim@smartpresence.com",
                "first_name": "Ihssan",
                "last_name": "Boudhim",
                "specialization": "Backend Development & Databases",
                "years_experience": 10,
                "phone": "+212 6 12 34 56 02",
                "office_location": "Bureau 302",
                "education": "Ingénieur Informatique",
                "certifications": "Python Professional, PostgreSQL Advanced",
                "availability": "Lun-Ven: 8h30-16h30",
            },
            {
                "username": "halima.bourhim",
                "email": "halima.bourhim@smartpresence.com",
                "first_name": "Halima",
                "last_name": "Bourhim",
                "specialization": "Mobile Development & UX/UI",
                "years_experience": 7,
                "phone": "+212 6 12 34 56 03",
                "office_location": "Bureau 303",
                "education": "Master en Design & Développement",
                "certifications": "Flutter Developer, UX Design Certified",
                "availability": "Lun-Ven: 10h-18h",
            },
        ]
        
        created_trainers = []
        for trainer_data in trainers_data:
            # Create user account
            existing_user = db.query(User).filter(User.email == trainer_data["email"]).first()
            if existing_user:
                user = existing_user
                print(f"✓ Trainer user exists: {trainer_data['email']}")
            else:
                user = User(
                    username=trainer_data["username"],
                    email=trainer_data["email"],
                    password_hash=get_password_hash("Trainer@123"),
                    role="trainer",
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"✓ Created trainer user: {trainer_data['email']}")
            
            # Create trainer profile
            existing_trainer = db.query(Trainer).filter(Trainer.user_id == user.id).first()
            if not existing_trainer:
                trainer = Trainer(
                    user_id=user.id,
                    first_name=trainer_data["first_name"],
                    last_name=trainer_data["last_name"],
                    email=trainer_data["email"],
                    phone=trainer_data["phone"],
                    specialization=trainer_data["specialization"],
                    years_experience=trainer_data["years_experience"],
                    office_location=trainer_data["office_location"],
                    education=trainer_data["education"],
                    certifications=trainer_data["certifications"],
                    availability=trainer_data["availability"],
                    status="active",
                    hire_date=date.today() - timedelta(days=365 * trainer_data["years_experience"]),
                )
                db.add(trainer)
                db.commit()
                db.refresh(trainer)
                created_trainers.append(trainer)
                print(f"✓ Created trainer profile: {trainer_data['first_name']} {trainer_data['last_name']}")
            else:
                # Update existing trainer with new fields
                for key, value in trainer_data.items():
                    if key not in ["username", "email"] and hasattr(existing_trainer, key):
                        setattr(existing_trainer, key, value)
                db.commit()
                created_trainers.append(existing_trainer)
                print(f"✓ Updated trainer profile: {trainer_data['first_name']} {trainer_data['last_name']}")
        
        # Seed students with complete information
        students_data = [
            {
                "username": "salma.elhessouni",
                "email": "salma.elhessouni@smartpresence.com",
                "first_name": "Salma",
                "last_name": "El Hessouni",
                "class_name": "FS202",
                "group_name": "A",
                "student_code": "FS202001",
                "phone": "+212 6 11 11 11 01",
                "date_of_birth": date(2003, 5, 15),
                "cin_number": "AB123456",
                "parent_name": "Mohammed El Hessouni",
                "parent_email": "m.elhessouni@gmail.com",
                "parent_phone": "+212 6 22 22 22 01",
                "parent_relationship": "Père",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2026, 6, 30),
            },
            {
                "username": "hajar.elaagal",
                "email": "hajar.elaagal@smartpresence.com",
                "first_name": "Hajar",
                "last_name": "El Aagal",
                "class_name": "FS202",
                "group_name": "A",
                "student_code": "FS202002",
                "phone": "+212 6 11 11 11 02",
                "date_of_birth": date(2003, 8, 22),
                "cin_number": "CD234567",
                "parent_name": "Fatima El Aagal",
                "parent_email": "f.elaagal@gmail.com",
                "parent_phone": "+212 6 22 22 22 02",
                "parent_relationship": "Mère",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2026, 6, 30),
            },
            {
                "username": "reda.lbeauguoss",
                "email": "reda.lbeauguoss@smartpresence.com",
                "first_name": "Reda",
                "last_name": "Lbeauguoss",
                "class_name": "FS202",
                "group_name": "B",
                "student_code": "FS202003",
                "phone": "+212 6 11 11 11 03",
                "date_of_birth": date(2003, 3, 10),
                "cin_number": "EF345678",
                "parent_name": "Ahmed Lbeauguoss",
                "parent_email": "a.lbeauguoss@gmail.com",
                "parent_phone": "+212 6 22 22 22 03",
                "parent_relationship": "Père",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2026, 6, 30),
            },
            {
                "username": "manaf.mohamed",
                "email": "manaf.mohamed@smartpresence.com",
                "first_name": "Manaf",
                "last_name": "Mohamed",
                "class_name": "FS202",
                "group_name": "B",
                "student_code": "FS202004",
                "phone": "+212 6 11 11 11 04",
                "date_of_birth": date(2003, 11, 5),
                "cin_number": "GH456789",
                "parent_name": "Khadija Mohamed",
                "parent_email": "k.mohamed@gmail.com",
                "parent_phone": "+212 6 22 22 22 04",
                "parent_relationship": "Mère",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2026, 6, 30),
            },
            {
                "username": "yasser.bounoiara",
                "email": "yasser.bounoiara@smartpresence.com",
                "first_name": "Yasser",
                "last_name": "Bounoiara",
                "class_name": "FS202",
                "group_name": "A",
                "student_code": "FS202005",
                "phone": "+212 6 11 11 11 05",
                "date_of_birth": date(2003, 7, 18),
                "cin_number": "IJ567890",
                "parent_name": "Hassan Bounoiara",
                "parent_email": "h.bounoiara@gmail.com",
                "parent_phone": "+212 6 22 22 22 05",
                "parent_relationship": "Père",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2026, 6, 30),
            },
            {
                "username": "adam.benali",
                "email": "adam.benali@smartpresence.com",
                "first_name": "Adam",
                "last_name": "Benali",
                "class_name": "FS201",
                "group_name": "A",
                "student_code": "FS201001",
                "phone": "+212 6 11 11 11 06",
                "date_of_birth": date(2004, 2, 14),
                "cin_number": "KL678901",
                "parent_name": "Rachid Benali",
                "parent_email": "r.benali@gmail.com",
                "parent_phone": "+212 6 22 22 22 06",
                "parent_relationship": "Père",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2027, 6, 30),
            },
            {
                "username": "yasmine.idrissi",
                "email": "yasmine.idrissi@smartpresence.com",
                "first_name": "Yasmine",
                "last_name": "Idrissi",
                "class_name": "FS201",
                "group_name": "A",
                "student_code": "FS201002",
                "phone": "+212 6 11 11 11 07",
                "date_of_birth": date(2004, 6, 9),
                "cin_number": "MN789012",
                "parent_name": "Laila Idrissi",
                "parent_email": "l.idrissi@gmail.com",
                "parent_phone": "+212 6 22 22 22 07",
                "parent_relationship": "Mère",
                "enrollment_date": date(2024, 9, 1),
                "expected_graduation": date(2027, 6, 30),
            },
            {
                "username": "omar.el.fassi",
                "email": "omar.elfassi@smartpresence.com",
                "first_name": "Omar",
                "last_name": "El Fassi",
                "class_name": "FS203",
                "group_name": "C",
                "student_code": "FS203001",
                "phone": "+212 6 11 11 11 08",
                "date_of_birth": date(2002, 12, 25),
                "cin_number": "OP890123",
                "parent_name": "Samira El Fassi",
                "parent_email": "s.elfassi@gmail.com",
                "parent_phone": "+212 6 22 22 22 08",
                "parent_relationship": "Mère",
                "enrollment_date": date(2023, 9, 1),
                "expected_graduation": date(2025, 6, 30),
            },
        ]
        
        created_students = []
        for student_data in students_data:
            # Create user account
            existing_user = db.query(User).filter(User.email == student_data["email"]).first()
            if existing_user:
                user = existing_user
                print(f"✓ Student user exists: {student_data['email']}")
            else:
                user = User(
                    username=student_data["username"],
                    email=student_data["email"],
                    password_hash=get_password_hash("Student@123"),
                    role="student",
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"✓ Created student user: {student_data['email']}")
            
            # Create/update student profile
            existing_student = db.query(Student).filter(Student.user_id == user.id).first()
            if not existing_student:
                student = Student(
                    user_id=user.id,
                    student_code=student_data["student_code"],
                    first_name=student_data["first_name"],
                    last_name=student_data["last_name"],
                    email=student_data["email"],
                    phone=student_data["phone"],
                    date_of_birth=student_data["date_of_birth"],
                    cin_number=student_data["cin_number"],
                    parent_name=student_data["parent_name"],
                    parent_email=student_data["parent_email"],
                    parent_phone=student_data["parent_phone"],
                    parent_relationship=student_data["parent_relationship"],
                    class_name=student_data["class_name"],
                    group_name=student_data["group_name"],
                    enrollment_date=student_data["enrollment_date"],
                    expected_graduation=student_data["expected_graduation"],
                    academic_status="active",
                    total_absence_hours=0,
                    total_late_minutes=0,
                    attendance_rate=100.0,
                    alert_level="none",
                    alert_sent=False,
                    facial_data_encoded=False,
                )
                db.add(student)
                db.commit()
                db.refresh(student)
                created_students.append(student)
                print(f"✓ Created student: {student_data['first_name']} {student_data['last_name']}")
            else:
                # Update existing student with new fields
                for key, value in student_data.items():
                    if key not in ["username", "email"] and hasattr(existing_student, key):
                        setattr(existing_student, key, value)
                db.commit()
                created_students.append(existing_student)
                print(f"✓ Updated student: {student_data['first_name']} {student_data['last_name']}")
        
        # Seed Controles
        today = date.today()
        controles_data = [
            {
                "module": "Développement Web Avancé",
                "date": today + timedelta(days=7),
                "class_name": "FS202",
                "title": "Contrôle React & Node.js",
                "description": "Contrôle sur React hooks et API REST avec Node.js",
                "duration_minutes": 120,
                "trainer_id": created_trainers[0].id if created_trainers else None,
                "notified": False,
            },
            {
                "module": "Base de Données",
                "date": today + timedelta(days=10),
                "class_name": "FS202",
                "title": "Contrôle SQL & PostgreSQL",
                "description": "Requêtes SQL avancées et optimisation",
                "duration_minutes": 90,
                "trainer_id": created_trainers[1].id if len(created_trainers) > 1 else None,
                "notified": False,
            },
            {
                "module": "Mobile Development",
                "date": today + timedelta(days=14),
                "class_name": "FS202",
                "title": "Contrôle Flutter",
                "description": "Développement d'applications mobiles avec Flutter",
                "duration_minutes": 120,
                "trainer_id": created_trainers[2].id if len(created_trainers) > 2 else None,
                "notified": False,
            },
            {
                "module": "Algorithmique",
                "date": today + timedelta(days=5),
                "class_name": "FS201",
                "title": "Contrôle Structures de Données",
                "description": "Arbres, graphes et algorithmes de tri",
                "duration_minutes": 90,
                "trainer_id": created_trainers[0].id if created_trainers else None,
                "notified": False,
            },
            {
                "module": "Sécurité Informatique",
                "date": today + timedelta(days=20),
                "class_name": "FS203",
                "title": "Contrôle Cryptographie",
                "description": "Chiffrement et sécurité des applications",
                "duration_minutes": 120,
                "trainer_id": created_trainers[1].id if len(created_trainers) > 1 else None,
                "notified": False,
            },
        ]
        
        for controle_data in controles_data:
            existing_controle = db.query(Controle).filter(
                Controle.module == controle_data["module"],
                Controle.date == controle_data["date"],
                Controle.class_name == controle_data["class_name"],
            ).first()
            
            if not existing_controle:
                controle = Controle(**controle_data)
                db.add(controle)
                db.commit()
                print(f"✓ Created controle: {controle_data['title']}")
            else:
                print(f"✓ Controle exists: {controle_data['title']}")
        
        print("\n✅ Comprehensive data seeding completed successfully!")
        print(f"✓ Trainers: {len(created_trainers)}")
        print(f"✓ Students: {len(created_students)}")
        print(f"✓ Controles: {len(controles_data)}")
        
    except Exception as e:
        print(f"❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_comprehensive_data()
