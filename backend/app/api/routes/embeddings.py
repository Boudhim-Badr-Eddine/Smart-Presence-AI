import base64
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.deps import get_db

router = APIRouter()


class QueueEmbeddingsPayload(BaseModel):
    user_id: int
    imagesBase64: list[str]


@router.post("/queue", status_code=status.HTTP_202_ACCEPTED)
def queue_embeddings(payload: QueueEmbeddingsPayload, db: Session = Depends(get_db)):
    user = db.query(User).get(payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    root = Path("/app/storage/embeddings_queue")
    root.mkdir(parents=True, exist_ok=True)
    job_dir = root / f"user_{user.id}"
    job_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    for idx, b64 in enumerate(payload.imagesBase64[:3]):
        try:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            data = base64.b64decode(b64)
            out = job_dir / f"img_{idx+1}.jpg"
            out.write_bytes(data)
            saved.append(str(out))
        except Exception:
            continue

    # Write a simple job file to be processed by a worker later
    (job_dir / "job.json").write_text('{"user_id": %d, "count": %d}' % (user.id, len(saved)))

    return {"queued": True, "images": saved}
