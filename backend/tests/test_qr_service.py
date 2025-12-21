import pytest
from datetime import datetime
from app.services.qr_code import QRCodeService
from app.models.session import Session as ClassSession


@pytest.fixture
def test_session(db_session):
    """Create test session."""
    session = ClassSession(
        module_id=1,
        trainer_id=1,
        classroom_id=1,
        session_date=datetime.utcnow().date(),
        start_time=datetime.utcnow().time(),
        end_time=datetime.utcnow().time(),
        title="Test Session",
        class_name="CS101",
    )
    db_session.add(session)
    db_session.commit()
    return session


def test_generate_qr_code(db_session, test_session):
    """Test QR code generation for a session."""
    service = QRCodeService(db_session)
    
    token, qr_image = service.generate_session_qr(test_session.id, trainer_id=1)
    
    assert token is not None
    assert len(token) > 20  # URL-safe token should be reasonably long
    assert qr_image is not None


def test_verify_qr_token_valid(db_session, test_session):
    """Test verifying a valid QR token."""
    service = QRCodeService(db_session)
    
    token, _ = service.generate_session_qr(test_session.id, trainer_id=1)
    
    # Verify immediately (should be valid)
    # Use a new service instance to ensure cache is not per-instance
    service2 = QRCodeService(db_session)
    metadata = service2.verify_qr_token(token)
    
    assert metadata is not None
    assert metadata["session_id"] == test_session.id


def test_verify_qr_token_invalid(db_session):
    """Test verifying an invalid QR token."""
    service = QRCodeService(db_session)
    
    metadata = service.verify_qr_token("invalid-token-12345")
    
    assert metadata is None


@pytest.mark.asyncio
async def test_process_qr_checkin(db_session, test_session, test_student):
    """Test processing QR code check-in."""
    service = QRCodeService(db_session)
    
    token, _ = service.generate_session_qr(test_session.id, trainer_id=1)
    
    result = await service.process_qr_checkin(token, test_student.id, gps_lat=40.7128, gps_lng=-74.0060)
    
    assert result["success"] is True
    assert result["attendance_id"] is not None
    assert result["attendance_id"] > 0
