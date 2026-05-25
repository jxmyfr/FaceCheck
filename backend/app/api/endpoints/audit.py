from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import get_db, AttendanceAuditLog
from app.models.user import User
from app.core.dependencies import require_admin

router = APIRouter()

ACTION_LABEL = {
    "status_change": "เปลี่ยนสถานะ",
    "delete":        "ยกเลิกการเช็คชื่อ",
    "create":        "บันทึกการเช็คชื่อ",
}


@router.get("/logs")
def get_audit_logs(
    limit:      int            = Query(default=50, ge=1, le=200),
    offset:     int            = Query(default=0,  ge=0),
    date_from:  Optional[str]  = Query(default=None, description="YYYY-MM-DD"),
    date_to:    Optional[str]  = Query(default=None, description="YYYY-MM-DD"),
    action:     Optional[str]  = Query(default=None, description="status_change | delete | create"),
    student_id: Optional[str]  = Query(default=None, description="รหัสนักเรียน"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(AttendanceAuditLog)
    if date_from:
        q = q.filter(func.date(AttendanceAuditLog.timestamp) >= date_from)
    if date_to:
        q = q.filter(func.date(AttendanceAuditLog.timestamp) <= date_to)
    if action:
        q = q.filter(AttendanceAuditLog.action == action)
    if student_id:
        q = q.filter(AttendanceAuditLog.student_id_str.like(f"%{student_id}%"))

    total = q.with_entities(func.count(AttendanceAuditLog.id)).scalar() or 0
    rows  = q.order_by(AttendanceAuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "logs": [
            {
                "id":               r.id,
                "action":           r.action,
                "action_label":     ACTION_LABEL.get(r.action, r.action),
                "changed_by_name":  r.changed_by_name,
                "old_status":       r.old_status,
                "new_status":       r.new_status,
                "reason":           r.reason,
                "timestamp":        r.timestamp.isoformat(),
                "student_id":       r.student_id_str,
                "student_name":     r.student_name,
                "subject_code":     r.subject_code,
                "subject_name":     r.subject_name,
                "log_date":         str(r.log_date) if r.log_date else None,
            }
            for r in rows
        ],
    }
