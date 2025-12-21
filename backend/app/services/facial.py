import hashlib
from typing import List, Tuple

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.user import User
from app.services.face_engine import (
    FaceQualityError,
    FaceQualityMetrics,
    extract_embedding_with_quality,
)


def _embedding_to_pgvector_str(embedding: List[float]) -> str:
    return "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"


def verify_user_face_by_image(
    db: Session,
    *,
    email: str,
    image_bytes: bytes,
    threshold: float,
) -> tuple[int | None, float | None, str | None, FaceQualityMetrics | None]:
    """Verify a face image for a given email.

    Returns: (matched_user_id, similarity, failure_reason, quality_metrics)
    - `failure_reason` is a short machine-readable string.
    - `quality_metrics` is returned even for some failures.
    """

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None, None, "user_not_found", None

    student = db.query(Student).filter(Student.user_id == user.id).first()
    student_id = student.id if student else None

    try:
        emb_np, metrics = extract_embedding_with_quality(image_bytes)
    except FaceQualityError as e:
        return None, None, e.reason, e.metrics
    except Exception:
        return None, None, "invalid_image", None

    emb = emb_np.astype(np.float32).tolist()
    emb_str = _embedding_to_pgvector_str(emb)

    row = db.execute(
        text(
            "SELECT user_id, student_id, image_path, 1 - (embedding <=> (:q)::vector) AS similarity "
            "FROM facial_embeddings "
            "WHERE embedding IS NOT NULL AND (user_id = :uid OR student_id = (:sid)::int) "
            "ORDER BY embedding <=> (:q)::vector ASC LIMIT 1"
        ),
        {"q": emb_str, "uid": user.id, "sid": student_id},
    ).fetchone()

    if not row:
        return None, None, "no_enrolled_embeddings", metrics

    similarity = float(row[3])
    if similarity >= threshold:
        return int(user.id), similarity, None, metrics

    return None, similarity, "below_threshold", metrics


def enroll_user_faces(db: Session, user_id: int, image_paths_and_bytes: List[Tuple[str, bytes]]):
    student = db.query(Student).filter(Student.user_id == user_id).first()
    inserted = 0
    failures: list[str] = []

    for idx, (path, bytes_) in enumerate(image_paths_and_bytes):
        try:
            emb_np, metrics = extract_embedding_with_quality(bytes_)
        except FaceQualityError as e:
            failures.append(e.reason)
            continue
        except Exception:
            failures.append("invalid_image")
            continue

        emb = emb_np.astype(np.float32).tolist()
        emb_str = _embedding_to_pgvector_str(emb)
        hsh = hashlib.sha256(bytes_).hexdigest()

        lighting = (
            "dark" if metrics.brightness < 80 else "bright" if metrics.brightness > 170 else "normal"
        )

        db.execute(
            text(
                "INSERT INTO facial_embeddings (student_id, user_id, image_path, image_hash, is_primary, embedding, embedding_model, lighting_conditions) "
                "VALUES (:student_id, :user_id, :image_path, :image_hash, :is_primary, (:embedding)::vector, :embedding_model, :lighting)"
            ),
            {
                "student_id": student.id if student else None,
                "user_id": user_id,
                "image_path": path,
                "image_hash": hsh,
                "is_primary": idx == 0,
                "embedding": emb_str,
                "embedding_model": "insightface",
                "lighting": lighting,
            },
        )
        inserted += 1

    if inserted < 3:
        db.rollback()
        raise ValueError(
            f"At least 3 usable face images are required (got {inserted}). Failures: {', '.join(failures) or 'unknown'}"
        )

    db.commit()
    if student:
        student.facial_data_encoded = True
        db.add(student)
        db.commit()
    return inserted


def match_user_by_image(
    db: Session, email: str, image_bytes: bytes, threshold: float = 0.85
) -> int | None:
    matched_user_id, similarity, failure_reason, _metrics = verify_user_face_by_image(
        db,
        email=email,
        image_bytes=image_bytes,
        threshold=threshold,
    )
    return matched_user_id
