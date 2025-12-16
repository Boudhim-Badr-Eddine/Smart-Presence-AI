"""Teams Integration Service - Microsoft Teams attendance tracking."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.attendance import AttendanceRecord
from app.models.session import Session as CourseSession
from app.models.smart_attendance import (
    AttendanceSession,
    SmartAttendanceLog,
    TeamsParticipation,
)
from app.models.student import Student

settings = get_settings()


class TeamsIntegrationService:
    """
    Handle Microsoft Teams meeting integration for remote attendance.
    
    Note: This is a framework. Full implementation requires:
    - Microsoft Graph API credentials
    - OAuth2 flow for Teams access
    - Webhook subscriptions for real-time events
    """

    @staticmethod
    def calculate_engagement_score(participation: TeamsParticipation) -> int:
        """
        Calculate 0-100 engagement score based on participation metrics.
        
        Weighted formula:
        - Presence duration: 40%
        - Camera on time: 25%
        - Mic usage: 15%
        - Chat activity: 10%
        - Reactions: 10%
        """
        if not participation.duration_minutes or participation.duration_minutes == 0:
            return 0
        
        # Presence score (max 40 points)
        presence_score = min(40, (participation.presence_percentage / 100) * 40)
        
        # Camera score (max 25 points)
        camera_ratio = participation.camera_on_minutes / participation.duration_minutes
        camera_score = min(25, camera_ratio * 25)
        
        # Mic score (max 15 points) - based on number of activations
        mic_score = min(15, participation.mic_used_count * 2)
        
        # Chat score (max 10 points)
        chat_score = min(10, participation.chat_messages_count * 2)
        
        # Reactions score (max 10 points)
        reactions_score = min(10, participation.reactions_count * 2)
        
        total = int(presence_score + camera_score + mic_score + chat_score + reactions_score)
        return min(100, total)

    @staticmethod
    def sync_teams_participant(
        db: Session,
        attendance_session_id: int,
        student_email: str,
        joined_at: datetime,
        left_at: Optional[datetime] = None,
        camera_on_minutes: int = 0,
        mic_used_count: int = 0,
        chat_messages_count: int = 0,
        reactions_count: int = 0,
    ) -> Dict:
        """
        Sync a single Teams participant's attendance data.
        
        This would be called by a webhook or periodic sync job.
        """
        # Get attendance session
        att_session = db.query(AttendanceSession).filter(
            AttendanceSession.id == attendance_session_id
        ).first()
        if not att_session:
            return {"success": False, "error": "Attendance session not found"}
        
        # Get course session
        course_session = db.query(CourseSession).filter(
            CourseSession.id == att_session.session_id
        ).first()
        if not course_session:
            return {"success": False, "error": "Course session not found"}
        
        # Find student by email
        from app.models.user import User
        user = db.query(User).filter(User.email == student_email).first()
        if not user:
            return {"success": False, "error": f"User not found: {student_email}"}
        
        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            return {"success": False, "error": f"Student not found: {student_email}"}
        
        # Calculate duration and presence percentage
        session_duration_minutes = 90  # TODO: Get actual session duration from course_session
        
        if left_at:
            duration_minutes = int((left_at - joined_at).total_seconds() / 60)
        else:
            duration_minutes = int((datetime.utcnow() - joined_at).total_seconds() / 60)
        
        presence_percentage = min(100, int((duration_minutes / session_duration_minutes) * 100))
        
        # Check if participation record already exists
        existing = (
            db.query(TeamsParticipation)
            .filter(
                TeamsParticipation.attendance_session_id == attendance_session_id,
                TeamsParticipation.student_id == student.id,
            )
            .first()
        )
        
        if existing:
            # Update existing record
            existing.left_at = left_at
            existing.duration_minutes = duration_minutes
            existing.presence_percentage = presence_percentage
            existing.camera_on_minutes = camera_on_minutes
            existing.mic_used_count = mic_used_count
            existing.chat_messages_count = chat_messages_count
            existing.reactions_count = reactions_count
            existing.engagement_score = TeamsIntegrationService.calculate_engagement_score(existing)
            
            # Update status based on presence threshold
            if presence_percentage >= att_session.min_presence_percent:
                existing.status = "present"
            else:
                existing.status = "absent"
            
            participation = existing
        else:
            # Create new participation record
            participation = TeamsParticipation(
                attendance_session_id=attendance_session_id,
                student_id=student.id,
                joined_at=joined_at,
                left_at=left_at,
                duration_minutes=duration_minutes,
                presence_percentage=presence_percentage,
                camera_on_minutes=camera_on_minutes,
                mic_used_count=mic_used_count,
                chat_messages_count=chat_messages_count,
                reactions_count=reactions_count,
            )
            participation.engagement_score = TeamsIntegrationService.calculate_engagement_score(participation)
            
            # Determine status
            if presence_percentage >= att_session.min_presence_percent:
                participation.status = "present"
            else:
                participation.status = "absent"
            
            db.add(participation)
        
        db.flush()
        
        # Create or update attendance record if present
        if participation.status == "present":
            existing_attendance = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.session_id == att_session.session_id,
                )
                .first()
            )
            
            if existing_attendance:
                existing_attendance.status = "present"
                attendance = existing_attendance
            else:
                attendance = AttendanceRecord(
                    student_id=student.id,
                    session_id=att_session.session_id,
                    status="present",
                    marked_via="teams_auto",
                )
                db.add(attendance)
                db.flush()
            
            # Link participation to attendance (field commented out in model)
            # participation.attendance_record_id = attendance.id
        
        # Log sync
        log = SmartAttendanceLog(
            session_id=att_session.session_id,
            student_id=student.id,
            action_type="teams_sync",
            triggered_by="teams_api",
            details={
                "presence_percentage": presence_percentage,
                "engagement_score": participation.engagement_score,
                "status": participation.status,
            },
            success=True,
        )
        db.add(log)
        
        db.commit()
        
        return {
            "success": True,
            "student_id": student.id,
            "status": participation.status,
            "presence_percentage": presence_percentage,
            "engagement_score": participation.engagement_score,
            "participation_id": participation.id,
        }

    @staticmethod
    def process_facial_verification(
        db: Session,
        participation_id: int,
        image_base64: str,
    ) -> Dict:
        """
        Optional: Process facial verification for Teams participant for bonus points.
        
        Student can voluntarily verify their face at session start.
        """
        participation = db.query(TeamsParticipation).filter(
            TeamsParticipation.id == participation_id
        ).first()
        if not participation:
            return {"success": False, "error": "Participation record not found"}
        
        # TODO: Implement facial verification using existing facial service
        # For now, placeholder
        participation.face_verified = True
        participation.face_verification_confidence = 0.85
        participation.face_verification_at = datetime.utcnow()
        
        # Boost engagement score by 10 points for facial verification
        if participation.engagement_score:
            participation.engagement_score = min(100, participation.engagement_score + 10)
        
        db.commit()
        
        return {
            "success": True,
            "face_verified": True,
            "engagement_score": participation.engagement_score,
            "message": "+10 bonus points for facial verification!",
        }

    @staticmethod
    def get_session_summary(db: Session, attendance_session_id: int) -> Dict:
        """Get real-time summary of Teams session participation."""
        participations = (
            db.query(TeamsParticipation)
            .filter(TeamsParticipation.attendance_session_id == attendance_session_id)
            .all()
        )
        
        total_students = len(participations)
        present = sum(1 for p in participations if p.status == "present")
        absent = sum(1 for p in participations if p.status == "absent")
        avg_engagement = (
            sum(p.engagement_score or 0 for p in participations) / total_students
            if total_students > 0
            else 0
        )
        
        return {
            "total_students": total_students,
            "present": present,
            "absent": absent,
            "avg_engagement_score": int(avg_engagement),
            "participations": [
                {
                    "student_id": p.student_id,
                    "presence_percentage": p.presence_percentage,
                    "engagement_score": p.engagement_score,
                    "status": p.status,
                    "face_verified": p.face_verified,
                }
                for p in participations
            ],
        }


# Placeholder for Microsoft Graph API integration
class TeamsGraphAPIClient:
    """
    Microsoft Graph API client for Teams integration.
    
    Implementation requires:
    1. Register app in Azure AD
    2. Get client_id and client_secret
    3. Request permissions: OnlineMeetings.Read, Chat.Read, User.Read
    4. Implement OAuth2 flow
    5. Subscribe to meeting webhooks
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://graph.microsoft.com/v1.0"

    async def get_meeting_participants(self, meeting_id: str) -> List[Dict]:
        """Fetch list of meeting participants from Teams."""
        # TODO: Implement Graph API call
        # GET /communications/onlineMeetings/{meeting_id}/attendanceReports
        raise NotImplementedError("Graph API integration pending")

    async def get_participant_details(self, meeting_id: str, participant_id: str) -> Dict:
        """Get detailed participation metrics for a specific participant."""
        # TODO: Implement Graph API call
        raise NotImplementedError("Graph API integration pending")

    async def subscribe_to_meeting_events(self, meeting_id: str, webhook_url: str) -> Dict:
        """Subscribe to real-time meeting events (join/leave)."""
        # TODO: Implement Graph API subscription
        # POST /subscriptions
        raise NotImplementedError("Graph API integration pending")
