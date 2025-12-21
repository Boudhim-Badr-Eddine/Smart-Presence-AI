"""Pytest fixtures for testing."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base


@pytest.fixture(scope="function")
def db_session():
    """Create a test database session."""
    # Use in-memory SQLite for tests
    engine = create_engine("sqlite:///:memory:")

    # Only create tables needed by unit tests.
    # Some production models use Postgres-only types (e.g., JSONB) which SQLite
    # cannot compile.
    from app.models.attendance import AttendanceRecord
    from app.models.notification import Notification
    from app.models.session import Session
    from app.models.student import Student
    from app.models.trainer import Trainer
    from app.models.user import User

    tables = [
        User.__table__,
        Trainer.__table__,
        Student.__table__,
        Session.__table__,
        AttendanceRecord.__table__,
        Notification.__table__,
    ]
    Base.metadata.create_all(engine, tables=tables)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(engine, tables=tables)


@pytest.fixture
def test_student(db_session):
    """Create a test student (imported by other test files)."""
    from app.models.student import Student
    from app.models.user import User
    
    user = User(
        username="teststudent",
        email="test@student.com",
        password_hash="hashed",
        role="student",
    )
    db_session.add(user)
    db_session.commit()
    
    student = Student(
        user_id=user.id,
        student_code="TEST001",
        first_name="Test",
        last_name="Student",
        email="test@student.com",
        class_name="CS101",
    )
    db_session.add(student)
    db_session.commit()
    return student
