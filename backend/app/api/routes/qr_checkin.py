"""QR code check-in routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.student import Student
from app.models.user import User
from app.services import auth as auth_service
from app.services.qr_code import QRCodeService

router = APIRouter(prefix="/qr", tags=["qr-checkin"])


class QRCheckinRequest(BaseModel):
    token: str
    gps_lat: Optional[float] = None
    gps_lng: Optional[float] = None


@router.post("/generate/{session_id}")
async def generate_qr_code(
    session_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db),
):
    """Generate QR code for session check-in (trainer/admin only)."""
    if current_user.role not in ['trainer', 'admin']:
        raise HTTPException(status_code=403, detail="Trainer or admin access required")
    
    qr_service = QRCodeService(db)
    
    try:
        _token, qr_buffer = qr_service.generate_session_qr(
            session_id=session_id,
            trainer_id=current_user.id,
        )
        
        return StreamingResponse(
            qr_buffer,
            media_type="image/png",
            headers={
                "Content-Disposition": f"inline; filename=qr_session_{session_id}.png"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkin")
async def qr_checkin(
    request: QRCheckinRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_db),
):
    """Student QR code check-in."""
    if current_user.role != 'student':
        raise HTTPException(status_code=403, detail="Student access required")

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")
    
    qr_service = QRCodeService(db)
    
    result = await qr_service.process_qr_checkin(
        token=request.token,
        student_id=student.id,
        gps_lat=request.gps_lat,
        gps_lng=request.gps_lng,
    )
    
    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error', 'Check-in failed'))
    
    return result


@router.get("/verify/{token}")
async def verify_qr_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Verify QR code token validity (public endpoint)."""
    qr_service = QRCodeService(db)
    metadata = qr_service.verify_qr_token(token)
    
    if not metadata:
        raise HTTPException(status_code=404, detail="Invalid or expired QR code")
    
    return {
        "valid": True,
        "session_id": metadata['session_id'],
        "expires_at": metadata.get('expires_at'),
    }
