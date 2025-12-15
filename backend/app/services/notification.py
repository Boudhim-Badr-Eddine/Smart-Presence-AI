from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional


class NotificationService:
    """Service layer for notifications."""

    @staticmethod
    def create_notification(db: Session, payload: NotificationCreate) -> Notification:
        """Create a new notification."""
        notification = Notification(
            user_id=payload.user_id,
            user_type=payload.user_type,
            title=payload.title,
            message=payload.message,
            notification_type=payload.notification_type,
            priority=payload.priority or "medium",
            delivery_method=payload.delivery_method or "in_app",
            related_entity_type=payload.related_entity_type,
            related_entity_id=payload.related_entity_id,
            action_url=payload.action_url,
            action_label=payload.action_label,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def get_user_notifications(
        db: Session, user_id: int, limit: int = 20, unread_only: bool = False
    ):
        """Get notifications for a user."""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.read == False)

        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        return notifications

    @staticmethod
    def mark_as_read(db: Session, notification_id: int) -> Notification:
        """Mark notification as read."""
        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )
        if notification:
            notification.read = True
            notification.read_at = datetime.now()
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int):
        """Mark all notifications as read for a user."""
        db.query(Notification).filter(
            Notification.user_id == user_id, Notification.read == False
        ).update({"read": True, "read_at": datetime.now()})
        db.commit()

    @staticmethod
    def send_email(
        recipient: str, subject: str, body: str, is_html: bool = False
    ) -> bool:
        """Send email notification (stub)."""
        try:
            # TODO: Configure SMTP server (SendGrid, AWS SES, etc.)
            # For now, this is a stub that logs instead of sending
            print(f"[EMAIL] To: {recipient}, Subject: {subject}")
            print(f"[EMAIL] Body: {body[:100]}...")
            return True
        except Exception as e:
            print(f"[EMAIL ERROR] {str(e)}")
            return False

    @staticmethod
    def send_sms(phone: str, message: str) -> bool:
        """Send SMS notification (stub)."""
        try:
            # TODO: Configure Twilio or similar
            # For now, this is a stub
            print(f"[SMS] To: {phone}, Message: {message}")
            return True
        except Exception as e:
            print(f"[SMS ERROR] {str(e)}")
            return False

    @staticmethod
    def trigger_absence_alert(db: Session, student_id: int, absence_hours: int):
        """Trigger alert when student exceeds absence threshold."""
        thresholds = {"high": 10, "critical": 20}

        level = "none"
        if absence_hours >= thresholds["critical"]:
            level = "critical"
        elif absence_hours >= thresholds["high"]:
            level = "high"

        if level != "none":
            notification = NotificationCreate(
                user_id=student_id,
                user_type="student",
                title=f"Absence Alert - {level.upper()}",
                message=f"You have {absence_hours} hours of absence. Please contact your trainer.",
                notification_type="absence_alert",
                priority=level,
                delivery_method="in_app",
            )
            NotificationService.create_notification(db, notification)
            return True

        return False

    @staticmethod
    def trigger_exam_reminder(db: Session, user_id: int, exam_title: str, hours_until: int):
        """Trigger exam reminder notification."""
        if hours_until <= 24:
            notification = NotificationCreate(
                user_id=user_id,
                user_type="student",
                title="Exam Reminder",
                message=f"Your exam '{exam_title}' is in {hours_until} hours.",
                notification_type="exam_reminder",
                priority="high",
                delivery_method="in_app",
            )
            NotificationService.create_notification(db, notification)
            return True

        return False

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.read == False)
            .count()
        )
        return count
