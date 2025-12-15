from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.notification import NotificationCreate, NotificationOut, NotificationListOut
from app.services.notification import NotificationService
from app.utils.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter(tags=["notifications"])


@router.post("", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a notification (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can create notifications"
        )

    notification = NotificationService.create_notification(db, payload)
    return notification


@router.get("/user/{user_id}", response_model=NotificationListOut)
def get_user_notifications(
    user_id: int,
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get notifications for a user."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other user's notifications"
        )

    notifications = NotificationService.get_user_notifications(db, user_id, limit, unread_only)
    unread_count = NotificationService.get_unread_count(db, user_id)

    return NotificationListOut(notifications=notifications, unread_count=unread_count)


@router.get("/me", response_model=NotificationListOut)
def get_my_notifications(
    limit: int = 20,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's notifications."""
    notifications = NotificationService.get_user_notifications(db, current_user.id, limit, unread_only)
    unread_count = NotificationService.get_unread_count(db, current_user.id)

    return NotificationListOut(notifications=notifications, unread_count=unread_count)


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark notification as read."""
    notification = NotificationService.mark_as_read(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.put("/all/read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for current user."""
    NotificationService.mark_all_as_read(db, current_user.id)
    return {"status": "success", "message": "All notifications marked as read"}


@router.get("/unread/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/test")
async def send_test_notification(target_user_id: int, channel: str = "in_app"):
    """Test notification endpoint."""
    return {"status": "queued", "user_id": target_user_id, "channel": channel}
