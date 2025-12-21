"""QR code generation and check-in service."""

import secrets
from datetime import datetime, timedelta
from io import BytesIO
from typing import Any, Dict, Optional

import qrcode
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import logger
from app.models.attendance import Attendance
from app.models.session import Session as ClassSession
from app.utils.cache import TTLCache, redis_cache


_local_qr_cache = TTLCache(default_ttl=15 * 60)


class QRCodeService:
    """Service for QR code generation and check-in."""
    
    def __init__(self, db: Session):
        self.db = db
        self.qr_expiry_minutes = 15  # QR codes expire after 15 minutes
        # Legacy in-memory dict (kept for backward compatibility in tests)
        self.active_qr_codes: Dict[str, Dict[str, Any]] = {}

    def _qr_key(self, token: str) -> str:
        return f"qr:token:{token}"
    
    def generate_session_qr(
        self,
        session_id: int,
        trainer_id: int,
    ) -> tuple[str, BytesIO]:
        """
        Generate QR code for attendance check-in.
        
        Args:
            session_id: Session ID
            trainer_id: Trainer creating the QR code
            
        Returns:
            BytesIO buffer with QR code image
        """
        session = self.db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        
        expires_at = datetime.utcnow() + timedelta(minutes=self.qr_expiry_minutes)
        metadata = {
            'session_id': session_id,
            'trainer_id': trainer_id,
            'created_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at.isoformat(),
        }

        ttl_seconds = int(self.qr_expiry_minutes * 60)
        # Prefer Redis so tokens survive across requests/restarts.
        if redis_cache and redis_cache.available():
            redis_cache.set(self._qr_key(token), metadata, ttl=ttl_seconds)
        else:
            _local_qr_cache.set(self._qr_key(token), metadata, ttl=ttl_seconds)
            # Also keep in instance dict for older callers
            self.active_qr_codes[token] = metadata
        
        # Create QR code data (URL to check-in endpoint)
        base_url = getattr(settings, 'frontend_url', 'http://localhost:3000')
        qr_data = f"{base_url}/student/qr-checkin?token={token}"
        
        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to buffer
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        logger.info(f"Generated QR code for session {session_id}, token: {token[:8]}...")
        return token, buffer
    
    def verify_qr_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify QR code token is valid.
        
        Args:
            token: QR code token
            
        Returns:
            Token metadata if valid, None otherwise
        """
        key = self._qr_key(token)
        metadata = None

        if redis_cache and redis_cache.available():
            metadata = redis_cache.get(key)
        else:
            metadata = _local_qr_cache.get(key) or self.active_qr_codes.get(token)

        if not metadata:
            logger.warning(f"Invalid QR token: {token[:8]}...")
            return None

        # Expiry is enforced by cache TTL; keep a soft check for safety.
        try:
            expires_at = datetime.fromisoformat(metadata.get('expires_at'))
            if datetime.utcnow() > expires_at:
                logger.warning(f"Expired QR token: {token[:8]}...")
                return None
        except Exception:
            pass

        return metadata
    
    async def process_qr_checkin(
        self,
        token: str,
        student_id: int,
        gps_lat: Optional[float] = None,
        gps_lng: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Process QR code check-in.
        
        Args:
            token: QR code token
            student_id: Student checking in
            gps_lat: GPS latitude (optional)
            gps_lng: GPS longitude (optional)
            
        Returns:
            Check-in result
        """
        # Verify token
        metadata = self.verify_qr_token(token)
        if not metadata:
            return {
                'success': False,
                'error': 'Invalid or expired QR code',
            }
        
        session_id = metadata['session_id']
        
        # Check if already checked in
        existing = (
            self.db.query(Attendance)
            .filter(
                Attendance.session_id == session_id,
                Attendance.student_id == student_id,
            )
            .first()
        )
        
        if existing:
            return {
                'success': False,
                'error': 'Already checked in for this session',
                'attendance_id': existing.id,
            }
        
        # Create attendance record
        attendance = Attendance(
            session_id=session_id,
            student_id=student_id,
            status='present',
            marked_via='qr_code',
            marked_at=datetime.utcnow(),
        )
        
        # Add GPS if provided
        if gps_lat is not None and gps_lng is not None:
            attendance.location_data = {"latitude": gps_lat, "longitude": gps_lng}
        
        self.db.add(attendance)
        self.db.commit()
        self.db.refresh(attendance)
        
        logger.info(f"QR check-in successful: student {student_id}, session {session_id}")
        
        return {
            'success': True,
            'attendance_id': attendance.id,
            'session_id': session_id,
            'checked_in_at': attendance.marked_at.isoformat(),
        }
    
    def cleanup_expired_tokens(self) -> int:
        """Remove expired QR tokens. Returns count of removed tokens."""
        # Redis/local TTL handle expiry automatically.
        return 0
