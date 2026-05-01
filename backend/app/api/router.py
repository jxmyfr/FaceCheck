# Central API Router
from fastapi import APIRouter
from app.api.endpoints import enroll, attendance, stats, auth, settings, reports, audit

api_router = APIRouter()

# รวมเส้นทาง API ของแต่ละโมดูลเข้าด้วยกัน
api_router.include_router(auth.router,       prefix="/auth",       tags=["authentication"])
api_router.include_router(enroll.router,     prefix="/enroll",     tags=["enrollment"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(stats.router,      prefix="/stats",      tags=["statistics"])
api_router.include_router(settings.router,   prefix="/settings",   tags=["settings"])
api_router.include_router(reports.router,    prefix="/reports",    tags=["reports"])
api_router.include_router(audit.router,      prefix="/audit",      tags=["audit"])