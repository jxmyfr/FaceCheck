# Central API Router
from fastapi import APIRouter
from app.api.endpoints import enroll, attendance, stats

api_router = APIRouter()

# รวมเส้นทาง API ของแต่ละโมดูลเข้าด้วยกัน 
api_router.include_router(enroll.router, prefix="/enroll", tags=["enrollment"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(stats.router, prefix="/stats", tags=["statistics"])