from __future__ import annotations

import os
from datetime import date, time
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.attendance import AttendanceRecord
from app.models.notification import Notification
from app.models.session import Session as SessionModel
from app.models.smart_attendance import AttendanceSession
from app.models.student import Student
from app.models.trainer import Trainer
from app.models.user import User
from app.services.auth import get_password_hash


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def upsert_user(db: Session, *, email: str, username: str, role: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Keep it deterministic: reset password/role on reseed.
        user.username = username
        user.role = role
        user.is_active = True
        user.is_deleted = False
        user.password_hash = get_password_hash(password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    user = User(
        username=username,
        email=email,
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
        is_deleted=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_admin(db: Session) -> User:
    # Login UI uses email; "badr eddine boudhim" is represented in the username.
    return upsert_user(
        db,
        email="badr.eddine.boudhim@smartpresence.com",
        username="badr.eddine.boudhim",
        role="admin",
        password="Luno.xar.95",
    )


def seed_trainers(db: Session) -> list[User]:
    trainers = [
        ("dam.nachit@smartpresence.com", "dam.nachit", "Trainer.123"),
        ("yassin.madani@smartpresence.com", "yassin.madani", "Trainer.123"),
        ("rachid.aitaamou@smartpresence.com", "rachid.aitaamou", "Trainer.123"),
    ]

    out: list[User] = []
    for email, username, password in trainers:
        u = upsert_user(db, email=email, username=username, role="trainer", password=password)
        out.append(u)

        first, last = username.split(".", 1)
        tr = db.query(Trainer).filter(Trainer.user_id == u.id).first()
        if not tr:
            tr = Trainer(
                user_id=u.id,
                first_name=first.capitalize(),
                last_name=last.capitalize(),
                email=email,
                specialization="Software Engineering",
                years_experience=5,
                status="active",
            )
            db.add(tr)
            db.commit()

    return out


def seed_students(db: Session) -> list[Student]:
    students = [
        ("taha.khebazi@smartpresence.com", "taha.khebazi", "Student.123", "DEV101"),
        ("walid.eltahiri@smartpresence.com", "walid.eltahiri", "Student.123", "DEV101"),
        ("sara.aitaamou@smartpresence.com", "sara.aitaamou", "Student.123", "DEV101"),
        ("karim.bennani@smartpresence.com", "karim.bennani", "Student.123", "DEV101"),
        ("amine.elalami@smartpresence.com", "amine.elalami", "Student.123", "DEV102"),
    ]

    out: list[Student] = []
    for email, username, password, class_name in students:
        u = upsert_user(db, email=email, username=username, role="student", password=password)

        first, last = username.split(".", 1)
        st = db.query(Student).filter(Student.user_id == u.id).first()
        if not st:
            st = Student(
                user_id=u.id,
                student_code=f"STU{u.id:04d}",
                first_name=first.capitalize(),
                last_name=last.capitalize(),
                email=email,
                class_name=class_name,
                group_name="A",
                academic_status="active",
                attendance_rate=100.0,
                facial_data_encoded=False,
                is_deleted=False,
            )
            db.add(st)
            db.commit()
            db.refresh(st)
        else:
            st.first_name = first.capitalize()
            st.last_name = last.capitalize()
            st.class_name = class_name
            st.group_name = st.group_name or "A"
            st.academic_status = st.academic_status or "active"
            st.is_deleted = False
            db.add(st)
            db.commit()

        out.append(st)

    return out


def seed_sessions_and_attendance(db: Session, trainers: list[User], students: list[Student]) -> None:
    sessions: list[SessionModel] = []
    for idx, tr_user in enumerate(trainers, start=1):
        s = SessionModel(
            module_id=100 + idx,
            trainer_id=tr_user.id,
            classroom_id=200 + idx,
            session_date=date.today(),
            start_time=time(9 + idx, 0),
            end_time=time(10 + idx, 30),
            title=f"Module {100 + idx}",
            topic="Développement Web",
            class_name="DEV101",
            status="scheduled",
            attendance_marked=False,
            is_deleted=False,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        sessions.append(s)

    # Mark attendance for the first session
    if sessions:
        session_id = sessions[0].id

        # Ensure Smart Attendance config exists for the first session
        existing = db.query(AttendanceSession).filter(AttendanceSession.session_id == session_id).first()
        if not existing:
            db.add(
                AttendanceSession(
                    session_id=session_id,
                    mode="self_checkin",
                    checkin_window_minutes=15,
                    location_verification_enabled=False,
                    allowed_radius_meters=100,
                )
            )
            db.commit()

        for i, st in enumerate(students):
            status = "present" if i % 2 == 0 else "absent"
            ar = AttendanceRecord(
                session_id=session_id,
                student_id=st.id,
                status=status,
                marked_via="manual",
                percentage=100.0 if status == "present" else 0.0,
                is_deleted=False,
            )
            db.add(ar)
        db.commit()


def seed_notifications(db: Session, users: list[User]) -> None:
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


def seed_storage_dirs() -> None:
    # Ensure storage dirs exist in containers (mounted volumes)
    ensure_dir(Path(os.getenv("FACE_STORAGE_DIR", "/app/storage/faces")))
    ensure_dir(Path(os.getenv("ADMIN_MESSAGES_DIR", "/app/storage/admin_messages")))


def main() -> None:
    seed_storage_dirs()

    db = SessionLocal()
    try:
        admin = seed_admin(db)
        trainers = seed_trainers(db)
        students = seed_students(db)
        seed_sessions_and_attendance(db, trainers, students)
        seed_notifications(db, [admin, *trainers])
        print(
            "Seed mini complete: admin_email={}, trainers={}, students={}".format(
                admin.email, len(trainers), len(students)
            )
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
