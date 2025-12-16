from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["messages"])


@router.get("/threads")
def get_message_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get message threads for the current user."""
    # Placeholder - implement message model if needed
    return [
        {
            "id": 1,
            "name": "Support Technique",
            "last_message": "Bonjour, comment puis-je vous aider?",
            "timestamp": datetime.now().isoformat(),
            "unread": 0,
        }
    ]


@router.get("/thread/{thread_id}")
def get_thread_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages for a specific thread."""
    # Placeholder - implement message model
    return [
        {
            "id": 1,
            "thread_id": thread_id,
            "sender": "System",
            "content": "Bienvenue dans la messagerie",
            "timestamp": datetime.now().isoformat(),
        }
    ]


@router.post("/send")
def send_message(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to a thread."""
    # Placeholder - implement message model
    return {
        "status": "success",
        "id": 1,
        "timestamp": datetime.now().isoformat(),
    }
