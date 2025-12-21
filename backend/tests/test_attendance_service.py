import pytest
from datetime import datetime, timedelta
from decimal import Decimal

from app.models.attendance import AttendanceRecord
from app.models.student import Student
from app.models.user import User
from app.schemas.attendance import AttendanceCreate
from app.services.attendance import AttendanceService


@pytest.fixture
def test_student(db_session):
    """Create test student."""
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


def test_mark_attendance_creates_record(db_session, test_student):
    """Test marking attendance creates a new record."""
    payload = AttendanceCreate(
        session_id=1,
        student_id=test_student.id,
        status="present",
        marked_via="facial",
        facial_confidence=Decimal("0.95"),
    )
    
    record = AttendanceService.mark_attendance(db_session, 1, test_student.id, payload)
    
    assert record is not None
    assert record.student_id == test_student.id
    assert record.session_id == 1
    assert record.status == "present"
    assert record.marked_via == "facial"


def test_mark_attendance_returns_existing(db_session, test_student):
    """Test marking attendance returns existing record if already marked."""
    payload = AttendanceCreate(
        session_id=1,
        student_id=test_student.id,
        status="present",
    )
    
    # Mark first time
    record1 = AttendanceService.mark_attendance(db_session, 1, test_student.id, payload)
    
    # Mark second time
    record2 = AttendanceService.mark_attendance(db_session, 1, test_student.id, payload)
    
    assert record1.id == record2.id


def test_get_student_attendance_summary(db_session, test_student):
    """Test getting attendance summary for a student."""
    # Create attendance records
    for i in range(10):
        status = "present" if i < 8 else "absent"
        record = AttendanceRecord(
            session_id=i + 1,
            student_id=test_student.id,
            status=status,
            marked_at=datetime.utcnow() - timedelta(days=i),
        )
        db_session.add(record)
    db_session.commit()
    
    summary = AttendanceService.get_student_attendance_summary(db_session, test_student.id, days=30)
    
    assert summary["student_id"] == test_student.id
    assert summary["total_sessions"] == 10
    assert summary["present"] == 8
    assert summary["absent"] == 2
    assert summary["attendance_rate"] == 80.0
