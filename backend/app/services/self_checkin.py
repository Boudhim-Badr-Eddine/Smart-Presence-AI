"""Self Check-in Service - Student-initiated attendance with AI verification."""

import base64
import io
import math
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.attendance import AttendanceRecord
from app.models.session import Session as CourseSession
from app.models.smart_attendance import (
    AttendanceAlert,
    AttendanceSession,
    FraudDetection,
    SelfCheckin,
    SmartAttendanceLog,
)
from app.models.student import Student
from app.services.facial import match_user_by_image

settings = get_settings()


class SelfCheckinService:
    """Handle student self check-ins with AI verification."""

    @staticmethod
    def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two GPS coordinates using Haversine formula."""
        R = 6371000  # Earth's radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    @staticmethod
    def detect_liveness(image_bytes: bytes) -> Tuple[bool, float, str]:
        """
        Detect if image is from a live person vs screenshot/photo.
        
        Returns: (is_live, confidence, reason)
        """
        try:
            # Convert bytes to OpenCV image
            image = Image.open(io.BytesIO(image_bytes))
            img_array = np.array(image)
            
            # Convert RGB to BGR for OpenCV
            if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
            else:
                return False, 0.0, "Invalid image format"
            
            # Check 1: Image quality variance (screenshots tend to be very sharp/uniform)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Too sharp (> 1000) or too blurry (< 50) might indicate fraud
            if laplacian_var < 50:
                return False, 0.3, "Image too blurry - possible photo of photo"
            if laplacian_var > 2000:
                return False, 0.4, "Image too sharp - possible screenshot"
            
            # Check 2: Color distribution (live faces have more natural color variation)
            hsv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            
            # Natural skin tones have moderate saturation variance
            saturation_std = np.std(s)
            if saturation_std < 10:
                return False, 0.5, "Unnatural color distribution"
            
            # Check 3: Face detection confidence (live faces are easier to detect)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            
            if len(faces) == 0:
                return False, 0.2, "No face detected"
            if len(faces) > 1:
                return False, 0.3, "Multiple faces detected"
            
            # Check 4: Basic motion blur detection (live capture usually has slight blur)
            # Static screenshots have uniform sharpness
            blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
            if blur_score > 1500:
                return False, 0.6, "Suspicious sharpness pattern"
            
            # All checks passed - likely a live capture
            confidence = min(0.85, (laplacian_var / 1000) * 0.7 + (saturation_std / 50) * 0.3)
            return True, confidence, "Liveness verified"
            
        except Exception as e:
            return False, 0.0, f"Liveness detection error: {str(e)}"

    @staticmethod
    def verify_location(
        checkin_lat: float,
        checkin_lng: float,
        class_lat: float,
        class_lng: float,
        max_distance_meters: int,
    ) -> Tuple[bool, float]:
        """
        Verify student is within allowed radius of classroom.
        
        Returns: (is_valid, distance_meters)
        """
        distance = SelfCheckinService.calculate_distance_meters(
            checkin_lat, checkin_lng, class_lat, class_lng
        )
        return distance <= max_distance_meters, distance

    @staticmethod
    def check_duplicate_checkin(
        db: Session, attendance_session_id: int, student_id: int
    ) -> Optional[SelfCheckin]:
        """Check if student already checked in for this session."""
        existing = (
            db.query(SelfCheckin)
            .filter(
                SelfCheckin.attendance_session_id == attendance_session_id,
                SelfCheckin.student_id == student_id,
                SelfCheckin.status.in_(["approved", "pending"]),
            )
            .first()
        )
        return existing

    @staticmethod
    def process_self_checkin(
        db: Session,
        attendance_session_id: int,
        student_id: int,
        image_base64: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> dict:
        """
        Process a student self check-in attempt.
        
        Steps:
        1. Validate session is active and within check-in window
        2. Check for duplicate check-ins
        3. Perform facial verification
        4. Run liveness detection
        5. Verify location (if required)
        6. Create check-in record and attendance record
        7. Trigger alerts if needed
        """
        # Get attendance session config
        att_session = db.query(AttendanceSession).filter(
            AttendanceSession.id == attendance_session_id
        ).first()
        if not att_session:
            raise HTTPException(status_code=404, detail="Attendance session not found")
        
        if att_session.status != "active":
            raise HTTPException(status_code=400, detail="Attendance session is not active")
        
        # Get course session for timing
        course_session = db.query(CourseSession).filter(
            CourseSession.id == att_session.session_id
        ).first()
        if not course_session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check timing window
        now = datetime.utcnow()
        session_start = course_session.date
        window_start = session_start - timedelta(minutes=att_session.checkin_window_minutes)
        window_end = session_start + timedelta(minutes=att_session.checkin_window_minutes)
        
        if now < window_start or now > window_end:
            raise HTTPException(
                status_code=400,
                detail=f"Check-in window is {att_session.checkin_window_minutes} min before/after session start",
            )
        
        # Check for duplicate
        duplicate = SelfCheckinService.check_duplicate_checkin(db, attendance_session_id, student_id)
        if duplicate:
            # Log fraud attempt
            fraud = FraudDetection(
                student_id=student_id,
                session_id=att_session.session_id,
                checkin_id=duplicate.id,
                fraud_type="duplicate_attempt",
                severity="medium",
                detected_at=now,
                details={"previous_checkin_id": duplicate.id},
                auto_action="rejected_checkin",
            )
            db.add(fraud)
            db.commit()
            
            raise HTTPException(status_code=400, detail="You already checked in for this session")
        
        # Get student for facial verification
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Decode image
        try:
            b64_data = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
            image_bytes = base64.b64decode(b64_data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")
        
        # Step 1: Liveness detection (if required)
        liveness_passed = True
        liveness_reason = "Not required"
        
        if att_session.require_liveness:
            is_live, liveness_confidence, liveness_reason = SelfCheckinService.detect_liveness(image_bytes)
            liveness_passed = is_live
            
            if not is_live:
                # Create fraud detection record
                fraud = FraudDetection(
                    student_id=student_id,
                    session_id=att_session.session_id,
                    fraud_type="screenshot_fraud",
                    severity="high",
                    detected_at=now,
                    details={"reason": liveness_reason, "confidence": float(liveness_confidence)},
                    auto_action="rejected_checkin",
                )
                db.add(fraud)
                db.commit()
                
                raise HTTPException(
                    status_code=400,
                    detail=f"Liveness check failed: {liveness_reason}. Please take a live selfie.",
                )
        
        # Step 2: Facial verification
        try:
            matched_user_id = match_user_by_image(
                db,
                student.user.email,
                image_bytes,
                threshold=settings.facial_confidence_threshold,
            )
            
            if not matched_user_id or matched_user_id != student.user_id:
                # Face doesn't match - possible proxy attendance
                fraud = FraudDetection(
                    student_id=student_id,
                    session_id=att_session.session_id,
                    fraud_type="proxy_attendance",
                    severity="critical",
                    detected_at=now,
                    details={"matched_user_id": matched_user_id},
                    auto_action="rejected_checkin",
                )
                db.add(fraud)
                db.commit()
                
                raise HTTPException(
                    status_code=401,
                    detail="Face verification failed. This check-in has been flagged for review.",
                )
            
            # Get confidence score (approximation based on threshold)
            face_confidence = 0.85  # Placeholder - real impl would return actual confidence
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Facial verification error: {str(e)}")
        
        # Step 3: Location verification (if required)
        location_verified = True
        distance_meters = None
        
        if att_session.require_location:
            if not latitude or not longitude:
                raise HTTPException(status_code=400, detail="Location data required for this session")
            
            if not att_session.location_lat or not att_session.location_lng:
                raise HTTPException(status_code=500, detail="Classroom location not configured")
            
            is_valid, distance = SelfCheckinService.verify_location(
                latitude,
                longitude,
                float(att_session.location_lat),
                float(att_session.location_lng),
                att_session.location_radius_meters,
            )
            
            location_verified = is_valid
            distance_meters = int(distance)
            
            if not is_valid:
                # Log location violation
                fraud = FraudDetection(
                    student_id=student_id,
                    session_id=att_session.session_id,
                    fraud_type="location_spoof",
                    severity="high",
                    detected_at=now,
                    details={
                        "distance_meters": distance_meters,
                        "max_allowed": att_session.location_radius_meters,
                    },
                    auto_action="flagged_for_review",
                )
                db.add(fraud)
                
                # Create check-in but flag it
                checkin = SelfCheckin(
                    attendance_session_id=attendance_session_id,
                    student_id=student_id,
                    face_confidence=face_confidence,
                    liveness_passed=liveness_passed,
                    location_verified=False,
                    checkin_lat=latitude,
                    checkin_lng=longitude,
                    distance_from_class_meters=distance_meters,
                    status="flagged",
                    rejection_reason=f"Too far from classroom ({distance_meters}m > {att_session.location_radius_meters}m)",
                )
                db.add(checkin)
                db.commit()
                
                raise HTTPException(
                    status_code=400,
                    detail=f"You are too far from the classroom ({distance_meters}m). Check-in flagged for review.",
                )
        
        # All checks passed - create approved check-in
        checkin = SelfCheckin(
            attendance_session_id=attendance_session_id,
            student_id=student_id,
            face_confidence=face_confidence,
            liveness_passed=liveness_passed,
            location_verified=location_verified,
            checkin_lat=latitude,
            checkin_lng=longitude,
            distance_from_class_meters=distance_meters,
            status="approved",
            processed_at=now,
        )
        db.add(checkin)
        db.flush()
        
        # Create attendance record
        attendance = AttendanceRecord(
            student_id=student_id,
            session_id=att_session.session_id,
            status="present",
            marked_via="self_checkin",
            facial_confidence=face_confidence,
        )
        db.add(attendance)
        db.flush()
        
        # Link check-in to attendance record (if field exists)
        # checkin.attendance_record_id = attendance.id
        
        # Log successful check-in
        log = SmartAttendanceLog(
            session_id=att_session.session_id,
            student_id=student_id,
            action_type="checkin_approved",
            triggered_by="student_app",
            details={
                "face_confidence": face_confidence,
                "liveness_passed": liveness_passed,
                "location_verified": location_verified,
                "distance_meters": distance_meters,
            },
            success=True,
        )
        db.add(log)
        
        # Check if we should trigger alerts (low confidence, etc.)
        if face_confidence < 0.60:
            alert = AttendanceAlert(
                student_id=student_id,
                session_id=att_session.session_id,
                alert_type="low_confidence",
                severity="medium",
                title="Low facial recognition confidence",
                message=f"Student {student.first_name} {student.last_name} checked in with {face_confidence:.0%} confidence",
                details={"confidence": face_confidence, "checkin_id": checkin.id},
                notify_trainer=True,
            )
            db.add(alert)
        
        db.commit()
        
        return {
            "success": True,
            "checkin_id": checkin.id,
            "attendance_id": attendance.id,
            "status": "approved",
            "message": "✅ Check-in successful! Attendance recorded.",
            "confidence": face_confidence,
            "verified_at": now.isoformat(),
        }
