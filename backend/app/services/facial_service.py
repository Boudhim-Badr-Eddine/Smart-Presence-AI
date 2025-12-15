"""Facial recognition service using InsightFace for enrollment & verification."""
import numpy as np
from typing import List, Tuple
from insightface.app import FaceAnalysis  # type: ignore
import base64
import io
from PIL import Image


class FacialService:
    """Handles face detection, encoding, and verification."""

    def __init__(self):
        self.app = FaceAnalysis(providers=["CPUExecutionProvider"], allowed_modules=["detection", "recognition"])
        self.app.prepare(ctx_id=0, det_size=(640, 640))

    def encode_face(self, image_base64: str) -> np.ndarray | None:
        """Extract facial embedding from base64 image."""
        try:
            img = self._base64_to_image(image_base64)
            faces = self.app.get(img)
            if not faces:
                return None
            # Use first detected face embedding
            return faces[0].normed_embedding
        except Exception:
            return None

    def encode_multiple(self, images_base64: List[str]) -> List[np.ndarray]:
        """Encode multiple images; returns list of embeddings (skips failed images)."""
        embeddings: List[np.ndarray] = []
        for img_b64 in images_base64:
            emb = self.encode_face(img_b64)
            if emb is not None:
                embeddings.append(emb)
        return embeddings

    def verify_face(self, test_image_base64: str, stored_embedding: np.ndarray, threshold: float = 0.35) -> Tuple[bool, float]:
        """Verify if test image matches stored embedding. Returns (verified, similarity_score)."""
        test_emb = self.encode_face(test_image_base64)
        if test_emb is None:
            return False, 0.0
        similarity = float(np.dot(test_emb, stored_embedding))
        verified = similarity >= threshold
        return verified, similarity

    def _base64_to_image(self, b64_string: str) -> np.ndarray:
        """Decode base64 string into numpy array for InsightFace."""
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        return np.array(pil_img)


# Singleton instance for the app
facial_service = FacialService()
