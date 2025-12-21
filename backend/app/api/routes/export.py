"""Export routes for PDF and Excel reports."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.models.attendance import Attendance
from app.models.student import Student
from app.models.user import User
from app.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/attendance/pdf")
async def export_attendance_pdf(
    session_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export attendance records to PDF."""
    if current_user.role not in ['trainer', 'admin']:
        raise HTTPException(status_code=403, detail="Trainer or admin access required")
    
    export_service = ExportService(db)
    
    # Build query
    query = db.query(Attendance)
    
    filters = {}
    if session_id:
        query = query.filter(Attendance.session_id == session_id)
        filters['session_id'] = session_id
    
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
        filters['student_id'] = student_id
    
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.filter(Attendance.marked_at >= start)
        filters['start_date'] = start_date
    
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.filter(Attendance.marked_at <= end)
        filters['end_date'] = end_date
    
    records = query.all()
    
    if not records:
        raise HTTPException(status_code=404, detail="No attendance records found")
    
    pdf_buffer = export_service.export_attendance_to_pdf(
        attendance_records=records,
        title="Attendance Report",
        filters=filters,
    )
    
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/attendance/excel")
async def export_attendance_excel(
    session_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export attendance records to Excel."""
    if current_user.role not in ['trainer', 'admin']:
        raise HTTPException(status_code=403, detail="Trainer or admin access required")
    
    export_service = ExportService(db)
    
    # Build query
    query = db.query(Attendance)
    
    if session_id:
        query = query.filter(Attendance.session_id == session_id)
    
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.filter(Attendance.marked_at >= start)
    
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.filter(Attendance.marked_at <= end)
    
    records = query.all()
    
    if not records:
        raise HTTPException(status_code=404, detail="No attendance records found")
    
    excel_buffer = export_service.export_attendance_to_excel(
        attendance_records=records,
        title="Attendance Report",
    )
    
    filename = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/student/{student_id}/report")
async def export_student_report(
    student_id: int,
    format: str = Query("pdf", regex="^(pdf|excel)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export comprehensive student attendance report."""
    if current_user.role not in ['trainer', 'admin']:
        # Students can only export their own reports
        if current_user.role != 'student' or current_user.id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    export_service = ExportService(db)
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    records = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    
    if format == "pdf":
        buffer = export_service.export_student_report_pdf(student, records)
        media_type = "application/pdf"
        ext = "pdf"
    else:
        buffer = export_service.export_attendance_to_excel(records, title=f"{student.full_name} Report")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    
    filename = f"student_{student_id}_report_{datetime.now().strftime('%Y%m%d')}.{ext}"
    
    return StreamingResponse(
        buffer,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
