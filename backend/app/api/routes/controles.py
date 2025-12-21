"""API routes for Controles (Tests/Exams) management."""

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.controle import Controle
from app.models.user import User
from app.schemas.controle import ControleCreate, ControleNotificationUpdate, ControleOut, ControleUpdate
from app.services.auth import get_current_user
from app.services.controle_notification import ControleNotificationService

router = APIRouter()


@router.post("/", response_model=ControleOut, status_code=201)
def create_controle(
    payload: ControleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new controle (admin/trainer only)."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    controle = Controle(
        module=payload.module,
        date=payload.date,
        class_name=payload.class_name,
        title=payload.title,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        trainer_id=payload.trainer_id,
    )
    
    db.add(controle)
    db.commit()
    db.refresh(controle)
    
    return controle


@router.get("/", response_model=List[ControleOut])
def list_controles(
    class_name: Optional[str] = Query(None, description="Filter by class"),
    module: Optional[str] = Query(None, description="Filter by module"),
    upcoming: bool = Query(False, description="Show only upcoming controles"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all controles with optional filters."""
    query = db.query(Controle).filter(Controle.is_deleted == False)
    
    if class_name:
        query = query.filter(Controle.class_name == class_name)
    
    if module:
        query = query.filter(Controle.module.ilike(f"%{module}%"))
    
    if upcoming:
        today = date.today()
        query = query.filter(Controle.date >= today)
    
    controles = query.order_by(Controle.date.desc()).all()
    return controles


@router.get("/{controle_id}", response_model=ControleOut)
def get_controle(
    controle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific controle by ID."""
    controle = db.query(Controle).filter(
        Controle.id == controle_id,
        Controle.is_deleted == False
    ).first()
    
    if not controle:
        raise HTTPException(status_code=404, detail="Controle not found")
    
    return controle


@router.put("/{controle_id}", response_model=ControleOut)
def update_controle(
    controle_id: int,
    payload: ControleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a controle (admin/trainer only)."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    controle = db.query(Controle).filter(
        Controle.id == controle_id,
        Controle.is_deleted == False
    ).first()
    
    if not controle:
        raise HTTPException(status_code=404, detail="Controle not found")
    
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(controle, field, value)
    
    db.commit()
    db.refresh(controle)
    
    return controle


@router.delete("/{controle_id}", status_code=204)
def delete_controle(
    controle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a controle (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    controle = db.query(Controle).filter(Controle.id == controle_id).first()
    
    if not controle:
        raise HTTPException(status_code=404, detail="Controle not found")
    
    controle.is_deleted = True
    db.commit()
    
    return None


@router.post("/{controle_id}/notify", response_model=ControleOut)
def notify_controle(
    controle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send notification for a controle and mark as notified (admin/trainer only)."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    controle = db.query(Controle).filter(
        Controle.id == controle_id,
        Controle.is_deleted == False
    ).first()
    
    if not controle:
        raise HTTPException(status_code=404, detail="Controle not found")
    
    if controle.notified:
        raise HTTPException(status_code=400, detail="Controle already notified")
    
    # Send notifications using the service
    notifications_sent = ControleNotificationService.notify_specific_controle(db, controle_id)
    
    return controle


@router.get("/upcoming/week", response_model=List[ControleOut])
def get_upcoming_controles_week(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all controles for the next 7 days."""
    today = date.today()
    next_week = today + timedelta(days=7)
    
    controles = db.query(Controle).filter(
        Controle.is_deleted == False,
        Controle.date >= today,
        Controle.date <= next_week
    ).order_by(Controle.date).all()
    
    return controles
