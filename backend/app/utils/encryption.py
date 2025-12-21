"""
Encryption utilities for sensitive data
Provides AES-256-GCM encryption for photos, GPS coordinates, and personal data
"""

import base64
import os
from typing import Optional, Tuple

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import get_settings

settings = get_settings()


class EncryptionService:
    """Service for encrypting/decrypting sensitive data."""

    def __init__(self):
        # Derive encryption key from settings (fallback to secret_key)
        secret = getattr(settings, "encryption_key", None) or getattr(settings, "secret_key", "change-me")
        self.key = self._derive_key(secret.encode())

    def _derive_key(self, password: bytes, salt: Optional[bytes] = None) -> bytes:
        """Derive a 256-bit key from password using PBKDF2."""
        if salt is None:
            salt = b'smartpresence_salt_v1'  # Static salt for consistent key
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return kdf.derive(password)

    def encrypt(self, plaintext: bytes) -> str:
        """
        Encrypt data using AES-256-GCM.
        Returns base64-encoded ciphertext with nonce prepended.
        """
        aesgcm = AESGCM(self.key)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        
        # Prepend nonce to ciphertext and encode as base64
        encrypted = nonce + ciphertext
        return base64.b64encode(encrypted).decode('utf-8')

    def decrypt(self, encrypted_b64: str) -> bytes:
        """
        Decrypt data encrypted with encrypt().
        """
        encrypted = base64.b64decode(encrypted_b64.encode('utf-8'))
        
        # Extract nonce and ciphertext
        nonce = encrypted[:12]
        ciphertext = encrypted[12:]
        
        aesgcm = AESGCM(self.key)
        return aesgcm.decrypt(nonce, ciphertext, None)

    def encrypt_string(self, plaintext: str) -> str:
        """Encrypt a string."""
        return self.encrypt(plaintext.encode('utf-8'))

    def decrypt_string(self, encrypted_b64: str) -> str:
        """Decrypt to a string."""
        return self.decrypt(encrypted_b64).decode('utf-8')

    def encrypt_coordinates(self, lat: float, lng: float) -> Tuple[str, str]:
        """Encrypt GPS coordinates."""
        lat_encrypted = self.encrypt_string(str(lat))
        lng_encrypted = self.encrypt_string(str(lng))
        return lat_encrypted, lng_encrypted

    def decrypt_coordinates(self, lat_encrypted: str, lng_encrypted: str) -> Tuple[float, float]:
        """Decrypt GPS coordinates."""
        lat = float(self.decrypt_string(lat_encrypted))
        lng = float(self.decrypt_string(lng_encrypted))
        return lat, lng


# Global instance
_encryption_service = None


def get_encryption_service() -> EncryptionService:
    """Get singleton encryption service instance."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
