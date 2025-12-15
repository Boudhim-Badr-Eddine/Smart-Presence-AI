from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import base64
from datetime import datetime

from app.utils.deps import get_db
from app.models.user import User
from app.models.student import Student
from app.services.auth import get_password_hash, get_current_user
from app.services.user import UserService
from app.services.facial import enroll_user_faces

router = APIRouter()

class CreateUserRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    role: str
    
    # Optional fields
    className: Optional[str] = None
    studentId: Optional[str] = None
    parentEmail: Optional[EmailStr] = None
    parentPhone: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    imagesBase64: Optional[list[str]] = None  # list of Base64 encoded images


@router.post("/users")
async def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create users"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password and create user aligned with model
    password_hash = get_password_hash(request.password)

    # Derive a username from email if not provided
    username = request.email.split("@")[0]

    new_user = User(
        username=username,
        email=request.email,
        password_hash=password_hash,
        role=request.role,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # If student, create student record
    if request.role == "student":
        student = Student(
            user_id=new_user.id,
            first_name=request.firstName,
            last_name=request.lastName,
            email=request.email,
            class_name=request.className or "UNASSIGNED",
            student_code=request.studentId or f"STU{new_user.id:04d}",
            parent_email=request.parentEmail,
            parent_phone=request.parentPhone,
            phone=request.phone,
            address=request.address,
            alert_level="normal",
            attendance_rate=100.0,
            facial_data_encoded=False
        )
        db.add(student)
        db.commit()
        db.refresh(student)
    
    # Handle multiple face images if provided: save to disk for enrollment pipeline
    if request.imagesBase64 and len(request.imagesBase64) >= 1:
        try:
            import os
            from pathlib import Path
            import base64
            from app.services.facial import enroll_user_faces

            storage_dir = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage/faces")) / str(new_user.id)
            storage_dir.mkdir(parents=True, exist_ok=True)

            saved_paths: list[str] = []
            image_paths_and_bytes = []
            for idx, img in enumerate(request.imagesBase64):
                face_data = img.split(",", 1)[1] if "," in img else img
                image_bytes = base64.b64decode(face_data)
                file_path = storage_dir / f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{idx}.jpg"
                with open(file_path, "wb") as f:
                    f.write(image_bytes)
                saved_paths.append(str(file_path))
                image_paths_and_bytes.append((str(file_path), image_bytes))

            # Mark student facial data flag if exists
            student_row = db.query(Student).filter(Student.user_id == new_user.id).first()
            if student_row:
                student_row.facial_data_encoded = True
                db.add(student_row)
                db.commit()

            # Enroll embeddings into pgvector
            enroll_user_faces(db, new_user.id, image_paths_and_bytes)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process face images: {e}")
    
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "message": "User created successfully",
        "faces_saved": True if request.imagesBase64 else False
    }


@router.get("/users")
async def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list users"
        )
    
    users = db.query(User).all()
    return {
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "role": user.role,
                "username": user.username,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if hasattr(user, "created_at") else None
            }
            for user in users
        ]
    }


@router.get("/faces/{user_id}")
async def list_user_faces(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins")
    import os
    from pathlib import Path
    storage_base = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage"))
    faces_dir = storage_base / "faces" / str(user_id)
    paths = []
    if faces_dir.exists():
        # Return paths relative to /storage mount point
        paths = [f"/faces/{user_id}/{p.name}" for p in faces_dir.glob('*.jpg')]
    return {"paths": paths}


@router.post("/faces/{user_id}/reenroll")
async def reenroll_user_faces(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins")
    import os, base64
    from pathlib import Path
    faces_dir = Path(os.getenv("FACE_STORAGE_DIR", "/app/storage/faces")) / str(user_id)
    image_paths_and_bytes = []
    for p in faces_dir.glob('*.jpg'):
        with open(p, 'rb') as f:
            image_paths_and_bytes.append((str(p), f.read()))
    inserted = enroll_user_faces(db, user_id, image_paths_and_bytes)
    return {"images_processed": inserted}
