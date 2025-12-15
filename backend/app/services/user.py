from sqlalchemy.orm import Session
from app.models.user import User
from app.models.student import Student
from app.models.trainer import Trainer
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth import get_password_hash
from typing import List, Optional


class UserService:
    """Service layer for user management."""

    @staticmethod
    def create_user(db: Session, payload: UserCreate) -> User:
        """Create a new user (admin only)."""
        # Check if user exists
        existing = db.query(User).filter(
            (User.email == payload.email) | (User.username == payload.username)
        ).first()
        if existing:
            return None

        hashed_password = get_password_hash(payload.password)
        user = User(
            username=payload.username,
            email=payload.email,
            password_hash=hashed_password,
            role=payload.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_all_users(db: Session, role: Optional[str] = None, limit: int = 100) -> List[User]:
        """Get all users, optionally filtered by role."""
        query = db.query(User)
        if role:
            query = query.filter(User.role == role)
        return query.limit(limit).all()

    @staticmethod
    def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
        """Update user details."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        if payload.email and payload.email != user.email:
            existing = db.query(User).filter(User.email == payload.email).first()
            if existing:
                return None
            user.email = payload.email

        if payload.username and payload.username != user.username:
            existing = db.query(User).filter(User.username == payload.username).first()
            if existing:
                return None
            user.username = payload.username

        if payload.is_active is not None:
            user.is_active = payload.is_active

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete a user (soft delete by setting is_active=False)."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.is_active = False
        db.commit()
        return True

    @staticmethod
    def get_students(db: Session, limit: int = 100) -> List[Student]:
        """Get all students."""
        return db.query(Student).limit(limit).all()

    @staticmethod
    def get_student_by_id(db: Session, student_id: int) -> Student:
        """Get student by ID."""
        return db.query(Student).filter(Student.id == student_id).first()

    @staticmethod
    def get_students_by_class(db: Session, class_name: str) -> List[Student]:
        """Get all students in a class."""
        return db.query(Student).filter(getattr(Student, "class") == class_name).all()

    @staticmethod
    def update_student_alert_level(db: Session, student_id: int, level: str):
        """Update student alert level based on absence hours."""
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return None

        if student.total_absence_hours >= 20:
            student.alert_level = "critical"
        elif student.total_absence_hours >= 10:
            student.alert_level = "high"
        elif student.total_absence_hours >= 5:
            student.alert_level = "medium"
        else:
            student.alert_level = "low"

        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def get_trainers(db: Session, limit: int = 100) -> List[Trainer]:
        """Get all trainers."""
        return db.query(Trainer).limit(limit).all()

    @staticmethod
    def get_trainer_by_id(db: Session, trainer_id: int) -> Trainer:
        """Get trainer by ID."""
        return db.query(Trainer).filter(Trainer.id == trainer_id).first()
