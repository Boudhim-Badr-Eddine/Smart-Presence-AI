"""Smart attendance API routes: self check-in, Teams integration, alerts."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.smart_attendance import (
    AttendanceAlertOut,
    AttendanceSessionCreate,
    AttendanceSessionOut,
    AttendanceSessionUpdate,
    FraudDetectionOut,
    LiveAttendanceSnapshot,
    SelfCheckinOut,
    TeamsParticipationOut,
)
from app.services.self_checkin import SelfCheckinService
from app.services.smart_alerts import SmartAlertsService
from app.services.teams_integration import TeamsIntegrationService
from app.utils.deps import get_current_user, get_db

router = APIRouter(prefix="/smart-attendance", tags=["smart-attendance"])


@router.post("/sessions", response_model=AttendanceSessionOut, status_code=201)
async def create_attendance_session(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session_data: AttendanceSessionCreate,
) -> AttendanceSessionOut:
    """
    Create a new smart attendance session configuration.
    Only trainers and admins can create attendance sessions.
    """
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can create attendance sessions")
    
    # Verify the session exists
    from app.models.session import Session as SessionModel
    from app.models.smart_attendance import AttendanceSession
    session = db.query(SessionModel).filter(SessionModel.id == session_data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if attendance session already exists
    existing = db.query(AttendanceSession).filter(
        AttendanceSession.session_id == session_data.session_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Attendance session already exists for this session")
    
    # Create attendance session
    attendance_session = AttendanceSession(
        session_id=session_data.session_id,
        mode=session_data.mode,
        checkin_window_minutes=session_data.checkin_window_minutes,
        location_verification_enabled=session_data.location_verification_enabled,
        classroom_lat=session_data.classroom_lat,
        classroom_lng=session_data.classroom_lng,
        allowed_radius_meters=session_data.allowed_radius_meters,
        teams_meeting_id=session_data.teams_meeting_id,
        teams_meeting_url=session_data.teams_meeting_url,
    )
    db.add(attendance_session)
    db.commit()
    db.refresh(attendance_session)
    
    return AttendanceSessionOut.from_orm(attendance_session)


@router.get("/sessions/{session_id}", response_model=AttendanceSessionOut)
async def get_attendance_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceSessionOut:
    """Get attendance session configuration."""
    from app.models.smart_attendance import AttendanceSession
    
    attendance_session = db.query(AttendanceSession).filter(
        AttendanceSession.session_id == session_id
    ).first()
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    return AttendanceSessionOut.from_orm(attendance_session)


@router.patch("/sessions/{session_id}", response_model=AttendanceSessionOut)
async def update_attendance_session(
    session_id: int,
    session_data: AttendanceSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceSessionOut:
    """Update attendance session configuration. Trainer/admin only."""
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can update attendance sessions")
    
    from app.models.smart_attendance import AttendanceSession
    
    attendance_session = db.query(AttendanceSession).filter(
        AttendanceSession.session_id == session_id
    ).first()
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not found")
    
    # Update fields
    for field, value in session_data.model_dump(exclude_unset=True).items():
        setattr(attendance_session, field, value)
    
    db.commit()
    db.refresh(attendance_session)
    
    return AttendanceSessionOut.from_orm(attendance_session)


@router.post("/self-checkin", response_model=SelfCheckinOut, status_code=201)
async def student_self_checkin(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    session_id: int = Query(..., description="Session ID to check in to"),
    photo: UploadFile = File(..., description="Selfie for facial verification"),
    latitude: Optional[float] = Form(None, description="Student's current latitude"),
    longitude: Optional[float] = Form(None, description="Student's current longitude"),
    device_id: Optional[str] = Form(None, description="Device identifier"),
) -> SelfCheckinOut:
    """
    Student self check-in with AI verification.
    Performs liveness detection, facial matching, and location verification.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can self check-in")
    
    # Get student record
    from app.models.student import Student
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    
    # Read photo bytes
    photo_bytes = await photo.read()
    if len(photo_bytes) > 10 * 1024 * 1024:  # 10 MB max
        raise HTTPException(status_code=400, detail="Photo trop volumineuse (max 10MB)")
    
    # Process check-in
    service = SelfCheckinService(db)
    try:
        checkin = await service.process_self_checkin(
            session_id=session_id,
            student_id=student.id,
            image_bytes=photo_bytes,
            latitude=latitude,
            longitude=longitude,
            device_id=device_id,
            ip_address=None,  # TODO: Extract from request
        )
        return SelfCheckinOut.from_orm(checkin)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions/{session_id}/live", response_model=LiveAttendanceSnapshot)
async def get_live_attendance(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LiveAttendanceSnapshot:
    """
    Get real-time attendance snapshot for a session.
    Shows all check-ins, pending verifications, and fraud flags.
    """
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can view live attendance")
    
    from app.models.session import Session as SessionModel
    from app.models.smart_attendance import (
        AttendanceSession,
        FraudDetection,
        SelfCheckin,
        TeamsParticipation,
    )
    
    # Get session info
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    attendance_session = db.query(AttendanceSession).filter(
        AttendanceSession.session_id == session_id
    ).first()
    
    if not attendance_session:
        raise HTTPException(status_code=404, detail="Attendance session not configured")
    
    # Get check-ins
    checkins = db.query(SelfCheckin).filter(
        SelfCheckin.attendance_session_id == attendance_session.id
    ).all()
    
    # Get Teams participations
    teams_participations = db.query(TeamsParticipation).filter(
        TeamsParticipation.attendance_session_id == attendance_session.id
    ).all()
    
    # Get fraud flags for this session
    fraud_flags = db.query(FraudDetection).filter(
        FraudDetection.session_id == session_id,
        FraudDetection.is_resolved == False
    ).all()
    
    return LiveAttendanceSnapshot(
        session_id=session_id,
        mode=attendance_session.mode,
        total_students_expected=0,  # TODO: Calculate from session enrollment
        total_checked_in=len([c for c in checkins if c.status == "approved"]),
        pending_verification=len([c for c in checkins if c.status == "flagged"]),
        fraud_flags_count=len(fraud_flags),
        recent_checkins=[SelfCheckinOut.from_orm(c) for c in checkins[-10:]],
        recent_teams_joins=[TeamsParticipationOut.from_orm(t) for t in teams_participations[-10:]],
    )


@router.get("/alerts", response_model=List[AttendanceAlertOut])
async def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    severity: Optional[str] = Query(None, description="Filter by severity: low, medium, high"),
    unacknowledged_only: bool = Query(True, description="Show only unacknowledged alerts"),
) -> List[AttendanceAlertOut]:
    """Get attendance alerts for the current user (trainer/admin)."""
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can view alerts")
    
    service = SmartAlertsService(db)
    alerts = service.get_pending_alerts(trainer_id=current_user.id, severity=severity)
    
    if not unacknowledged_only:
        # Fetch all alerts if requested
        from app.models.smart_attendance import AttendanceAlert
        query = db.query(AttendanceAlert)
        if severity:
            query = query.filter(AttendanceAlert.severity == severity)
        alerts = query.order_by(AttendanceAlert.created_at.desc()).limit(100).all()
    
    return [AttendanceAlertOut.from_orm(alert) for alert in alerts]


@router.patch("/alerts/{alert_id}/acknowledge", response_model=AttendanceAlertOut)
async def acknowledge_alert(
    alert_id: int,
    action_taken: str = Query(..., description="Description of action taken"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceAlertOut:
    """Acknowledge an attendance alert."""
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can acknowledge alerts")
    
    service = SmartAlertsService(db)
    alert = service.acknowledge_alert(alert_id, current_user.id, action_taken)
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return AttendanceAlertOut.from_orm(alert)


@router.get("/fraud-detections", response_model=List[FraudDetectionOut])
async def get_fraud_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
) -> List[FraudDetectionOut]:
    """Get fraud detection records. Admin only."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view fraud detections")
    
    from app.models.smart_attendance import FraudDetection
    
    query = db.query(FraudDetection)
    if resolved is not None:
        query = query.filter(FraudDetection.is_resolved == resolved)
    if severity:
        query = query.filter(FraudDetection.severity == severity)
    
    fraud_records = query.order_by(FraudDetection.created_at.desc()).limit(100).all()
    
    return [FraudDetectionOut.from_orm(record) for record in fraud_records]


@router.patch("/fraud-detections/{fraud_id}/resolve", response_model=FraudDetectionOut)
async def resolve_fraud_detection(
    fraud_id: int,
    resolution_notes: str = Query(..., description="Notes about how the fraud was resolved"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FraudDetectionOut:
    """Mark a fraud detection as resolved. Admin only."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can resolve fraud detections")
    
    from datetime import datetime

    from app.models.smart_attendance import FraudDetection
    
    fraud = db.query(FraudDetection).filter(FraudDetection.id == fraud_id).first()
    if not fraud:
        raise HTTPException(status_code=404, detail="Fraud detection not found")
    
    fraud.is_resolved = True
    fraud.resolved_by_user_id = current_user.id
    fraud.resolution_notes = resolution_notes
    fraud.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(fraud)
    
    return FraudDetectionOut.from_orm(fraud)


@router.post("/teams/sync", status_code=200)
async def sync_teams_meeting(
    meeting_id: str = Query(..., description="Teams meeting ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a sync of Teams meeting participation data.
    This endpoint can be called manually or via webhook.
    """
    if current_user.role not in ["trainer", "admin"]:
        raise HTTPException(status_code=403, detail="Only trainers and admins can sync Teams data")
    
    service = TeamsIntegrationService(db)
    
    # Graph API integration is not implemented yet.
    raise HTTPException(
        status_code=501,
        detail="Teams sync not implemented yet (Microsoft Graph integration required)",
    )
