from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.schemas.student import StudentOut, StudentListResponse, StudentUpdate
from app.services.user import UserService
from app.utils.deps import get_db, get_current_user
from app.models.user import User
from app.models.student import Student

router = APIRouter(tags=["students"])


@router.get("", response_model=StudentListResponse)
def list_students(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    class_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get list of all students with pagination and optional filtering."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/trainer can view students"
        )

    query = db.query(Student)
    
    if class_name:
        query = query.filter(Student.class_name == class_name)
    
    total = query.count()
    
    # Pagination
    offset = (page - 1) * page_size
    students = query.offset(offset).limit(page_size).all()
    
    return StudentListResponse(
        students=students,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific student by ID."""
    if current_user.role not in ["admin", "trainer", "student"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view student details"
        )
    
    student = UserService.get_student_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Students can only view their own data
    if current_user.role == "student":
        if student.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access other student's data"
            )
    
    return student


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update student information."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/trainer can update student data"
        )
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Update fields
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(student, field, value)
    
    db.commit()
    db.refresh(student)
    return student


@router.get("/class/{class_name}", response_model=list[StudentOut])
def get_students_by_class(
    class_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all students in a specific class."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/trainer can view class students"
        )
    
    students = UserService.get_students_by_class(db, class_name)
    return students


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a student (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete students"
        )
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(student)
    db.commit()
    return None
