"""Integration stubs for calendar, LMS, and HR systems."""

from datetime import datetime, timedelta
from typing import Any, Dict, List

from icalendar import Calendar
from icalendar import Event as ICalEvent
from sqlalchemy.orm import Session

from app.core.logging_config import logger
from app.models.attendance import Attendance
from app.models.session import Session as ClassSession
from app.models.student import Student


class CalendarIntegrationService:
    """Service for calendar integrations (Google Calendar, Outlook, iCal)."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def export_to_ical(
        self,
        sessions: List[ClassSession],
        title: str = "SmartPresence Sessions",
    ) -> bytes:
        """
        Export sessions to iCalendar format.
        
        Args:
            sessions: List of class sessions
            title: Calendar title
            
        Returns:
            iCalendar file content as bytes
        """
        cal = Calendar()
        cal.add('prodid', '-//SmartPresence AI//Sessions//EN')
        cal.add('version', '2.0')
        cal.add('x-wr-calname', title)
        
        for session in sessions:
            event = ICalEvent()
            event.add('summary', session.title or f"Session {session.id}")

            # Prefer scheduled datetime; fallback to created_at if needed.
            start_dt = None
            if getattr(session, "session_date", None) and getattr(session, "start_time", None):
                start_dt = datetime.combine(session.session_date, session.start_time)
            elif getattr(session, "created_at", None):
                start_dt = session.created_at
            else:
                continue

            event.add('dtstart', start_dt)

            end_dt = None
            if getattr(session, "session_date", None) and getattr(session, "end_time", None):
                end_dt = datetime.combine(session.session_date, session.end_time)
            else:
                duration_minutes = getattr(session, 'duration_minutes', None) or 60
                end_dt = start_dt + timedelta(minutes=duration_minutes)
            event.add('dtend', end_dt)
            
            # Description
            description = f"Session ID: {session.id}\n"
            if getattr(session, "topic", None):
                description += f"Topic: {session.topic}\n"
            if getattr(session, "class_name", None):
                description += f"Class: {session.class_name}\n"
            if getattr(session, "notes", None):
                description += f"Notes: {session.notes}\n"
            event.add('description', description)
            
            # Add to calendar
            cal.add_component(event)
        
        logger.info(f"Exported {len(sessions)} sessions to iCal format")
        return cal.to_ical()
    
    async def sync_to_google_calendar(
        self,
        sessions: List[ClassSession],
        user_email: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError("Google Calendar sync not implemented")
    
    async def sync_to_outlook(
        self,
        sessions: List[ClassSession],
        user_email: str,
    ) -> Dict[str, Any]:
        raise NotImplementedError("Outlook/Microsoft 365 sync not implemented")


class LMSIntegrationService:
    """Service for Learning Management System integrations (Moodle, Canvas, Blackboard)."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def export_to_moodle_csv(
        self,
        attendance_records: List[Attendance],
    ) -> str:
        """
        Export attendance to Moodle-compatible CSV format.
        
        Args:
            attendance_records: List of attendance records
            
        Returns:
            CSV content as string
        """
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Moodle format headers
        writer.writerow([
            'Student ID',
            'Student Email',
            'Session ID',
            'Status',
            'Timestamp',
            'Method',
        ])
        
        for record in attendance_records:
            student = self.db.query(Student).filter(Student.id == record.student_id).first()
            writer.writerow([
                record.student_id,
                student.email if student else '',
                record.session_id,
                record.status or 'present',
                record.marked_at.isoformat() if record.marked_at else '',
                record.method or 'manual',
            ])
        
        csv_content = output.getvalue()
        logger.info(f"Exported {len(attendance_records)} records to Moodle CSV")
        return csv_content
    
    async def sync_to_canvas(
        self,
        course_id: str,
        attendance_records: List[Attendance],
    ) -> Dict[str, Any]:
        raise NotImplementedError("Canvas LMS sync not implemented")
    
    async def sync_to_blackboard(
        self,
        course_id: str,
        attendance_records: List[Attendance],
    ) -> Dict[str, Any]:
        raise NotImplementedError("Blackboard sync not implemented")


class HRIntegrationService:
    """Service for HR system integrations (SAP, Workday, BambooHR)."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def export_attendance_summary(
        self,
        student_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """
        Generate attendance summary for HR export.
        
        Args:
            student_id: Student ID
            start_date: Start date
            end_date: End date
            
        Returns:
            Attendance summary dict
        """
        records = (
            self.db.query(Attendance)
            .filter(
                Attendance.student_id == student_id,
                Attendance.marked_at >= start_date,
                Attendance.marked_at <= end_date,
            )
            .all()
        )
        
        total_sessions = len(records)
        present_count = sum(1 for r in records if r.status == 'present')
        absent_count = sum(1 for r in records if r.status == 'absent')
        late_count = sum(1 for r in records if r.status == 'late')
        
        student = self.db.query(Student).filter(Student.id == student_id).first()
        
        summary = {
            'student_id': student_id,
            'student_email': student.email if student else None,
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'total_sessions': total_sessions,
            'present': present_count,
            'absent': absent_count,
            'late': late_count,
            'attendance_rate': (present_count / total_sessions * 100) if total_sessions > 0 else 0,
        }
        
        return summary
    
    async def sync_to_workday(
        self,
        employee_id: str,
        attendance_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        raise NotImplementedError("Workday sync not implemented")
    
    async def sync_to_bamboohr(
        self,
        employee_id: str,
        attendance_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        raise NotImplementedError("BambooHR sync not implemented")
