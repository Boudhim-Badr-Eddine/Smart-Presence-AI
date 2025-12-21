from datetime import datetime
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.message import Message, MessageThread
from app.models.user import User
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["messages"])


@router.get("/threads")
def get_message_threads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get message threads for the current user."""
    q = db.query(MessageThread).filter(
        (MessageThread.user1_id == current_user.id) | (MessageThread.user2_id == current_user.id)
    )
    threads = q.order_by(MessageThread.id.desc()).limit(50).all()

    # If no threads exist, create a single "support" thread with the first admin (if any).
    if not threads:
        admin_user = db.query(User).filter(User.role == "admin").order_by(User.id.asc()).first()
        if admin_user and admin_user.id != current_user.id:
            t = MessageThread(user1_id=current_user.id, user2_id=admin_user.id)
            db.add(t)
            db.commit()
            db.refresh(t)
            threads = [t]

    results = []
    for t in threads:
        other_user_id = t.user2_id if t.user1_id == current_user.id else t.user1_id
        other = db.query(User).filter(User.id == other_user_id).first()

        last = (
            db.query(Message)
            .filter(Message.thread_id == t.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        unread_count = (
            db.query(func.count(Message.id))
            .filter(
                Message.thread_id == t.id,
                Message.recipient_id == current_user.id,
                Message.read.is_(False),
            )
            .scalar()
            or 0
        )

        results.append(
            {
                "id": t.id,
                "participant_name": (other.username if other else "Utilisateur"),
                "participant_role": (other.role if other else "user"),
                "last_message": (last.content if last else ""),
                "last_message_at": (last.created_at.isoformat() if last and last.created_at else t.created_at.isoformat()),
                "unread_count": int(unread_count),
            }
        )

    # Sort by last activity desc
    results.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)
    return results


@router.get("/thread/{thread_id}")
def get_thread_messages(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get messages for a specific thread."""
    thread = (
        db.query(MessageThread)
        .filter(
            MessageThread.id == thread_id,
            (MessageThread.user1_id == current_user.id) | (MessageThread.user2_id == current_user.id),
        )
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    messages = (
        db.query(Message)
        .filter(Message.thread_id == thread_id)
        .order_by(Message.created_at.asc())
        .limit(200)
        .all()
    )

    sender_ids = {m.sender_id for m in messages}
    user_map = {}
    if sender_ids:
        rows = db.query(User.id, User.username).filter(User.id.in_(sender_ids)).all()
        user_map = {r[0]: r[1] for r in rows}

    # Mark incoming messages as read
    updated = False
    for m in messages:
        if m.recipient_id == current_user.id and not m.read:
            m.read = True
            updated = True
    if updated:
        db.commit()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_name": user_map.get(m.sender_id, "Utilisateur"),
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "read": bool(m.read),
        }
        for m in messages
    ]


@router.post("/send")
def send_message(
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to a thread."""
    thread_id = payload.get("thread_id")
    content = (payload.get("content") or "").strip()
    if not thread_id or not content:
        raise HTTPException(status_code=400, detail="Missing thread_id or content")

    thread = (
        db.query(MessageThread)
        .filter(
            MessageThread.id == int(thread_id),
            (MessageThread.user1_id == current_user.id) | (MessageThread.user2_id == current_user.id),
        )
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")

    recipient_id = thread.user2_id if thread.user1_id == current_user.id else thread.user1_id
    msg = Message(thread_id=thread.id, sender_id=current_user.id, recipient_id=recipient_id, content=content)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"status": "success", "id": msg.id, "timestamp": msg.created_at.isoformat() if msg.created_at else datetime.now().isoformat()}
