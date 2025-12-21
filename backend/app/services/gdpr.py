"""GDPR compliance utilities: export and delete user data."""

from __future__ import annotations

from typing import Any, Dict

from sqlalchemy.orm import Session

from app.models import AttendanceRecord, AuditLog, Notification, Student, Trainer, User


class GDPRService:
    def __init__(self, db: Session):
        self.db = db

    def export_user_data(self, user_id: int) -> Dict[str, Any]:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        student = self.db.query(Student).filter(Student.user_id == user_id).first()
        trainer = self.db.query(Trainer).filter(Trainer.user_id == user_id).first()
        attendance = self.db.query(AttendanceRecord).filter(AttendanceRecord.student_id == (student.id if student else None)).all() if student else []
        audits = self.db.query(AuditLog).filter(AuditLog.user_id == user_id).all()
        notifications = self.db.query(Notification).filter(Notification.user_id == user_id).all()

        return {
            "user": user.__dict__ if user else None,
            "student": student.__dict__ if student else None,
            "trainer": trainer.__dict__ if trainer else None,
            "attendance": [a.__dict__ for a in attendance],
            "audit_logs": [a.__dict__ for a in audits],
            "notifications": [n.__dict__ for n in notifications],
        }

    def delete_user_data(self, user_id: int) -> None:
        # Soft-delete approach: anonymize personal fields
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        user.email = f"deleted_{user_id}@example.com"
        user.full_name = "Deleted User"
        self.db.commit()

        # Anonymize related student/trainer
        student = self.db.query(Student).filter(Student.user_id == user_id).first()
        if student:
            student.student_number = f"deleted_{student.id}"
        trainer = self.db.query(Trainer).filter(Trainer.user_id == user_id).first()
        if trainer:
            trainer.employee_id = f"deleted_{trainer.id}"
        self.db.commit()
"""
GDPR Compliance Service - Data export, deletion, and retention policies
"""

from datetime import datetime, timedelta

from app.models.attendance import AttendanceRecord
from app.models.facial_embedding import FacialEmbedding
from app.models.notification import Notification
from app.models.smart_attendance import (
    AttendanceAlert,
    FraudDetection,
    SelfCheckin,
    TeamsParticipation,
)
from app.models.student import Student
from app.models.user import User


class GDPRService:
    """Service for GDPR compliance operations."""
    
    @staticmethod
    def export_user_data(db: Session, user: User) -> Dict[str, Any]:
        """
        Export all personal data for a user (GDPR Article 20 - Right to data portability).
        Returns a comprehensive JSON with all user data.
        """
        
        data = {
            "export_date": datetime.utcnow().isoformat(),
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        }
        
        # If student, export attendance data
        if user.role == "student":
            student = db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                data["student_profile"] = {
                    "id": student.id,
                    "first_name": student.first_name,
                    "last_name": student.last_name,
                    "student_number": student.student_number,
                    "class_name": student.class_name,
                    "email": student.email,
                    "phone": student.phone,
                }
                
                # Attendance records
                attendance_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id
                ).all()
                data["attendance_records"] = [
                    {
                        "id": rec.id,
                        "session_id": rec.session_id,
                        "status": rec.status,
                        "marked_at": rec.marked_at.isoformat() if rec.marked_at else None,
                        "marked_via": rec.marked_via,
                    }
                    for rec in attendance_records
                ]
                
                # Self check-ins
                checkins = db.query(SelfCheckin).filter(
                    SelfCheckin.student_id == student.id
                ).all()
                data["self_checkins"] = [
                    {
                        "id": ci.id,
                        "status": ci.status,
                        "face_confidence": float(ci.face_confidence) if ci.face_confidence else None,
                        "liveness_passed": ci.liveness_passed,
                        "created_at": ci.created_at.isoformat() if ci.created_at else None,
                    }
                    for ci in checkins
                ]
                
                # Teams participation
                teams_records = db.query(TeamsParticipation).filter(
                    TeamsParticipation.student_id == student.id
                ).all()
                data["teams_participation"] = [
                    {
                        "id": tp.id,
                        "join_time": tp.join_time.isoformat() if tp.join_time else None,
                        "leave_time": tp.leave_time.isoformat() if tp.leave_time else None,
                        "engagement_score": tp.engagement_score,
                    }
                    for tp in teams_records
                ]
                
                # Alerts
                alerts = db.query(AttendanceAlert).filter(
                    AttendanceAlert.student_id == student.id
                ).all()
                data["alerts"] = [
                    {
                        "id": alert.id,
                        "alert_type": alert.alert_type,
                        "severity": alert.severity,
                        "message": alert.message,
                        "created_at": alert.created_at.isoformat() if alert.created_at else None,
                    }
                    for alert in alerts
                ]
                
                # Facial embeddings (without actual embedding data for security)
                embeddings = db.query(FacialEmbedding).filter(
                    FacialEmbedding.student_id == student.id
                ).all()
                data["facial_embeddings"] = [
                    {
                        "id": emb.id,
                        "created_at": emb.created_at.isoformat() if emb.created_at else None,
                        "note": "Embedding data excluded for security"
                    }
                    for emb in embeddings
                ]
        
        # Notifications
        notifications = db.query(Notification).filter(
            Notification.user_id == user.id
        ).all()
        data["notifications"] = [
            {
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "type": notif.type,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
            }
            for notif in notifications
        ]
        
        return data
    
    @staticmethod
    def delete_user_data(db: Session, user: User, reason: str = "User request") -> Dict[str, int]:
        """
        Delete all personal data for a user (GDPR Article 17 - Right to erasure).
        Returns counts of deleted records.
        """
        
        deleted_counts = {}
        
        if user.role == "student":
            student = db.query(Student).filter(Student.user_id == user.id).first()
            if student:
                # Delete attendance records
                deleted_counts["attendance_records"] = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id
                ).delete()
                
                # Delete self check-ins
                deleted_counts["self_checkins"] = db.query(SelfCheckin).filter(
                    SelfCheckin.student_id == student.id
                ).delete()
                
                # Delete Teams participation
                deleted_counts["teams_participation"] = db.query(TeamsParticipation).filter(
                    TeamsParticipation.student_id == student.id
                ).delete()
                
                # Delete alerts
                deleted_counts["alerts"] = db.query(AttendanceAlert).filter(
                    AttendanceAlert.student_id == student.id
                ).delete()
                
                # Delete fraud detections
                deleted_counts["fraud_detections"] = db.query(FraudDetection).filter(
                    FraudDetection.student_id == student.id
                ).delete()
                
                # Delete facial embeddings
                deleted_counts["facial_embeddings"] = db.query(FacialEmbedding).filter(
                    FacialEmbedding.student_id == student.id
                ).delete()
                
                # Delete student record
                db.delete(student)
                deleted_counts["student_profile"] = 1
        
        # Delete notifications
        deleted_counts["notifications"] = db.query(Notification).filter(
            Notification.user_id == user.id
        ).delete()
        
        # Delete user account
        db.delete(user)
        deleted_counts["user_account"] = 1
        
        db.commit()
        
        return deleted_counts
    
    @staticmethod
    def anonymize_old_data(db: Session, retention_days: int = 365):
        """
        Anonymize or delete data older than retention period.
        Run as scheduled job for GDPR compliance.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Delete old audit logs
        from app.models.audit_log import AuditLog
        deleted_audit_logs = db.query(AuditLog).filter(
            AuditLog.timestamp < cutoff_date
        ).delete()
        
        # Anonymize old attendance records (keep statistics but remove personal identifiers)
        # This preserves historical data while protecting privacy
        old_attendance = db.query(AttendanceRecord).filter(
            AttendanceRecord.created_at < cutoff_date
        ).all()
        
        for record in old_attendance:
            record.ip_address = None
            record.device_id = None
            record.location_data = None
            record.verification_photo_path = None
        
        db.commit()
        
        return {
            "deleted_audit_logs": deleted_audit_logs,
            "anonymized_attendance": len(old_attendance),
        }
