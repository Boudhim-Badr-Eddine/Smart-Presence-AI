from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.chatbot import (
    ChatbotConversationOut,
    ChatbotMessageOut,
    ChatbotAskIn,
)
from app.services.chatbot import ChatbotService
from app.utils.deps import get_current_user, get_db

router = APIRouter(tags=["chatbot"])


@router.post("/start", response_model=ChatbotConversationOut)
def start_conversation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new chatbot conversation."""
    conversation = ChatbotService.start_conversation(db, current_user.id, current_user.role)
    return conversation


@router.post("/message/{conversation_id}", response_model=ChatbotMessageOut)
def send_message(
    conversation_id: int,
    message: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a message to chatbot and get response."""
    response = ChatbotService.send_message(db, conversation_id, message)
    if not response:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return response


@router.get("/history/{conversation_id}")
def get_conversation_history(
    conversation_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation history."""
    messages = ChatbotService.get_conversation_history(db, conversation_id, limit)
    return {"conversation_id": conversation_id, "messages": messages, "count": len(messages)}


@router.post("/close/{conversation_id}")
def close_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Close a conversation."""
    conversation = ChatbotService.close_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "closed", "conversation_id": conversation.id}


@router.post("/feedback/{conversation_id}")
def set_satisfaction(
    conversation_id: int,
    score: int,
    feedback: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set user satisfaction with chatbot."""
    if not 1 <= score <= 5:
        raise HTTPException(status_code=400, detail="Score must be between 1 and 5")

    conversation = ChatbotService.set_satisfaction_score(db, conversation_id, score, feedback)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "score": score}


@router.post("/ask")
def ask_quick(
    question: str | None = None,
    payload: ChatbotAskIn | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Quick ask endpoint (no conversation tracking).

    Supports both query param `question` and JSON body `{ "question": "..." }`.
    """
    q = question or (payload.question if payload else None)
    if not q:
        raise HTTPException(status_code=422, detail="Field 'question' is required")
    response_text = ChatbotService.generate_response(q)
    intent = ChatbotService.detect_intent(q)
    # For frontend compatibility, return 'response' key
    return {"question": q, "response": response_text, "intent": intent}
