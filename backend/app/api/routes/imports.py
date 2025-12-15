from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.utils.deps import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.import_service import ImportService
from app.utils.cache import response_cache, redis_cache
from app.utils.task_queue import task_queue

router = APIRouter(tags=["imports"])


def _invalidate_admin_caches():
    response_cache.invalidate("students:")
    response_cache.invalidate("trainers:")
    response_cache.invalidate("sessions:")
    if redis_cache and redis_cache.available():
        redis_cache.invalidate("students:")
        redis_cache.invalidate("trainers:")
        redis_cache.invalidate("sessions:")


@router.post("/import")
async def bulk_import(
    entity: str = Query("students", pattern="^(students|trainers|sessions)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admin can import data")

    if entity not in ImportService.SUPPORTED_ENTITIES:
        raise HTTPException(status_code=400, detail="Unsupported entity")

    rows = ImportService.parse_upload(file)
    if not rows:
        return {"success": 0, "errors": 1, "error_messages": ["Empty file"]}

    if entity == "students":
        success, errors = ImportService.import_students(db, rows)
    elif entity == "trainers":
        success, errors = ImportService.import_trainers(db, rows)
    else:
        success, errors = ImportService.import_sessions(db, rows)

    # Invalidate cached admin lists so UI reflects fresh data
    task_queue.submit(_invalidate_admin_caches)
    return {"success": success, "errors": len(errors), "error_messages": errors[:20]}


@router.get("/import/template")
def download_template(entity: str = Query("students", pattern="^(students|trainers|sessions)$")):
    templates = ImportService.templates()
    if entity not in templates:
        raise HTTPException(status_code=400, detail="Unknown template")
    content = templates[entity]
    filename = f"{entity}_template.csv"
    return StreamingResponse(
        iter([content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
