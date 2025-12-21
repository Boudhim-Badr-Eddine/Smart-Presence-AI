
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.report import ReportService
from app.utils.deps import get_current_user, get_db
from app.utils.task_queue import task_queue

router = APIRouter(tags=["reports"])


@router.get("/attendance/csv")
def export_attendance_csv(
    class_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export attendance report as CSV."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can export reports"
        )

    csv_data = ReportService.generate_attendance_csv(db, class_name)
    return StreamingResponse(
        iter([csv_data.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_report.csv"},
    )


@router.get("/attendance/summary")
def get_attendance_summary(
    class_name: str | None = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance summary report."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can view reports"
        )

    summary = ReportService.generate_attendance_summary(db, class_name=class_name, days=days)
    return summary


@router.get("/student/{student_id}")
def get_student_report(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comprehensive student report."""
    if current_user.id != student_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other student's report"
        )

    report = ReportService.generate_student_report(db, student_id)
    if not report:
        raise HTTPException(status_code=404, detail="Student not found")
    return report


@router.get("/class/{class_name}/analytics")
def get_class_analytics(
    class_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get class analytics and statistics."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin/trainer can view class analytics",
        )

    analytics = ReportService.generate_class_analytics(db, class_name)
    if not analytics:
        raise HTTPException(status_code=404, detail="Class not found")
    return analytics


@router.get("/attendance.pdf")
def export_attendance_pdf(
    student_id: int | None = None,
    class_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export attendance report as PDF."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can export reports"
        )

    pdf_data = ReportService.generate_pdf_report(db, student_id, class_name)
    return StreamingResponse(
        iter([pdf_data.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=attendance_report.pdf"},
    )


@router.get("/attendance.xlsx")
def export_attendance_xlsx(
    class_name: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export attendance report as Excel."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can export reports"
        )

    excel_data = ReportService.generate_excel_attendance_report(db, class_name)
    return StreamingResponse(
        iter([excel_data.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=attendance_report.xlsx"},
    )


@router.post("/schedule")
def schedule_report(
    class_name: str | None = None,
    cadence: str = "weekly",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue a background summary generation; persisted to tmp for now."""
    if current_user.role not in ["admin", "trainer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Only admin/trainer can schedule reports"
        )

    def _generate_and_store(target_class: str | None):
        summary = ReportService.generate_attendance_summary(db, class_name=target_class)
        with open("/tmp/last_attendance_report.json", "w", encoding="utf-8") as f:
            f.write(str(summary))

    task_queue.submit(_generate_and_store, class_name)
    return {"scheduled": True, "cadence": cadence, "class": class_name or "all"}
