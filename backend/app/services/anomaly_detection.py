"""
ML-based Anomaly Detection for Attendance Fraud
Uses Isolation Forest and statistical analysis
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sqlalchemy.orm import Session

from app.models.attendance import AttendanceRecord
from app.models.smart_attendance import SelfCheckin


class AnomalyDetectionService:
    """ML-based fraud and anomaly detection."""
    
    def __init__(self):
        self.model = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            random_state=42,
            n_estimators=100,
        )
        self.scaler = StandardScaler()
    
    def detect_checkin_anomalies(
        self,
        db: Session,
        student_id: int,
        session_id: int,
    ) -> Dict[str, Any]:
        """
        Detect anomalies in a student's check-in behavior.
        
        Returns:
            {
                "is_anomaly": bool,
                "anomaly_score": float,
                "anomaly_reasons": List[str],
                "features": Dict[str, float],
            }
        """
        
        # Get student's historical check-ins
        historical_checkins = db.query(SelfCheckin).filter(
            SelfCheckin.student_id == student_id
        ).order_by(SelfCheckin.created_at.desc()).limit(50).all()
        
        if len(historical_checkins) < 5:
            # Not enough data for anomaly detection
            return {
                "is_anomaly": False,
                "anomaly_score": 0.0,
                "anomaly_reasons": [],
                "features": {},
                "note": "Insufficient historical data",
            }
        
        # Extract features from current check-in
        current_checkin = historical_checkins[0]
        current_features = self._extract_checkin_features(current_checkin)
        
        # Extract features from historical check-ins
        historical_features = [
            self._extract_checkin_features(ci) for ci in historical_checkins[1:]
        ]
        
        # Convert to numpy arrays
        X_historical = np.array([list(f.values()) for f in historical_features])
        X_current = np.array([list(current_features.values())])
        
        # Normalize features
        X_historical_scaled = self.scaler.fit_transform(X_historical)
        X_current_scaled = self.scaler.transform(X_current)
        
        # Train model on historical data
        self.model.fit(X_historical_scaled)
        
        # Predict if current check-in is anomaly
        prediction = self.model.predict(X_current_scaled)[0]
        anomaly_score = self.model.score_samples(X_current_scaled)[0]
        
        is_anomaly = prediction == -1
        
        # Identify specific anomaly reasons
        anomaly_reasons = self._identify_anomaly_reasons(
            current_features, historical_features
        )
        
        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": float(anomaly_score),
            "anomaly_reasons": anomaly_reasons,
            "features": current_features,
        }
    
    def _extract_checkin_features(self, checkin: SelfCheckin) -> Dict[str, float]:
        """Extract numerical features from a check-in."""
        
        # Time-based features
        hour_of_day = checkin.created_at.hour if checkin.created_at else 0
        day_of_week = checkin.created_at.weekday() if checkin.created_at else 0
        
        # Confidence features
        face_confidence = float(checkin.face_confidence) if checkin.face_confidence else 0.0
        liveness_passed = 1.0 if checkin.liveness_passed else 0.0
        location_verified = 1.0 if checkin.location_verified else 0.0
        
        # Location features
        distance = float(checkin.distance_from_class_meters) if checkin.distance_from_class_meters else 0.0
        
        # Status features
        status_approved = 1.0 if checkin.status == "approved" else 0.0
        status_rejected = 1.0 if checkin.status == "rejected" else 0.0
        status_flagged = 1.0 if checkin.status == "flagged" else 0.0
        
        return {
            "hour_of_day": float(hour_of_day),
            "day_of_week": float(day_of_week),
            "face_confidence": face_confidence,
            "liveness_passed": liveness_passed,
            "location_verified": location_verified,
            "distance_meters": distance,
            "status_approved": status_approved,
            "status_rejected": status_rejected,
            "status_flagged": status_flagged,
        }
    
    def _identify_anomaly_reasons(
        self,
        current: Dict[str, float],
        historical: List[Dict[str, float]],
    ) -> List[str]:
        """Identify specific reasons for anomaly."""
        
        reasons = []
        
        # Calculate statistics from historical data
        for key in current.keys():
            if key in ['status_approved', 'status_rejected', 'status_flagged']:
                continue
            
            historical_values = [h[key] for h in historical]
            mean = np.mean(historical_values)
            std = np.std(historical_values)
            
            if std == 0:
                continue
            
            # Check if current value is outlier (> 2 standard deviations)
            z_score = abs((current[key] - mean) / std)
            
            if z_score > 2:
                if key == "hour_of_day":
                    reasons.append(f"Unusual check-in time ({current[key]:.0f}h)")
                elif key == "face_confidence":
                    if current[key] < mean:
                        reasons.append(f"Low facial confidence ({current[key]:.2f})")
                    else:
                        reasons.append(f"Unusually high facial confidence ({current[key]:.2f})")
                elif key == "distance_meters":
                    if current[key] > mean:
                        reasons.append(f"Unusual distance from classroom ({current[key]:.0f}m)")
                elif key == "liveness_passed" and current[key] == 0:
                    reasons.append("Liveness check failed")
                elif key == "location_verified" and current[key] == 0:
                    reasons.append("Location verification failed")
        
        return reasons
    
    def detect_attendance_patterns(
        self,
        db: Session,
        student_id: int,
        lookback_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Detect unusual attendance patterns over time.
        
        Returns suspicious patterns like:
        - Always present on specific days
        - Never present on specific days
        - Consistent timing patterns that seem automated
        """
        
        cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)
        
        attendance_records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.created_at >= cutoff_date,
        ).all()
        
        if len(attendance_records) < 10:
            return {"patterns": [], "note": "Insufficient data"}
        
        patterns = []
        
        # Analyze day-of-week patterns
        day_counts = {i: {"present": 0, "total": 0} for i in range(7)}
        for record in attendance_records:
            day = record.created_at.weekday() if record.created_at else 0
            day_counts[day]["total"] += 1
            if record.status == "present":
                day_counts[day]["present"] += 1
        
        # Check for perfect attendance on specific days
        for day, counts in day_counts.items():
            if counts["total"] >= 4:  # At least 4 occurrences
                rate = counts["present"] / counts["total"]
                if rate == 1.0:
                    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                    patterns.append(f"Perfect attendance every {day_names[day]} (suspicious)")
                elif rate == 0.0:
                    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                    patterns.append(f"Never present on {day_names[day]}")
        
        # Analyze timing patterns
        checkin_times = []
        for record in attendance_records:
            if record.created_at:
                checkin_times.append(record.created_at.hour * 60 + record.created_at.minute)
        
        if checkin_times:
            time_std = np.std(checkin_times)
            if time_std < 5:  # Less than 5 minutes variation
                patterns.append(f"Suspiciously consistent check-in times (±{time_std:.1f} min)")
        
        return {
            "patterns": patterns,
            "day_counts": day_counts,
        }
    
    def predict_absenteeism_risk(
        self,
        db: Session,
        student_id: int,
    ) -> Dict[str, Any]:
        """
        Predict the risk of future absenteeism based on historical patterns.
        
        Returns:
            {
                "risk_score": float (0-1),
                "risk_level": str (low, medium, high),
                "factors": List[str],
            }
        """
        
        # Get last 60 days of attendance
        cutoff_date = datetime.utcnow() - timedelta(days=60)
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.created_at >= cutoff_date,
        ).all()
        
        if len(records) < 5:
            return {"risk_score": 0.0, "risk_level": "unknown", "factors": ["Insufficient data"]}
        
        # Calculate features
        total_sessions = len(records)
        present_count = sum(1 for r in records if r.status == "present")
        attendance_rate = present_count / total_sessions if total_sessions > 0 else 0
        
        # Recent trend (last 7 days vs previous 30 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        recent_records = [r for r in records if r.created_at and r.created_at >= recent_cutoff]
        older_records = [r for r in records if r.created_at and r.created_at < recent_cutoff]
        
        recent_rate = sum(1 for r in recent_records if r.status == "present") / len(recent_records) if recent_records else 0
        older_rate = sum(1 for r in older_records if r.status == "present") / len(older_records) if older_records else 0
        
        # Calculate risk score
        risk_score = 0.0
        factors = []
        
        if attendance_rate < 0.7:
            risk_score += 0.3
            factors.append(f"Low overall attendance rate ({attendance_rate:.1%})")
        
        if recent_rate < older_rate - 0.2:
            risk_score += 0.4
            factors.append("Declining attendance trend")
        
        # Check for consecutive absences
        consecutive_absences = 0
        max_consecutive = 0
        for record in sorted(records, key=lambda r: r.created_at if r.created_at else datetime.min):
            if record.status != "present":
                consecutive_absences += 1
                max_consecutive = max(max_consecutive, consecutive_absences)
            else:
                consecutive_absences = 0
        
        if max_consecutive >= 3:
            risk_score += 0.3
            factors.append(f"{max_consecutive} consecutive absences detected")
        
        # Determine risk level
        if risk_score < 0.3:
            risk_level = "low"
        elif risk_score < 0.6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "risk_score": min(risk_score, 1.0),
            "risk_level": risk_level,
            "factors": factors,
            "attendance_rate": attendance_rate,
            "recent_trend": recent_rate - older_rate,
        }
