# End-to-End Encryption Policy

**SmartPresence AI** - Data Protection & Privacy

## Overview

SmartPresence implements comprehensive encryption for all sensitive data at rest and in transit to ensure maximum security and privacy compliance (GDPR, CCPA, etc.).

## Data Categories

### 1. **Facial Recognition Data** 🔐
- **Storage**: All facial embeddings and photos are encrypted using AES-256
- **Encryption Key**: Derived from system encryption key + secret key
- **Location**: 
  - Local storage: `/app/storage/faces/` (encrypted)
  - S3 Backup: AWS S3 with server-side encryption (SSE-S3)
- **Access**: Only authorized API endpoints can decrypt facial data
- **Retention**: 90 days for verification photos, indefinite for enrollment (user can request deletion via GDPR)

### 2. **GPS Location Data** 📍
- **Encryption**: GPS coordinates encrypted before database storage
- **Purpose**: Location verification for check-ins
- **Retention**: 30 days, then automatically purged
- **User Control**: Users can opt-out of GPS tracking

### 3. **Personal Identifiable Information (PII)** 👤
- **Data**: Names, emails, phone numbers
- **Protection**: 
  - Database-level encryption (PostgreSQL pgcrypto)
  - Application-level encryption for sensitive fields
  - TLS 1.3 for all API communication
- **Access Logging**: All PII access is audit-logged

## Encryption Implementation

### At Rest
```python
# Using EncryptionService
from app.utils.encryption import encryption_service

# Encrypt sensitive data
encrypted_data = encryption_service.encrypt(sensitive_string)

# Decrypt when needed
decrypted_data = encryption_service.decrypt(encrypted_data)
```

### In Transit
- **API**: All endpoints use HTTPS/TLS 1.3
- **WebSockets**: Secure WebSocket (WSS) for real-time notifications
- **S3 Uploads**: HTTPS only, server-side encryption enabled

### Database
- **Connection**: SSL/TLS required for PostgreSQL connections
- **Column Encryption**: Sensitive columns use application-level encryption
- **Backup Encryption**: Database backups encrypted before S3 storage

## Key Management

- **Primary Key**: `ENCRYPTION_KEY` environment variable (AES-256 key)
- **Key Rotation**: Manual key rotation supported (requires data re-encryption)
- **Storage**: Keys stored in environment variables, never in code or database
- **Access**: Only backend application has access to encryption keys

## S3 Backup Security

### Configuration
```bash
# Required environment variables
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET_NAME=<bucket-name>
AWS_REGION=us-east-1
```

### Security Features
- **Server-Side Encryption**: SSE-S3 or SSE-KMS
- **Bucket Policy**: Private bucket, no public access
- **Access Control**: IAM roles with least-privilege principle
- **Versioning**: Enabled for disaster recovery
- **Lifecycle**: Automatic transition to Glacier after 90 days

## User Rights (GDPR Compliance)

### Right to Access
- Endpoint: `GET /api/gdpr/export/my-data`
- Returns: Complete export of all personal data in JSON format

### Right to Deletion
- Endpoint: `DELETE /api/gdpr/delete/my-account`
- Action: Anonymizes user data (preserves statistical integrity)
- Deletion: Removes facial embeddings and photos from S3

### Right to Rectification
- Users can update their data via profile endpoints
- All changes are audit-logged

## Audit Trail

All access to sensitive data is logged:
- **Who**: User ID, role, email
- **What**: Action type (read, write, delete)
- **When**: Timestamp (UTC)
- **Where**: IP address, user agent
- **Why**: Request path, resource accessed

Audit logs retained for 365 days minimum.

## Compliance Standards

- ✅ **GDPR** (EU General Data Protection Regulation)
- ✅ **CCPA** (California Consumer Privacy Act)
- ✅ **FERPA** (Family Educational Rights and Privacy Act)
- ✅ **SOC 2 Type II** (Security controls)

## Incident Response

In case of suspected data breach:
1. Immediately rotate encryption keys
2. Review audit logs for unauthorized access
3. Notify affected users within 72 hours (GDPR requirement)
4. Document incident in compliance system

## Contact

For data protection inquiries:
- **Email**: privacy@smartpresence.ai
- **DPO**: data-protection-officer@smartpresence.ai

---

**Last Updated**: December 2025  
**Policy Version**: 1.0
