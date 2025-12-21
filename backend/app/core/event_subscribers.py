"""Event subscribers for attendance, notifications, and webhooks."""
from typing import Any, Dict

from app.core.event_bus import event_bus
from app.core.logging_config import logger
from app.db.session import SessionLocal
from app.models.webhook import Webhook
from app.services.webhook_service import WebhookService


async def on_attendance_marked(payload: Dict[str, Any]) -> None:
    """
    Handle attendance.marked event.
    
    Triggers:
    - Notifications to trainers/admins if absent
    - Webhook delivery to external systems
    - Analytics/anomaly detection (future)
    """
    db = SessionLocal()
    try:
        student_id = payload.get("student_id")
        session_id = payload.get("session_id")
        status = payload.get("status")
        
        logger.info(f"Attendance marked: student={student_id}, session={session_id}, status={status}")
        
        # Send webhooks for attendance.marked event
        webhooks = db.query(Webhook).filter(
            Webhook.event_type == "attendance.marked",
            Webhook.is_active == True
        ).all()
        
        webhook_service = WebhookService(db)
        for webhook in webhooks:
            await webhook_service.send_webhook(webhook, payload)
        
        # TODO: Trigger notifications if absent/late
        # if status in ["absent", "late"]:
        #     notification_service = NotificationService(db)
        #     await notification_service.notify_absence_alert(...)
        
    except Exception as e:
        logger.error(f"Error handling attendance.marked event: {e}")
    finally:
        db.close()


async def on_attendance_updated(payload: Dict[str, Any]) -> None:
    """
    Handle attendance.updated event.
    
    Triggers:
    - Audit log entries
    - Webhook delivery
    """
    db = SessionLocal()
    try:
        attendance_id = payload.get("attendance_id")
        logger.info(f"Attendance updated: {attendance_id}")
        
        # Send webhooks for attendance.updated event
        webhooks = db.query(Webhook).filter(
            Webhook.event_type == "attendance.updated",
            Webhook.is_active == True
        ).all()
        
        webhook_service = WebhookService(db)
        for webhook in webhooks:
            await webhook_service.send_webhook(webhook, payload)
            
    except Exception as e:
        logger.error(f"Error handling attendance.updated event: {e}")
    finally:
        db.close()


async def on_anomaly_detected(payload: Dict[str, Any]) -> None:
    """
    Handle anomaly.detected event from ML detector.
    
    Triggers:
    - Email/push notifications to admins
    - Webhooks to security/fraud systems
    """
    db = SessionLocal()
    try:
        student_id = payload.get("student_id")
        anomaly_score = payload.get("anomaly_score")
        
        logger.warning(f"Anomaly detected: student={student_id}, score={anomaly_score}")
        
        # Send webhooks for fraud detection
        webhooks = db.query(Webhook).filter(
            Webhook.event_type == "fraud.detected",
            Webhook.is_active == True
        ).all()
        
        webhook_service = WebhookService(db)
        for webhook in webhooks:
            await webhook_service.send_webhook(webhook, payload)
        
        # TODO: Send admin notification
        # notification_service = NotificationService(db)
        # await notification_service.notify_fraud_detection(...)
        
    except Exception as e:
        logger.error(f"Error handling anomaly.detected event: {e}")
    finally:
        db.close()


async def initialize_event_subscribers() -> None:
    """
    Initialize all event subscribers at app startup.
    
    Call this from app/main.py startup event.
    """
    await event_bus.subscribe("attendance.marked", on_attendance_marked)
    await event_bus.subscribe("attendance.updated", on_attendance_updated)
    await event_bus.subscribe("anomaly.detected", on_anomaly_detected)
    
    logger.info("Event subscribers initialized")
