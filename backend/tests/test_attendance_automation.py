"""
Test suite for attendance automation features:
1. Auto-Calculate Absence Hours
2. Auto-Update Attendance Rate
3. Auto-Escalate Alert Level
"""
import pytest
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.session import Session as SessionModel
from app.models.student import Student
from app.models.user import User
from app.schemas.attendance import AttendanceCreate
from app.services.attendance import AttendanceService


@pytest.fixture
def test_student(db_session: Session):
    """Create a test student."""
    user = User(
        email="test.student@smartpresence.com",
        hashed_password="hashed",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    
    student = Student(
        user_id=user.id,
        student_code="TEST001",
        first_name="Test",
        last_name="Student",
        email="test.student@smartpresence.com",
        class_name="FS201",
        total_absence_hours=0,
        total_late_minutes=0,
        attendance_rate=Decimal("100.00"),
        alert_level="none",
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student


@pytest.fixture
def test_session(db_session: Session):
    """Create a test session with 2 hours duration."""
    session = SessionModel(
        module_id=1,
        trainer_id=1,
        classroom_id=1,
        session_date="2025-12-21",
        start_time="09:00:00",
        end_time="11:00:00",
        duration_minutes=120,  # 2 hours
        title="Test Session",
        class_name="FS201",
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)
    return session


class TestAutoCalculateAbsenceHours:
    """Test Feature 1: Auto-Calculate Absence Hours"""
    
    def test_absence_adds_session_duration_to_total_hours(self, db_session: Session, test_student, test_session):
        """When marking absent, session duration should be added to total_absence_hours."""
        # Mark student as absent
        payload = AttendanceCreate(
            session_id=test_session.id,
            student_id=test_student.id,
            status="absent",
            marked_via="manual",
        )
        
        AttendanceService.mark_attendance(db_session, test_session.id, test_student.id, payload)
        
        # Refresh student to get updated values
        db_session.refresh(test_student)
        
        # Should have 2 hours of absence (120 minutes / 60)
        assert test_student.total_absence_hours == 2
    
    def test_present_does_not_add_absence_hours(self, db_session: Session, test_student, test_session):
        """When marking present, absence hours should not increase."""
        payload = AttendanceCreate(
            session_id=test_session.id,
            student_id=test_student.id,
            status="present",
            marked_via="manual",
        )
        
        AttendanceService.mark_attendance(db_session, test_session.id, test_student.id, payload)
        db_session.refresh(test_student)
        
        # Should have 0 hours of absence
        assert test_student.total_absence_hours == 0
    
    def test_multiple_absences_accumulate_hours(self, db_session: Session, test_student):
        """Multiple absences should accumulate total absence hours."""
        # Create 3 sessions, mark absent for all
        for i in range(3):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,  # 2 hours each
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status="absent",
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        
        # Should have 6 hours total (3 sessions × 2 hours)
        assert test_student.total_absence_hours == 6


class TestAutoUpdateAttendanceRate:
    """Test Feature 2: Auto-Update Attendance Rate"""
    
    def test_attendance_rate_calculated_after_marking(self, db_session: Session, test_student):
        """Attendance rate should auto-calculate after each attendance."""
        # Create 4 sessions
        sessions = []
        for i in range(4):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        # Mark: 3 present, 1 absent
        for i, session in enumerate(sessions):
            status = "absent" if i == 0 else "present"
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=status,
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        
        # Should be 75% (3 present out of 4 total)
        assert float(test_student.attendance_rate) == 75.0
    
    def test_late_counts_as_present_in_attendance_rate(self, db_session: Session, test_student):
        """Late status should count as present for attendance rate calculation."""
        # Create 2 sessions
        sessions = []
        for i in range(2):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        # Mark 1 present, 1 late
        statuses = ["present", "late"]
        for i, session in enumerate(sessions):
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=statuses[i],
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        
        # Should be 100% (both count as present)
        assert float(test_student.attendance_rate) == 100.0


class TestAutoEscalateAlertLevel:
    """Test Feature 3: Auto-Escalate Alert Level"""
    
    def test_alert_level_none_when_below_15_percent_absences(self, db_session: Session, test_student):
        """Alert level should be 'none' (Green) when absence rate < 15%."""
        # Create 10 sessions, mark 9 present, 1 absent (10% absence)
        sessions = []
        for i in range(10):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        for i, session in enumerate(sessions):
            status = "absent" if i == 0 else "present"
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=status,
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        assert test_student.alert_level == "none"  # Green
    
    def test_alert_level_warning_for_15_to_20_percent_absences(self, db_session: Session, test_student):
        """Alert level should be 'warning' (Yellow) when 15% <= absence rate < 20%."""
        # Create 10 sessions, mark 8 present, 2 absent (20% absence, edge case)
        sessions = []
        for i in range(10):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        for i, session in enumerate(sessions):
            status = "absent" if i < 2 else "present"
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=status,
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        # 20% is at threshold, should be critical
        assert test_student.alert_level in ["warning", "critical"]
    
    def test_alert_level_critical_for_20_to_25_percent_absences(self, db_session: Session, test_student):
        """Alert level should be 'critical' (Orange) when 20% <= absence rate < 25%."""
        # Create 10 sessions, mark 7 present, 3 absent (30% absence, should be failing)
        sessions = []
        for i in range(10):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        # Mark 3 absent (30%)
        for i, session in enumerate(sessions):
            status = "absent" if i < 3 else "present"
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=status,
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        # 30% absence should trigger failing
        assert test_student.alert_level == "failing"  # Red
    
    def test_alert_level_failing_for_above_25_percent_absences(self, db_session: Session, test_student):
        """Alert level should be 'failing' (Red) when absence rate >= 25%."""
        # Create 10 sessions, mark 5 present, 5 absent (50% absence)
        sessions = []
        for i in range(10):
            session = SessionModel(
                module_id=1,
                trainer_id=1,
                classroom_id=1,
                session_date="2025-12-21",
                start_time="09:00:00",
                end_time="11:00:00",
                duration_minutes=120,
                title=f"Session {i+1}",
                class_name="FS201",
            )
            db_session.add(session)
            db_session.flush()
            sessions.append(session)
        
        for i, session in enumerate(sessions):
            status = "absent" if i < 5 else "present"
            payload = AttendanceCreate(
                session_id=session.id,
                student_id=test_student.id,
                status=status,
                marked_via="manual",
            )
            AttendanceService.mark_attendance(db_session, session.id, test_student.id, payload)
        
        db_session.refresh(test_student)
        assert test_student.alert_level == "failing"  # Red
