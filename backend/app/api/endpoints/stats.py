from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, cast, Date
from typing import Optional
from datetime import date, datetime

from app.models.database import get_db, AttendanceLog, Student, Subject

router = APIRouter()


# ─────────────────────────────────────────────
# 1. ภาพรวมทั้งระบบ
# ─────────────────────────────────────────────
@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    """สรุปตัวเลขภาพรวม: นักเรียน, รายวิชา, การเช็คชื่อทั้งหมด, วันนี้"""

    total_students = db.query(func.count(Student.id)).scalar()
    total_subjects = db.query(func.count(Subject.id)).scalar()
    total_logs     = db.query(func.count(AttendanceLog.id)).scalar()

    # นับจำนวนการเช็คชื่อวันนี้
    today_logs = (
        db.query(func.count(AttendanceLog.id))
        .filter(cast(AttendanceLog.timestamp, Date) == date.today())
        .scalar()
    )

    return {
        "total_students": total_students,
        "total_subjects": total_subjects,
        "total_attendance_logs": total_logs,
        "attendance_today": today_logs,
    }


# ─────────────────────────────────────────────
# 2. สถิติรายวิชา
# ─────────────────────────────────────────────
@router.get("/by-subject")
def get_stats_by_subject(db: Session = Depends(get_db)):
    """นับจำนวน log การเข้าเรียนแยกตามรายวิชา"""

    rows = (
        db.query(
            Subject.subject_code,
            Subject.subject_name,
            func.count(AttendanceLog.id).label("attendance_count"),
            func.count(distinct(AttendanceLog.student_id)).label("unique_students"),
        )
        .join(AttendanceLog, AttendanceLog.subject_id == Subject.id, isouter=True)
        .group_by(Subject.id)
        .order_by(func.count(AttendanceLog.id).desc())
        .all()
    )

    return [
        {
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
            "attendance_count": r.attendance_count,
            "unique_students": r.unique_students,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────
# 3. สถิติรายวัน (ย้อนหลัง N วัน)
# ─────────────────────────────────────────────
@router.get("/daily")
def get_daily_stats(
    days: int = Query(default=7, ge=1, le=90, description="จำนวนวันย้อนหลัง"),
    db: Session = Depends(get_db),
):
    """นับจำนวนการเช็คชื่อรายวัน เหมาะสำหรับแสดงกราฟเส้น"""

    rows = (
        db.query(
            cast(AttendanceLog.timestamp, Date).label("log_date"),
            func.count(AttendanceLog.id).label("count"),
        )
        .group_by("log_date")
        .order_by("log_date")
        .limit(days)
        .all()
    )

    return [{"date": str(r.log_date), "count": r.count} for r in rows]


# ─────────────────────────────────────────────
# 4. สถิติรายนักเรียน (Top N)
# ─────────────────────────────────────────────
@router.get("/top-students")
def get_top_students(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """นักเรียนที่มีจำนวนการเช็คชื่อสูงสุด"""

    rows = (
        db.query(
            Student.student_id,
            Student.first_name,
            Student.last_name,
            func.count(AttendanceLog.id).label("total_attendance"),
        )
        .join(AttendanceLog, AttendanceLog.student_id == Student.id, isouter=True)
        .group_by(Student.id)
        .order_by(func.count(AttendanceLog.id).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "student_id": r.student_id,
            "full_name": f"{r.first_name} {r.last_name}",
            "total_attendance": r.total_attendance,
        }
        for r in rows
    ]


# ─────────────────────────────────────────────
# 5. ประวัติการเช็คชื่อ (กรองตาม subject / วันที่)
# ─────────────────────────────────────────────
@router.get("/logs")
def get_attendance_logs(
    subject_code: Optional[str] = Query(default=None),
    log_date: Optional[date]    = Query(default=None),
    limit: int                  = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """ดึงประวัติการเช็คชื่อ กรองตามรายวิชาหรือวันที่ได้"""

    query = (
        db.query(
            AttendanceLog.timestamp,
            AttendanceLog.status,
            Student.student_id,
            Student.first_name,
            Student.last_name,
            Subject.subject_code,
            Subject.subject_name,
        )
        .join(Student, Student.id == AttendanceLog.student_id)
        .join(Subject, Subject.id == AttendanceLog.subject_id)
    )

    if subject_code:
        query = query.filter(Subject.subject_code == subject_code)
    if log_date:
        query = query.filter(cast(AttendanceLog.timestamp, Date) == log_date)

    rows = query.order_by(AttendanceLog.timestamp.desc()).limit(limit).all()

    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "status": r.status,
            "student_id": r.student_id,
            "full_name": f"{r.first_name} {r.last_name}",
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
        }
        for r in rows
    ]
    
@router.get("/summary")
async def get_summary(db: Session = Depends(get_db)):
    today = datetime.now().date()
    total = db.query(Student).count()
    present = db.query(AttendanceLog).filter(func.date(AttendanceLog.timestamp) == today).count()
    
    # ดึง 5 รายการล่าสุดเพื่อแสดงในตาราง Activity
    recent = db.query(AttendanceLog).order_by(AttendanceLog.timestamp.desc()).limit(5).all()
    
    return {
        "total": total,
        "present": present,
        "absent": total - present,
        "recent_logs": [{"name": log.student.first_name, "time": log.timestamp.strftime("%H:%M")} for log in recent]
    }