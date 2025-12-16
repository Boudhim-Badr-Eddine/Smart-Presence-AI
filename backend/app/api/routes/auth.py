from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.student import Student
from app.models.user import User
from app.schemas.auth import (
    EnrollFacialRequest,
    FacialLoginRequest,
    LoginRequest,
    MeResponse,
    Token,
)
from app.services import auth as auth_service
from app.services.facial import enroll_user_faces, match_user_by_image
from app.utils.deps import get_db

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Verify password
    if not auth_service.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = auth_service.create_access_token(subject=str(user.id))
    user.last_login = datetime.now()
    db.add(user)
    db.commit()
    return token


@router.post("/login/facial", response_model=Token)
def login_facial(payload: FacialLoginRequest, db: Session = Depends(get_db)):
    if not payload.image_base64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Face image is required"
        )
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student or not student.facial_data_encoded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No enrolled facial data for user"
        )
    import base64

    b64 = (
        payload.image_base64.split(",", 1)[1]
        if "," in payload.image_base64
        else payload.image_base64
    )
    img_bytes = base64.b64decode(b64)
    threshold = payload.confidence_threshold or settings.facial_confidence_threshold
    matched_user_id = match_user_by_image(db, payload.email, img_bytes, threshold=threshold)
    if not matched_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Face not recognized")
    token = auth_service.create_access_token(subject=str(matched_user_id))
    return token


@router.post("/enroll", response_model=dict)
def enroll_face(payload: EnrollFacialRequest, db: Session = Depends(get_db)):
    if not payload.requires_three_images():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Provide at least 3 images"
        )
    import base64

    image_bytes_list = []
    for idx, img in enumerate(payload.images_base64):
        b64 = img.split(",", 1)[1] if "," in img else img
        image_bytes_list.append((f"uploaded_{idx}.jpg", base64.b64decode(b64)))
    inserted = enroll_user_faces(db, payload.user_id, image_bytes_list)
    student = db.query(Student).filter(Student.user_id == payload.user_id).first()
    if student:
        student.facial_data_encoded = True
        db.add(student)
        db.commit()
    return {"status": "enrolled", "user_id": payload.user_id, "images_processed": inserted}


@router.get("/me", response_model=MeResponse)
def me(current_user: User = Depends(auth_service.get_current_user)):
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        last_login=current_user.last_login,
    )
