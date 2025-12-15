from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.session import SessionCreate, SessionOut
from app.models.session import Session as SessionModel
from app.utils.deps import get_db

router = APIRouter()


@router.get("/", response_model=list[SessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(SessionModel).all()


@router.post("/", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    session_obj = SessionModel(**payload.dict())
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return session_obj


@router.get("/{session_id}", response_model=SessionOut)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session_obj = db.query(SessionModel).get(session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_obj


@router.patch("/{session_id}", response_model=SessionOut)
def update_session(session_id: int, payload: SessionCreate, db: Session = Depends(get_db)):
    session_obj = db.query(SessionModel).get(session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    for k, v in payload.dict(exclude_unset=True).items():
        setattr(session_obj, k, v)
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return session_obj
