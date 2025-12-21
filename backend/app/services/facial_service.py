"""Facial service helpers used by `/api/facial/*` routes.

This module provides a small API (`facial_service.encode_face/encode_multiple`) that
works with base64-encoded images and returns numeric embeddings.

Note: The main attendance/self-checkin flow uses `app.services.facial` helpers.
"""

from __future__ import annotations

import base64
from typing import List, Optional

import numpy as np

from app.services.face_engine import FaceQualityError, extract_embedding_with_quality


class FacialService:
    def __init__(self, embedding_size: int = 512):
        self.embedding_size = embedding_size

    def _image_base64_to_bytes(self, image_base64: str) -> bytes:
        if "," in image_base64:
            # Allow data URLs: data:image/jpeg;base64,...
            image_base64 = image_base64.split(",", 1)[1]
        return base64.b64decode(image_base64)

    def _bytes_to_embedding(self, image_bytes: bytes) -> np.ndarray:
        emb, _metrics = extract_embedding_with_quality(image_bytes)
        return emb.astype(np.float32)

    def encode_face(self, image_base64: str) -> Optional[np.ndarray]:
        try:
            image_bytes = self._image_base64_to_bytes(image_base64)
            return self._bytes_to_embedding(image_bytes)
        except FaceQualityError:
            return None
        except Exception:
            return None

    def encode_multiple(self, images_base64: List[str]) -> List[np.ndarray]:
        embeddings: List[np.ndarray] = []
        for img in images_base64:
            emb = self.encode_face(img)
            if emb is not None:
                embeddings.append(emb)
        return embeddings


facial_service = FacialService()
