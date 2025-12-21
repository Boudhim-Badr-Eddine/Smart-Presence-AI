import os
from datetime import date, time
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord
from app.models.notification import Notification
from app.models.session import Session as SessionModel
from app.models.student import Student
from app.models.trainer import Trainer
from app.models.user import User
from app.services.auth import get_password_hash
from app.services.facial import enroll_user_faces


def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)
    return path


def seed_users(db: Session):
    trainers = [
        ("dam", "nachit", "dam.nachit@smartpresence.com"),
        ("yassin", "madani", "yassin.madani@smartpresence.com"),
        ("rachid", "aitaamou", "rachid.aitaamou@smartpresence.com"),
    ]

    created_trainers: list[User] = []
    for first, last, email in trainers:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            created_trainers.append(existing)
            continue
        user = User(
            username=f"{first}.{last}",
            email=email,
            password_hash=get_password_hash("Trainer.123"),
            role="trainer",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created_trainers.append(user)

        # Optional trainer profile row
        trainer_row = Trainer(
            user_id=user.id,
            first_name=first.capitalize(),
            last_name=last.capitalize(),
            email=email,
            specialization="Software Engineering",
            years_experience=5,
            status="active",
        )
        db.add(trainer_row)
        db.commit()

    students = [
        ("taha", "khebazi", "taha.khebazi@smartpresence.com", "DEV101"),
        ("walid", "eltahiri", "walid.eltahiri@smartpresence.com", "DEV101"),
        ("sara", "aitaamou", "sara.aitaamou@smartpresence.com", "DEV101"),
        ("karim", "bennani", "karim.bennani@smartpresence.com", "DEV101"),
        ("amine", "elalami", "amine.elalami@smartpresence.com", "DEV102"),
    ]

    created_students: list[Student] = []
    for first, last, email, cls in students:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            user = existing
        else:
            user = User(
                username=f"{first}.{last}",
                email=email,
                password_hash=get_password_hash("Student.123"),
                role="student",
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Student row
        st_row = db.query(Student).filter(Student.user_id == user.id).first()
        if not st_row:
            st_row = Student(
                user_id=user.id,
                student_code=f"STU{user.id:04d}",
                first_name=first.capitalize(),
                last_name=last.capitalize(),
                email=email,
                class_name=cls,
                group_name="A",
                academic_status="active",
                attendance_rate=100.0,
                facial_data_encoded=False,
            )
            db.add(st_row)
            db.commit()
            db.refresh(st_row)
        created_students.append(st_row)

    return created_trainers, created_students


def seed_sessions_and_attendance(db: Session, trainers: list[User], students: list[Student]):
    # Create one session per trainer today
    sessions: list[SessionModel] = []
    for idx, tr_user in enumerate(trainers, start=1):
        s = SessionModel(
            module_id=100 + idx,
            trainer_id=tr_user.id,
            classroom_id=200 + idx,
            session_date=date.today(),
            start_time=time(9 + idx, 0),
            end_time=time(10 + idx, 30),
            title=f"Module {100+idx}",
            topic="Développement Web",
            class_name="DEV101",
            status="scheduled",
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        sessions.append(s)

    # Mark attendance for first session
    if sessions:
        session_id = sessions[0].id
        for i, st in enumerate(students):
            status = "present" if i % 2 == 0 else "absent"
            ar = AttendanceRecord(
                session_id=session_id,
                student_id=st.id,
                status=status,
                marked_via="manual",
                percentage=100.0 if status == "present" else 0.0,
            )
            db.add(ar)
        db.commit()


def seed_notifications(db: Session, users: list[User]):
    for u in users:
        n = Notification(
            user_id=u.id,
            user_type=u.role,
            title="Bienvenue",
            message="Votre compte a été créé avec succès.",
            notification_type="info",
            priority="low",
            read=False,
            delivered=True,
            delivery_method="in_app",
            delivery_status="sent",
        )
        db.add(n)
    db.commit()


def seed_faces(db: Session, students: list[Student]):
    """Create placeholder face images and enroll embeddings for first student."""
    try:
        from PIL import Image, ImageDraw
    except Exception:
        return

    if not students:
        return
    student = students[0]
    user_id = student.user_id

    base = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage/faces")) / str(user_id)
    ensure_dir(base)

    images = []
    for i, color in enumerate([(240, 240, 240), (220, 220, 230), (230, 220, 220)], start=1):
        img = Image.new("RGB", (160, 160), color)
        d = ImageDraw.Draw(img)
        d.ellipse((40, 40, 120, 120), outline=(80, 80, 80), width=2)
        path = base / f"capture_{i}.jpg"
        img.save(path, format="JPEG", quality=90)
        images.append((str(path), path.read_bytes()))

    # Enroll embeddings
    enroll_user_faces(db, user_id, images)

    # Mark student as encoded
    student.facial_data_encoded = True
    db.add(student)
    db.commit()


def main():
    db = SessionLocal()
    try:
        trainers, students = seed_users(db)
        seed_sessions_and_attendance(db, trainers, students)
        seed_notifications(db, [t for t in trainers])
        seed_faces(db, students)
        print("Seed complete: trainers={}, students={}".format(len(trainers), len(students)))
    finally:
        db.close()


if __name__ == "__main__":
    main()