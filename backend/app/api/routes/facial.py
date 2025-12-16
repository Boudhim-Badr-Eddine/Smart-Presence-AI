import hashlib
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.services.facial_service import facial_service
from app.utils.deps import get_db

router = APIRouter()
settings = get_settings()


class EnrollPayload(BaseModel):
    student_id: int
    images_base64: List[str]


class VerifyPayload(BaseModel):
    image_base64: str
    student_id: int


@router.post("/enroll", response_model=dict)
def enroll_face(payload: EnrollPayload, db: Session = Depends(get_db)):
    """Enroll multiple face images for a student and store embeddings in pgvector."""
    embeddings = facial_service.encode_multiple(payload.images_base64)
    if not embeddings:
        raise HTTPException(status_code=400, detail="No valid face detected in images")

    success_count = 0
    for i, emb_np in enumerate(embeddings):
        emb_list = emb_np.tolist()
        emb_str = str(emb_list)
        image_hash = hashlib.sha256(payload.images_base64[i].encode()).hexdigest()

        # Insert into DB with pgvector column via raw SQL
        db.execute(
            text(
                """
                INSERT INTO facial_embeddings (student_id, image_path, image_hash, embedding_model, is_primary, embedding_vector)
                VALUES (:sid, :path, :hash, 'insightface', :is_primary, :vec::vector)
                """
            ),
            {
                "sid": payload.student_id,
                "path": f"/storage/faces/{payload.student_id}_{i}.jpg",
                "hash": image_hash,
                "is_primary": i == 0,
                "vec": emb_str,
            },
        )
        success_count += 1
    db.commit()
    return {"enrolled": success_count, "student_id": payload.student_id}


@router.post("/verify", response_model=dict)
def verify_face(payload: VerifyPayload, db: Session = Depends(get_db)):
    """Verify a face against stored embeddings using cosine similarity via pgvector <=> operator."""
    test_emb = facial_service.encode_face(payload.image_base64)
    if test_emb is None:
        raise HTTPException(status_code=400, detail="No face detected in provided image")

    emb_str = str(test_emb.tolist())

    # Find closest match via pgvector cosine distance (1 - cosine_similarity)
    result = db.execute(
        text(
            """
            SELECT student_id, 1 - (embedding_vector <=> :vec::vector) AS similarity
            FROM facial_embeddings
            WHERE student_id = :sid
            ORDER BY similarity DESC
            LIMIT 1
            """
        ),
        {"vec": emb_str, "sid": payload.student_id},
    ).fetchone()

    if not result:
        return {"verified": False, "confidence": 0.0}

    similarity = float(result[1])
    threshold = settings.facial_confidence_threshold
    verified = similarity >= threshold
    return {"verified": verified, "confidence": round(similarity, 4)}
