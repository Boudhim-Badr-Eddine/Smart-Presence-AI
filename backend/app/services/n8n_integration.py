"""
N8N Integration Service
Sends webhooks to N8N workflows for automation
"""
import httpx
from typing import Optional, Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class N8NIntegrationService:
    """Service to communicate with N8N workflows."""
    
    def __init__(self, n8n_base_url: str = "http://localhost:5678"):
        """
        Initialize N8N integration service.
        
        Args:
            n8n_base_url: Base URL where N8N is running (e.g., http://192.168.1.100:5678)
        """
        self.n8n_base_url = n8n_base_url.rstrip('/')
        self.timeout = httpx.Timeout(10.0, connect=5.0)
    
    async def trigger_absence_notification(
        self,
        student_id: int,
        student_firstname: str,
        student_lastname: str,
        parent_email: str,
        absence_date: str,
        absence_hours: float,
        class_name: str
    ) -> bool:
        """
        Trigger N8N workflow for absence notification to parents.
        
        Workflow 1: Email to parents on absence
        """
        payload = {
            "event": "absence_recorded",
            "student_id": student_id,
            "firstname": student_firstname,
            "lastname": student_lastname,
            "parent_email": parent_email,
            "date": absence_date,
            "hours": absence_hours,
            "class": class_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._send_webhook("absence-notification", payload)
    
    async def trigger_controle_reminder(
        self,
        student_id: int,
        student_email: str,
        student_firstname: str,
        student_lastname: str,
        controle_module: str,
        controle_date: str,
        class_name: str
    ) -> bool:
        """
        Trigger N8N workflow for controle reminder (72h before).
        
        Workflow 2: Email to students 72h before exam
        """
        payload = {
            "event": "controle_reminder",
            "student_id": student_id,
            "email": student_email,
            "firstname": student_firstname,
            "lastname": student_lastname,
            "module": controle_module,
            "date": controle_date,
            "class": class_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._send_webhook("controle-reminder", payload)
    
    async def trigger_cumulative_absence_alert(
        self,
        student_id: int,
        student_firstname: str,
        student_lastname: str,
        parent_phone: str,
        total_absence_hours: float,
        class_name: str
    ) -> bool:
        """
        Trigger N8N workflow for WhatsApp alert when >8h absences.
        
        Workflow 3: WhatsApp to parents if student exceeds 8h cumulative absences
        """
        payload = {
            "event": "cumulative_absence_alert",
            "student_id": student_id,
            "firstname": student_firstname,
            "lastname": student_lastname,
            "parent_phone": parent_phone,
            "total_absence_hours": total_absence_hours,
            "class": class_name,
            "threshold_exceeded": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._send_webhook("absence-alert-whatsapp", payload)
    
    async def trigger_attendance_score_update(
        self,
        student_id: int,
        student_firstname: str,
        student_lastname: str,
        attendance_rate: float,
        total_absence_hours: float,
        class_name: str
    ) -> bool:
        """
        Trigger N8N workflow for AI-powered attendance score calculation.
        
        Workflow 4: Dashboard Admin - AI attendance score + explanation
        """
        payload = {
            "event": "attendance_score_update",
            "student_id": student_id,
            "firstname": student_firstname,
            "lastname": student_lastname,
            "attendance_rate": attendance_rate,
            "total_absence_hours": total_absence_hours,
            "class": class_name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._send_webhook("attendance-score", payload)
    
    async def trigger_daily_absence_summary(
        self,
        class_name: str,
        date: str,
        absences: list
    ) -> bool:
        """
        Trigger N8N workflow for daily absence summary PDF generation.
        
        Workflow 5: Daily class absence summary PDF
        
        Args:
            class_name: Name of the class
            date: Date of the report (YYYY-MM-DD)
            absences: List of absence records with student info
        """
        payload = {
            "event": "daily_absence_summary",
            "class": class_name,
            "date": date,
            "absences": absences,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return await self._send_webhook("daily-absence-pdf", payload)
    
    async def _send_webhook(self, workflow_name: str, payload: Dict[str, Any]) -> bool:
        """
        Send webhook to N8N.
        
        Args:
            workflow_name: Name of the workflow (used for logging)
            payload: Data to send
            
        Returns:
            True if successful, False otherwise
        """
        # N8N workflows are triggered by the schedule, not webhooks in your setup
        # So we'll use the database tables that N8N queries
        # This method is for future webhook-based integration
        
        try:
            logger.info(f"N8N Event: {workflow_name} - {payload.get('event')}")
            # In your current setup, N8N reads from database directly
            # So we just log the event - the database changes trigger N8N
            return True
            
        except Exception as e:
            logger.error(f"Failed to send N8N webhook {workflow_name}: {str(e)}")
            return False


# Singleton instance
n8n_service = N8NIntegrationService()
