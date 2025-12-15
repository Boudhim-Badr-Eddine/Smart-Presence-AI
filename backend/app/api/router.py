from fastapi import APIRouter
from app.api.routes import (
    auth, facial, users, sessions, students, attendance, chatbot, 
    notifications, reports, admin, admin_users, imports, analytics,
    trainer, student, messages
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth")
api_router.include_router(facial.router, prefix="/facial")
api_router.include_router(users.router, prefix="/users")
api_router.include_router(sessions.router, prefix="/sessions")
api_router.include_router(students.router, prefix="/students")
api_router.include_router(attendance.router, prefix="/attendance")
api_router.include_router(chatbot.router, prefix="/chatbot")
api_router.include_router(notifications.router, prefix="/notifications")
api_router.include_router(reports.router, prefix="/reports")
api_router.include_router(admin.router, prefix="/admin")
api_router.include_router(admin_users.router, prefix="/admin")
api_router.include_router(imports.router, prefix="/admin")
api_router.include_router(analytics.router, prefix="/admin")
api_router.include_router(trainer.router, prefix="/trainer")
api_router.include_router(student.router, prefix="/student")
api_router.include_router(messages.router, prefix="/messages")
try:
	from app.api.routes import embeddings
	api_router.include_router(embeddings.router, prefix="/embeddings")
except Exception:
	# Optional route: ignore if import fails
	pass
