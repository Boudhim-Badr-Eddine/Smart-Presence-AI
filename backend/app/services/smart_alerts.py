"""Smart Alerts Service - Pattern-based alerts for attendance issues."""

from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.session import Session as CourseSession
from app.models.smart_attendance import AttendanceAlert
from app.models.student import Student


class SmartAlertsService:
    """Generate smart alerts based on attendance patterns."""

    @staticmethod
    def check_sudden_absence(db: Session, student_id: int, session_id: int) -> bool:
        """
        Check if student with 95%+ attendance is suddenly absent.
        
        Returns True if alert was created.
        """
        # Calculate attendance rate over last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        total_sessions = (
            db.query(CourseSession)
            .filter(
                CourseSession.date >= thirty_days_ago,
                CourseSession.id != session_id,
            )
            .count()
        )
        
        if total_sessions < 5:  # Need at least 5 sessions to establish pattern
            return False
        
        attended_sessions = (
            db.query(AttendanceRecord)
            .join(CourseSession, AttendanceRecord.session_id == CourseSession.id)
            .filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.status == "present",
                CourseSession.date >= thirty_days_ago,
            )
            .count()
        )
        
        attendance_rate = (attended_sessions / total_sessions) * 100 if total_sessions > 0 else 0
        
        if attendance_rate >= 95:
            # Get student details
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                return False
            
            # Create alert
            alert = AttendanceAlert(
                student_id=student_id,
                session_id=session_id,
                alert_type="sudden_absence",
                severity="medium",
                title="Étudiant avec bonne assiduité absent",
                message=f"{student.first_name} {student.last_name} (assiduité: {attendance_rate:.0f}%) est absent aujourd'hui",
                details={"attendance_rate": attendance_rate, "recent_sessions": total_sessions},
                notify_trainer=True,
                notify_admin=False,
                notify_student=True,  # Send "Are you okay?" message
            )
            db.add(alert)
            db.commit()
            return True
        
        return False

    @staticmethod
    def check_consecutive_absences(db: Session, student_id: int) -> bool:
        """
        Check if student has 3+ consecutive absences.
        
        Returns True if alert was created.
        """
        # Get last 5 attendance records ordered by date
        recent_attendance = (
            db.query(AttendanceRecord)
            .join(CourseSession, AttendanceRecord.session_id == CourseSession.id)
            .filter(AttendanceRecord.student_id == student_id)
            .order_by(CourseSession.date.desc())
            .limit(5)
            .all()
        )
        
        if len(recent_attendance) < 3:
            return False
        
        # Count consecutive absences from most recent
        consecutive_absences = 0
        for att in recent_attendance:
            if att.status in ["absent", "unexcused"]:
                consecutive_absences += 1
            else:
                break
        
        if consecutive_absences >= 3:
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                return False
            
            # Check if alert already exists (don't spam)
            existing = (
                db.query(AttendanceAlert)
                .filter(
                    AttendanceAlert.student_id == student_id,
                    AttendanceAlert.alert_type == "consecutive_absences",
                    AttendanceAlert.acknowledged == False,
                )
                .first()
            )
            
            if existing:
                return False  # Alert already pending
            
            alert = AttendanceAlert(
                student_id=student_id,
                alert_type="consecutive_absences",
                severity="high",
                title="Absences consécutives détectées",
                message=f"{student.first_name} {student.last_name} est absent pour {consecutive_absences} cours consécutifs",
                details={"consecutive_count": consecutive_absences},
                notify_trainer=True,
                notify_admin=True,  # Escalate to admin
                notify_student=True,
            )
            db.add(alert)
            db.commit()
            return True
        
        return False

    @staticmethod
    def get_pending_alerts(
        db: Session, trainer_id: Optional[int] = None, severity: Optional[str] = None
    ) -> List[AttendanceAlert]:
        """Get unacknowledged alerts, optionally filtered by trainer or severity."""
        query = db.query(AttendanceAlert).filter(AttendanceAlert.acknowledged == False)
        
        if trainer_id:
            # Get sessions taught by this trainer
            trainer_sessions = (
                db.query(CourseSession.id)
                .filter(CourseSession.trainer_id == trainer_id)
                .all()
            )
            session_ids = [s[0] for s in trainer_sessions]
            query = query.filter(AttendanceAlert.session_id.in_(session_ids))
        
        if severity:
            query = query.filter(AttendanceAlert.severity == severity)
        
        return query.order_by(AttendanceAlert.created_at.desc()).all()

    @staticmethod
    def acknowledge_alert(db: Session, alert_id: int, user_id: int, action_taken: str) -> bool:
        """Mark alert as acknowledged with action taken."""
        alert = db.query(AttendanceAlert).filter(AttendanceAlert.id == alert_id).first()
        if not alert:
            return False
        
        alert.acknowledged = True
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.utcnow()
        alert.action_taken = action_taken
        
        db.commit()
        return True
