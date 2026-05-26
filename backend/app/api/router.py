from fastapi import APIRouter
from app.api.endpoints import enroll, attendance, stats, auth, settings, reports, audit, sessions, holidays

api_router = APIRouter()

api_router.include_router(auth.router,       prefix="/auth",       tags=["authentication"])
api_router.include_router(enroll.router,     prefix="/enroll",     tags=["enrollment"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(stats.router,      prefix="/stats",      tags=["statistics"])
api_router.include_router(settings.router,   prefix="/settings",   tags=["settings"])
api_router.include_router(reports.router,    prefix="/reports",    tags=["reports"])
api_router.include_router(audit.router,      prefix="/audit",      tags=["audit"])
api_router.include_router(sessions.router,   prefix="/sessions",   tags=["sessions"])
api_router.include_router(holidays.router,   prefix="/holidays",   tags=["holidays"])
