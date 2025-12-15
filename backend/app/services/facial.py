import hashlib
from io import BytesIO
from typing import List, Tuple
from PIL import Image
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.user import User
from app.models.student import Student


def _image_to_embedding(image_bytes: bytes, size: int = 512) -> List[float]:
    """Lightweight embedding: resize to 64x64, grayscale, flatten, PCA-like downsample.
    This is a placeholder until InsightFace is wired.
    """
    img = Image.open(BytesIO(image_bytes)).convert('L').resize((64, 64))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    vec = arr.flatten()
    # Downsample to requested size by averaging blocks
    if vec.shape[0] >= size:
        step = vec.shape[0] // size
        emb = vec[:step * size].reshape(size, step).mean(axis=1)
    else:
        # Pad then normalize
        pad = np.zeros((size,), dtype=np.float32)
        pad[:vec.shape[0]] = vec
        emb = pad
    # L2 normalize
    norm = np.linalg.norm(emb) + 1e-8
    emb = emb / norm
    return emb.astype(np.float32).tolist()


def _embedding_to_pgvector_str(embedding: List[float]) -> str:
    return '[' + ','.join(f"{x:.6f}" for x in embedding) + ']'


def enroll_user_faces(db: Session, user_id: int, image_paths_and_bytes: List[Tuple[str, bytes]]):
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        return 0
    inserted = 0
    for idx, (path, bytes_) in enumerate(image_paths_and_bytes):
        emb = _image_to_embedding(bytes_)
        emb_str = _embedding_to_pgvector_str(emb)
        hsh = hashlib.sha256(bytes_).hexdigest()
        db.execute(
            text(
                "INSERT INTO facial_embeddings (student_id, embedding, image_path, image_hash, is_primary) "
                "VALUES (:student_id, :embedding::vector, :image_path, :image_hash, :is_primary)"
            ),
            {
                'student_id': student.id,
                'embedding': emb_str,
                'image_path': path,
                'image_hash': hsh,
                'is_primary': idx == 0,
            }
        )
        inserted += 1
    db.commit()
    return inserted


def match_user_by_image(db: Session, email: str, image_bytes: bytes, threshold: float = 0.85) -> int | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        return None
    # Build embedding and search nearest in pgvector using cosine distance
    emb = _image_to_embedding(image_bytes)
    emb_str = _embedding_to_pgvector_str(emb)
    # distance operator for cosine is <=>, similarity = 1 - distance
    row = db.execute(
        text(
            "SELECT student_id, image_path, 1 - (embedding <=> :q::vector) AS similarity "
            "FROM facial_embeddings WHERE student_id = :sid "
            "ORDER BY embedding <=> :q::vector ASC LIMIT 1"
        ),
        {'q': emb_str, 'sid': student.id}
    ).fetchone()
    if not row:
        return None
    similarity = float(row[2])
    if similarity >= threshold:
        return user.id
    return None
