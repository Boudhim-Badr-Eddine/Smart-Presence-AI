import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging_config import logger
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationCreate

settings = get_settings()


class NotificationService:
    """Service layer for notifications with email/push/SMS support."""

    def __init__(self, db: Session):
        self.db = db
        smtp_host = getattr(settings, "smtp_host", None)
        smtp_user = getattr(settings, "smtp_user", None)
        self.email_enabled = bool(smtp_host and smtp_user)
        self.push_enabled = False  # TODO: Configure push service (Firebase, etc.)
        self.sms_enabled = False   # TODO: Configure SMS service (Twilio, etc.)

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
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
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
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ) -> bool:
        """Send an email notification."""
        if not self.email_enabled:
            logger.warning(f"Email sending disabled, skipping: {subject} to {to_email}")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            smtp_from_email = getattr(settings, "smtp_from_email", None)
            smtp_user = getattr(settings, "smtp_user", None)
            msg['From'] = smtp_from_email or smtp_user or "no-reply@localhost"
            msg['To'] = to_email
            
            msg.attach(MIMEText(body, 'plain'))
            if html_body:
                msg.attach(MIMEText(html_body, 'html'))
            
            smtp_host = getattr(settings, "smtp_host", None)
            smtp_port = getattr(settings, "smtp_port", None) or 587
            smtp_tls = bool(getattr(settings, "smtp_tls", False))
            smtp_password = getattr(settings, "smtp_password", None)

            if not smtp_host or not smtp_user:
                logger.warning("SMTP not configured; skipping email send")
                return False

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                if smtp_tls:
                    server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def send_push_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """Send a push notification (stub for Firebase/OneSignal integration)."""
        if not self.push_enabled:
            logger.info(f"Push notification (disabled): {title} to user {user_id}")
            return False
        
        # TODO: Integrate with Firebase Cloud Messaging or OneSignal
        logger.info(f"Push notification: {title} to user {user_id}")
        return True
    
    async def send_sms(
        self,
        phone_number: str,
        message: str,
    ) -> bool:
        """Send an SMS notification (stub for Twilio integration)."""
        if not self.sms_enabled:
            logger.info(f"SMS (disabled) to {phone_number}: {message}")
            return False
        
        # TODO: Integrate with Twilio or similar
        logger.info(f"SMS to {phone_number}: {message}")
        return True
    
    async def notify_user(
        self,
        user_id: int,
        subject: str,
        message: str,
        channels: Optional[List[str]] = None,
        html_message: Optional[str] = None,
    ) -> dict[str, bool]:
        """Send notification to user via preferred channels."""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found for notification")
            return {}
        
        if channels is None:
            channels = ['email']
        
        results = {}
        
        if 'email' in channels and user.email:
            results['email'] = await self.send_email(
                to_email=user.email,
                subject=subject,
                body=message,
                html_body=html_message,
            )
        
        if 'push' in channels:
            results['push'] = await self.send_push_notification(
                user_id=user_id,
                title=subject,
                body=message,
            )
        
        if 'sms' in channels:
            phone = getattr(user, 'phone_number', None)
            if phone:
                results['sms'] = await self.send_sms(
                    phone_number=phone,
                    message=f"{subject}: {message}",
                )
        
        return results

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get count of unread notifications for a user."""
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.read == False)
            .count()
        )
        return count
