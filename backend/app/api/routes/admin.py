from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from pathlib import Path
import base64
from typing import Optional, List
from app.utils.deps import get_db
from app.models.user import User
from app.models.student import Student
from app.models.session import Session as SessionModel
from app.services.auth import get_password_hash, get_current_user
from app.services.facial_service import facial_service
from datetime import datetime
from app.utils.cache import cached_response, response_cache, redis_cache
from app.utils.task_queue import task_queue
from sqlalchemy import or_, text

router = APIRouter()


class CreateUserPayload(BaseModel):
    email: EmailStr
    role: str  # admin | trainer | student
    firstName: str
    lastName: str
    imagesBase64: list[str] = []  # at least 3 for facial enrollment


class StudentResponse(BaseModel):
    id: int
    name: str
    student_code: str
    email: str
    class_name: str
    facial_data_encoded: bool
    attendance_rate: float

    class Config:
        from_attributes = True


class PaginatedStudentsResponse(BaseModel):
    items: List[StudentResponse]
    total: int
    total_pages: int
    page: int
    page_size: int


class TrainerResponse(BaseModel):
    id: int
    name: str
    email: str
    subjects: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedTrainersResponse(BaseModel):
    items: List[TrainerResponse]
    total: int
    total_pages: int
    page: int
    page_size: int


class SessionResponse(BaseModel):
    id: int
    title: str
    class_name: str
    trainer_id: Optional[int] = None
    date: str
    start_time: str
    end_time: str

    class Config:
        from_attributes = True


class PaginatedSessionsResponse(BaseModel):
    items: List[SessionResponse]
    total: int
    total_pages: int
    page: int
    page_size: int


class SmartSearchItem(BaseModel):
    id: int
    entity: str
    title: str
    subtitle: str | None = None


class SmartSearchResponse(BaseModel):
    items: List[SmartSearchItem]


# ==================== STUDENTS ENDPOINTS ====================

@router.get("/students", response_model=PaginatedStudentsResponse)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", min_length=0),
    class_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all students with pagination and optional filtering."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list students"
        )

    cache_key = f"students:{page}:{page_size}:{search}:{class_name or 'all'}"

    def fetch_students():
        query = db.query(Student)

        # Search by name or student_code
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Student.first_name.ilike(search_term)) |
                (Student.last_name.ilike(search_term)) |
                (Student.student_code.ilike(search_term))
            )

        # Filter by class
        if class_name:
            query = query.filter(Student.class_name == class_name)

        total = query.count()
        total_pages = (total + page_size - 1) // page_size

        # Pagination
        offset = (page - 1) * page_size
        students = query.offset(offset).limit(page_size).all()

        items = [
            StudentResponse(
                id=s.id,
                name=f"{s.first_name} {s.last_name}",
                student_code=s.student_code,
                email=s.email,
                class_name=s.class_name,
                facial_data_encoded=s.facial_data_encoded,
                attendance_rate=s.attendance_rate
            )
            for s in students
        ]

        return PaginatedStudentsResponse(
            items=items,
            total=total,
            total_pages=total_pages,
            page=page,
            page_size=page_size
        )

    # Prefer Redis cache when available
    if redis_cache and redis_cache.available():
        cached = redis_cache.get(cache_key)
        if cached:
            return cached
        result = fetch_students()
        redis_cache.set(cache_key, result.model_dump())
        return result

    return cached_response(cache_key, fetch_students)


@router.post("/students", status_code=status.HTTP_201_CREATED)
def create_student(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Create a new student."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create students"
        )
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == payload.get("email")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    user = User(
        username=payload.get("email", "").split("@")[0],
        email=payload.get("email"),
        password_hash=get_password_hash(payload.get("password", "password123")),
        role="student",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create student
    student = Student(
        user_id=user.id,
        first_name=payload.get("firstName", ""),
        last_name=payload.get("lastName", ""),
        email=payload.get("email"),
        class_name=payload.get("className", "UNASSIGNED"),
        student_code=payload.get("studentCode", f"STU{user.id:04d}"),
        phone=payload.get("phone"),
        address=payload.get("address"),
        alert_level="normal",
        attendance_rate=100.0,
        facial_data_encoded=False
    )
    db.add(student)
    db.commit()
    db.refresh(student)

    # Invalidate cached student lists
    response_cache.invalidate(prefix="students:")
    if redis_cache and redis_cache.available():
        redis_cache.invalidate(prefix="students:")

    # Background hook for any async follow-ups (notifications, audit logs)
    if background_tasks:
        background_tasks.add_task(lambda: None)
    else:
        task_queue.submit(lambda: None)
    
    return {
        "id": student.id,
        "name": f"{student.first_name} {student.last_name}",
        "student_code": student.student_code,
        "email": student.email,
        "class_name": student.class_name
    }


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a student."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete students"
        )
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete associated user
    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        db.delete(user)
    
    db.delete(student)
    db.commit()
    response_cache.invalidate(prefix="students:")
    return None


# ==================== TRAINERS ENDPOINTS ====================

@router.get("/trainers", response_model=PaginatedTrainersResponse)
def list_trainers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", min_length=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all trainers with pagination."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list trainers"
        )

    cache_key = f"trainers:{page}:{page_size}:{search}"

    def fetch_trainers():
        query = db.query(User).filter(User.role == "trainer")

        # Search by email or username
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (User.email.ilike(search_term)) |
                (User.username.ilike(search_term))
            )

        total = query.count()
        total_pages = (total + page_size - 1) // page_size

        # Pagination
        offset = (page - 1) * page_size
        trainers = query.offset(offset).limit(page_size).all()

        items = [
            TrainerResponse(
                id=t.id,
                name=t.username,
                email=t.email,
                subjects=None
            )
            for t in trainers
        ]

        return PaginatedTrainersResponse(
            items=items,
            total=total,
            total_pages=total_pages,
            page=page,
            page_size=page_size
        )

    if redis_cache and redis_cache.available():
        cached = redis_cache.get(cache_key)
        if cached:
            return cached
        result = fetch_trainers()
        redis_cache.set(cache_key, result.model_dump())
        return result

    return cached_response(cache_key, fetch_trainers)


@router.post("/trainers", status_code=status.HTTP_201_CREATED)
def create_trainer(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Create a new trainer."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create trainers"
        )
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == payload.get("email")).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create trainer user
    user = User(
        username=payload.get("email", "").split("@")[0],
        email=payload.get("email"),
        password_hash=get_password_hash(payload.get("password", "password123")),
        role="trainer",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response_cache.invalidate(prefix="trainers:")
    if redis_cache and redis_cache.available():
        redis_cache.invalidate(prefix="trainers:")
    if background_tasks:
        background_tasks.add_task(lambda: None)
    else:
        task_queue.submit(lambda: None)
    
    return {
        "id": user.id,
        "name": user.username,
        "email": user.email,
        "role": "trainer"
    }


@router.delete("/trainers/{trainer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trainer(
    trainer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a trainer."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete trainers"
        )
    
    trainer = db.query(User).filter(User.id == trainer_id, User.role == "trainer").first()
    if not trainer:
        raise HTTPException(status_code=404, detail="Trainer not found")
    
    db.delete(trainer)
    db.commit()
    response_cache.invalidate(prefix="trainers:")
    if redis_cache and redis_cache.available():
        redis_cache.invalidate(prefix="trainers:")
    return None


# ==================== SESSIONS ENDPOINTS ====================

@router.get("/sessions", response_model=PaginatedSessionsResponse)
def list_sessions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str = Query("", min_length=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sessions with pagination."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list sessions"
        )

    cache_key = f"sessions:{page}:{page_size}:{search}"

    def fetch_sessions():
        query = db.query(SessionModel)

        # Search by title or class_name
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (SessionModel.title.ilike(search_term)) |
                (SessionModel.class_name.ilike(search_term))
            )

        total = query.count()
        total_pages = (total + page_size - 1) // page_size

        # Pagination
        offset = (page - 1) * page_size
        sessions = query.offset(offset).limit(page_size).all()

        items = [
            SessionResponse(
                id=s.id,
                title=s.title,
                class_name=s.class_name,
                trainer_id=getattr(s, "trainer_id", None),
                date=s.session_date.isoformat() if hasattr(s, "session_date") and s.session_date else "",
                start_time=str(getattr(s, "start_time", "")),
                end_time=str(getattr(s, "end_time", ""))
            )
            for s in sessions
        ]

        return PaginatedSessionsResponse(
            items=items,
            total=total,
            total_pages=total_pages,
            page=page,
            page_size=page_size
        )

    if redis_cache and redis_cache.available():
        cached = redis_cache.get(cache_key)
        if cached:
            return cached
        result = fetch_sessions()
        redis_cache.set(cache_key, result.model_dump())
        return result

    return cached_response(cache_key, fetch_sessions)


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """Create a new session."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create sessions"
        )
    
    try:
        session_obj = SessionModel(
            title=payload.get("title"),
            class_name=payload.get("className"),
            trainer_id=payload.get("trainerId"),
            session_date=payload.get("date"),
            start_time=payload.get("startTime"),
            end_time=payload.get("endTime")
        )
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)
        response_cache.invalidate(prefix="sessions:")
        if redis_cache and redis_cache.available():
            redis_cache.invalidate(prefix="sessions:")
        if background_tasks:
            background_tasks.add_task(lambda: None)
        else:
            task_queue.submit(lambda: None)
        
        return {
            "id": session_obj.id,
            "title": session_obj.title,
            "class_name": session_obj.class_name
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a session."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete sessions"
        )
    
    session_obj = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session_obj)
    db.commit()
    response_cache.invalidate(prefix="sessions:")
    if redis_cache and redis_cache.available():
        redis_cache.invalidate(prefix="sessions:")
    return None


# ==================== SMART SEARCH ====================

@router.get("/search", response_model=SmartSearchResponse)
def smart_search(
    q: str = Query("", min_length=1),
    limit: int = Query(15, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can search across entities")

    term = f"%{q}%"

    students = (
        db.query(Student)
        .filter(
            or_(
                Student.first_name.ilike(term),
                Student.last_name.ilike(term),
                Student.student_code.ilike(term),
                Student.email.ilike(term),
            )
        )
        .limit(limit)
        .all()
    )

    trainers = (
        db.query(User)
        .filter(User.role == "trainer")
        .filter(or_(User.email.ilike(term), User.username.ilike(term)))
        .limit(limit)
        .all()
    )

    sessions = (
        db.query(SessionModel)
        .filter(or_(SessionModel.topic.ilike(term), getattr(SessionModel, "class_name", SessionModel.topic).ilike(term)))
        .limit(limit)
        .all()
    )

    items: List[SmartSearchItem] = []
    for s in students[: limit // 3]:
        items.append(
            SmartSearchItem(
                id=s.id,
                entity="student",
                title=f"{s.first_name} {s.last_name}",
                subtitle=f"{s.student_code} · {s.class_name}",
            )
        )

    for t in trainers[: limit // 3]:
        items.append(
            SmartSearchItem(
                id=t.id,
                entity="trainer",
                title=t.username,
                subtitle=t.email,
            )
        )

    for sess in sessions[: limit // 3]:
        items.append(
            SmartSearchItem(
                id=sess.id,
                entity="session",
                title=getattr(sess, "topic", "Session"),
                subtitle=f"{getattr(sess, 'class_name', '')} · {getattr(sess, 'session_date', '')}",
            )
        )

    return SmartSearchResponse(items=items)


# ==================== USERS (Legacy) ====================

@router.post("/users", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_user(payload: CreateUserPayload, db: Session = Depends(get_db)):
    role = payload.role.lower()
    if role not in {"admin", "trainer", "student"}:
        raise HTTPException(status_code=422, detail="Invalid role")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    # Create user with default password 'password123' (user should change it)
    user = User(
        username=payload.email.split("@")[0],
        email=payload.email,
        password_hash=get_password_hash("password123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    saved = []
    faces_root = Path("/app/storage/faces")
    faces_root.mkdir(parents=True, exist_ok=True)
    user_dir = faces_root / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    # Save base64 images to disk
    for idx, b64 in enumerate(payload.imagesBase64[:3]):
        try:
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            data = base64.b64decode(b64)
            out = user_dir / f"capture_{idx+1}.jpg"
            out.write_bytes(data)
            saved.append(str(out))
        except Exception:
            continue

    # Enroll face embeddings into DB (pgvector) for user/student
    if payload.imagesBase64:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        student_id = student.id if student else user.id

        embeddings = facial_service.encode_multiple(payload.imagesBase64[:3])
        for i, emb_np in enumerate(embeddings):
            emb_str = str(emb_np.tolist())
            db.execute(
                text(
                    """
                    INSERT INTO facial_embeddings (student_id, image_path, image_hash, embedding_model, is_primary, embedding_vector)
                    VALUES (:sid, :path, :hash, 'insightface', :is_primary, :vec::vector)
                    ON CONFLICT DO NOTHING
                    """
                ),
                {
                    "sid": student_id,
                    "path": saved[i] if i < len(saved) else f"/storage/faces/{user.id}_{i}.jpg",
                    "hash": "",
                    "is_primary": i == 0,
                    "vec": emb_str,
                },
            )
        db.commit()
        # Mark student as enrolled
        if student:
            student.facial_data_encoded = True
            db.commit()

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "images_saved": saved,
        "embeddings_status": "enrolled",
    }
