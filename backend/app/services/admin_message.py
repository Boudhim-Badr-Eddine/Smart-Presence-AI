import os
from pathlib import Path
from typing import List, Tuple

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.admin_message import (
    AdminMessage,
    AdminMessageAttachment,
    AdminMessageClass,
    AdminMessageTrainer,
)
from app.models.notification import Notification
from app.models.session import Session as CourseSession
from app.models.trainer import Trainer

settings = get_settings()


class AdminMessageService:
    STORAGE_SUBDIR = "admin_messages"
    ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "odt", "xlsx", "xls", "ppt", "pptx", "png", "jpg", "jpeg"}
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

    @staticmethod
    def _ensure_dir(path: Path):
        path.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def save_attachments(base_dir: Path, message_id: int, files: List[UploadFile]) -> List[Tuple[str, str, str, int]]:
        """Save uploaded files under storage/admin_messages/<message_id>/ and return metadata.

        Enforces extension and size limits to keep uploads predictable.

        Returns list of tuples: (file_name, storage_path, mime_type, size_bytes)
        """
        saved: List[Tuple[str, str, str, int]] = []
        target_dir = base_dir / AdminMessageService.STORAGE_SUBDIR / str(message_id)
        AdminMessageService._ensure_dir(target_dir)

        for f in files or []:
            safe_name = os.path.basename(f.filename or "attachment")
            ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
            if ext not in AdminMessageService.ALLOWED_EXTENSIONS:
                raise ValueError(f"Extension non autorisee: {ext or 'inconnue'}")

            file_obj = f.file
            file_obj.seek(0, os.SEEK_END)
            size = file_obj.tell()
            file_obj.seek(0)
            if size > AdminMessageService.MAX_FILE_SIZE_BYTES:
                raise ValueError(
                    f"Fichier trop volumineux (>{AdminMessageService.MAX_FILE_SIZE_BYTES // (1024*1024)}MB): {safe_name}"
                )
            dest = target_dir / safe_name
            with dest.open("wb") as out:
                out.write(f.file.read())
            size = dest.stat().st_size
            saved.append((safe_name, str(dest), f.content_type or "application/octet-stream", size))
        return saved

    @staticmethod
    def resolve_trainers_from_classes(db: Session, class_names: List[str]) -> List[int]:
        if not class_names:
            return []
        q = (
            db.query(CourseSession.trainer_id)
            .filter(CourseSession.class_name.in_(class_names))
            .distinct()
        )
        ids = [row[0] for row in q.all() if row and row[0] is not None]
        return ids

    @staticmethod
    def create_message(
        db: Session,
        admin_user_id: int,
        title: str,
        message_type: str,
        body: str | None,
        trainer_ids: List[int],
        class_names: List[str],
        files: List[UploadFile] | None,
    ) -> AdminMessage:
        # 1) Persist message
        msg = AdminMessage(
            admin_user_id=admin_user_id,
            title=title,
            body=body,
            message_type=message_type,
            status="sent",
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # 2) Links: trainers/classes
        for tid in set(trainer_ids or []):
            db.add(AdminMessageTrainer(message_id=msg.id, trainer_id=tid))
        for cname in set(class_names or []):
            db.add(AdminMessageClass(message_id=msg.id, class_name=cname))
        db.commit()

        # 3) Resolve recipients (trainers from direct + from classes)
        inferred_trainer_ids = AdminMessageService.resolve_trainers_from_classes(db, class_names)
        all_trainer_ids = sorted(set((trainer_ids or []) + inferred_trainer_ids))

        # 4) Save attachments
        storage_root = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage"))
        saved_meta = AdminMessageService.save_attachments(storage_root, msg.id, files or [])
        for file_name, storage_path, mime_type, size in saved_meta:
            db.add(
                AdminMessageAttachment(
                    message_id=msg.id,
                    file_name=file_name,
                    storage_path=storage_path,
                    mime_type=mime_type,
                    size_bytes=size,
                )
            )
        db.commit()

        # 5) Create notifications for recipients (trainers)
        # Trainers map to users via Trainer.user_id
        if all_trainer_ids:
            trainer_users = (
                db.query(Trainer).filter(Trainer.id.in_(all_trainer_ids)).all()
            )
            for t in trainer_users:
                db.add(
                    Notification(
                        user_id=t.user_id,
                        user_type="trainer",
                        title=title,
                        message=body or "Nouvelle note de service",
                        notification_type="admin_message",
                        priority="high" if message_type == "official_message" else "medium",
                        delivery_method="in_app",
                        related_entity_type="admin_message",
                        related_entity_id=msg.id,
                        action_label="Ouvrir",
                        action_url=f"/storage/admin_messages/{msg.id}/{saved_meta[0][0]}" if saved_meta else None,
                    )
                )
            db.commit()

        return msg
