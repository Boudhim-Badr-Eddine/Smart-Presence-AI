import pytest
from app.services.export import ExportService
from app.models.attendance import AttendanceRecord
from app.models.session import Session as CourseSession
from app.models.student import Student
from app.models.user import User
from datetime import datetime


@pytest.fixture
def test_session(db_session):
    """Create a test course session."""
    session = CourseSession(
        module_id=1,
        trainer_id=1,
        classroom_id=1,
        session_date=datetime.utcnow().date(),
        start_time=datetime.utcnow().time(),
        end_time=datetime.utcnow().time(),
        topic="Test Session",
        class_name="CS101",
    )
    db_session.add(session)
    db_session.commit()
    return session


@pytest.fixture
def test_attendance_records(db_session, test_student, test_session):
    """Create test attendance records for a session."""
    # The model enforces a unique (session_id, student_id) constraint.
    # Create multiple students so we can have multiple rows for one session.
    students = [test_student]
    for i in range(2, 6):
        user = User(
            username=f"teststudent{i}",
            email=f"test{i}@student.com",
            password_hash="hashed",
            role="student",
        )
        db_session.add(user)
        db_session.commit()

        student = Student(
            user_id=user.id,
            student_code=f"TEST{i:03d}",
            first_name="Test",
            last_name=f"Student{i}",
            email=user.email,
            class_name="CS101",
        )
        db_session.add(student)
        db_session.commit()
        students.append(student)

    records = []
    for idx, student in enumerate(students):
        record = AttendanceRecord(
            session_id=test_session.id,
            student_id=student.id,
            status="present" if idx % 2 == 0 else "absent",
            marked_via="manual",
            marked_at=datetime.utcnow(),
        )
        db_session.add(record)
        records.append(record)
    db_session.commit()
    return records


def test_export_attendance_to_pdf(db_session, test_session, test_attendance_records):
    """Test exporting attendance to PDF."""
    pdf_bytes = ExportService.export_attendance_pdf(db_session, session_id=test_session.id)
    
    assert pdf_bytes is not None
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    # PDF files start with %PDF
    assert pdf_bytes[:4] == b'%PDF'


def test_export_attendance_to_excel(db_session, test_session, test_attendance_records):
    """Test exporting attendance to Excel."""
    excel_bytes = ExportService.export_attendance_excel(db_session, session_id=test_session.id)
    
    assert excel_bytes is not None
    assert isinstance(excel_bytes, bytes)
    assert len(excel_bytes) > 0


def test_export_student_report_pdf(db_session, test_student, test_session, test_attendance_records):
    """Test exporting student-specific report (Excel filter)."""
    excel_bytes = ExportService.export_attendance_excel(db_session, student_id=test_student.id)
    assert excel_bytes is not None
    assert isinstance(excel_bytes, bytes)
    assert len(excel_bytes) > 0
