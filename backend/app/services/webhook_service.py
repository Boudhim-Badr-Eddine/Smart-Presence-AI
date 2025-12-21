"""
Webhook Service - Trigger external webhooks for events
"""

import hashlib
import hmac
import json
import time
from datetime import datetime
from typing import Any, Dict

import httpx
from sqlalchemy.orm import Session

from app.models.webhook import Webhook, WebhookLog


class WebhookService:
    """Service for managing and triggering webhooks."""
    
    @staticmethod
    async def trigger_event(
        db: Session,
        event_type: str,
        payload: Dict[str, Any],
    ):
        """
        Trigger all active webhooks for a specific event type.
        
        Example events:
        - checkin_approved
        - checkin_rejected
        - alert_triggered
        - fraud_detected
        - session_created
        - attendance_updated
        """
        
        # Find all active webhooks for this event type
        webhooks = db.query(Webhook).filter(
            Webhook.event_type == event_type,
            Webhook.is_active == True,
        ).all()
        
        for webhook in webhooks:
            await WebhookService._execute_webhook(db, webhook, payload)
    
    @staticmethod
    async def _execute_webhook(
        db: Session,
        webhook: Webhook,
        payload: Dict[str, Any],
        retry_count: int = 0,
    ):
        """Execute a single webhook."""
        
        start_time = time.time()
        
        try:
            # Apply payload template if configured
            if webhook.payload_template:
                payload = WebhookService._apply_template(payload, webhook.payload_template)
            
            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "User-Agent": "SmartPresence-Webhook/1.0",
            }
            
            if webhook.custom_headers:
                headers.update(webhook.custom_headers)
            
            # Add HMAC signature if secret key is configured
            if webhook.secret_key:
                signature = WebhookService._generate_signature(
                    payload, webhook.secret_key
                )
                headers["X-Webhook-Signature"] = signature
            
            # Add custom auth header if configured
            if webhook.auth_header:
                headers["Authorization"] = webhook.auth_header
            
            # Send request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    webhook.url,
                    json=payload,
                    headers=headers,
                )
            
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log success
            success = 200 <= response.status_code < 300
            
            log = WebhookLog(
                webhook_id=webhook.id,
                event_type=webhook.event_type,
                request_payload=payload,
                request_headers=headers,
                response_status_code=response.status_code,
                response_body=response.text[:1000],  # Limit to 1000 chars
                response_time_ms=response_time_ms,
                success=success,
                retry_count=retry_count,
            )
            db.add(log)
            
            # Update webhook statistics
            webhook.total_calls += 1
            if success:
                webhook.successful_calls += 1
            else:
                webhook.failed_calls += 1
            webhook.last_called_at = datetime.utcnow()
            webhook.last_status_code = response.status_code
            
            db.commit()
            
            # Retry on failure
            if not success and retry_count < webhook.max_retries:
                import asyncio
                await asyncio.sleep(webhook.retry_delay_seconds)
                await WebhookService._execute_webhook(
                    db, webhook, payload, retry_count + 1
                )
        
        except Exception as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log error
            log = WebhookLog(
                webhook_id=webhook.id,
                event_type=webhook.event_type,
                request_payload=payload,
                response_time_ms=response_time_ms,
                success=False,
                error_message=str(e),
                retry_count=retry_count,
            )
            db.add(log)
            
            webhook.total_calls += 1
            webhook.failed_calls += 1
            webhook.last_called_at = datetime.utcnow()
            
            db.commit()
            
            # Retry on error
            if retry_count < webhook.max_retries:
                import asyncio
                await asyncio.sleep(webhook.retry_delay_seconds)
                await WebhookService._execute_webhook(
                    db, webhook, payload, retry_count + 1
                )
    
    @staticmethod
    def _generate_signature(payload: Dict[str, Any], secret: str) -> str:
        """Generate HMAC signature for webhook verification."""
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode('utf-8'),
            payload_str.encode('utf-8'),
            hashlib.sha256,
        ).hexdigest()
        return signature
    
    @staticmethod
    def _apply_template(
        payload: Dict[str, Any],
        template: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Apply payload template transformation."""
        # Simple template application - can be extended with Jinja2 if needed
        result = {}
        
        for key, value in template.items():
            if isinstance(value, str) and value.startswith("$."):
                # Extract from payload using JSON path-like syntax
                path = value[2:].split(".")
                val = payload
                for p in path:
                    val = val.get(p, None)
                    if val is None:
                        break
                result[key] = val
            else:
                result[key] = value
        
        return result
    
    # Convenience methods for common events
    
    @staticmethod
    async def trigger_checkin_event(
        db: Session,
        checkin_id: int,
        student_id: int,
        session_id: int,
        status: str,
    ):
        """Trigger webhook for check-in event."""
        await WebhookService.trigger_event(
            db,
            f"checkin_{status}",
            {
                "event": f"checkin_{status}",
                "checkin_id": checkin_id,
                "student_id": student_id,
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    
    @staticmethod
    async def trigger_alert_event(
        db: Session,
        alert_id: int,
        student_id: int,
        alert_type: str,
        severity: str,
    ):
        """Trigger webhook for alert event."""
        await WebhookService.trigger_event(
            db,
            "alert_triggered",
            {
                "event": "alert_triggered",
                "alert_id": alert_id,
                "student_id": student_id,
                "alert_type": alert_type,
                "severity": severity,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    
    @staticmethod
    async def trigger_fraud_event(
        db: Session,
        fraud_id: int,
        student_id: int,
        fraud_type: str,
        severity: str,
    ):
        """Trigger webhook for fraud detection event."""
        await WebhookService.trigger_event(
            db,
            "fraud_detected",
            {
                "event": "fraud_detected",
                "fraud_id": fraud_id,
                "student_id": student_id,
                "fraud_type": fraud_type,
                "severity": severity,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
