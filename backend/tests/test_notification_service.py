import pytest
from app.services.notification import NotificationService
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate


def test_create_notification(db_session):
    """Test creating a notification."""
    payload = NotificationCreate(
        user_id=1,
        user_type="student",
        title="Test Notification",
        message="This is a test message",
        notification_type="info",
        priority="medium",
        delivery_method="in_app",
    )
    
    notification = NotificationService.create_notification(db_session, payload)
    
    assert notification is not None
    assert notification.user_id == 1
    assert notification.title == "Test Notification"
    assert notification.read is False


def test_get_user_notifications(db_session):
    """Test getting notifications for a user."""
    # Create multiple notifications
    for i in range(5):
        notif = Notification(
            user_id=1,
            user_type="student",
            title=f"Notification {i}",
            message=f"Message {i}",
            notification_type="info",
            read=(i % 2 == 0),
        )
        db_session.add(notif)
    db_session.commit()
    
    # Get all notifications
    all_notifs = NotificationService.get_user_notifications(db_session, user_id=1, limit=10)
    assert len(all_notifs) == 5
    
    # Get unread only
    unread = NotificationService.get_user_notifications(
        db_session, user_id=1, limit=10, unread_only=True
    )
    assert len(unread) == 2  # Only unread (odd indexes)


def test_mark_as_read(db_session):
    """Test marking notification as read."""
    notif = Notification(
        user_id=1,
        user_type="student",
        title="Test",
        message="Test",
        notification_type="info",
        read=False,
    )
    db_session.add(notif)
    db_session.commit()
    
    updated = NotificationService.mark_as_read(db_session, notif.id)
    
    assert updated.read is True
    assert updated.read_at is not None


def test_mark_all_as_read(db_session):
    """Test marking all notifications as read for a user."""
    # Create unread notifications
    for i in range(3):
        notif = Notification(
            user_id=1,
            user_type="student",
            title=f"Test {i}",
            message=f"Message {i}",
            notification_type="info",
            read=False,
        )
        db_session.add(notif)
    db_session.commit()
    
    NotificationService.mark_all_as_read(db_session, user_id=1)
    
    # Verify all are read
    all_notifs = db_session.query(Notification).filter(Notification.user_id == 1).all()
    for notif in all_notifs:
        assert notif.read is True
