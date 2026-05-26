from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime, timezone
from typing import Optional

from app.models.database import get_db, ClassSession
from app.models.user import User
from app.core.dependencies import require_teacher_or_admin

router = APIRouter()


def _fmt(s: ClassSession) -> dict:
    return {
        "id": s.id,
        "subject_id": s.subject_id,
        "subject_name": s.subject.subject_name if s.subject else None,
        "subject_code": s.subject.subject_code if s.subject else None,
        "schedule_id": s.schedule_id,
        "teacher_id": s.teacher_id,
        "session_date": str(s.session_date),
        "opened_at": s.opened_at.isoformat() if s.opened_at else None,
        "closed_at": s.closed_at.isoformat() if s.closed_at else None,
        "is_open": s.closed_at is None,
    }


@router.get("/today")
def get_today_session(
    subject_id: int = Query(...),
    schedule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    today = date.today()
    q = db.query(ClassSession).filter(
        ClassSession.subject_id == subject_id,
        ClassSession.teacher_id == user.id,
        ClassSession.session_date == today,
    )
    if schedule_id:
        q = q.filter(ClassSession.schedule_id == schedule_id)
    session = q.order_by(ClassSession.id.desc()).first()
    return {"session": _fmt(session) if session else None}


class OpenBody(BaseModel):
    subject_id: int
    schedule_id: Optional[int] = None
    note: Optional[str] = None


@router.post("/open")
def open_session(
    body: OpenBody,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    today = date.today()
    existing = db.query(ClassSession).filter(
        ClassSession.subject_id == body.subject_id,
        ClassSession.teacher_id == user.id,
        ClassSession.session_date == today,
        ClassSession.closed_at == None,
    ).first()
    if existing:
        return {"session": _fmt(existing), "created": False}

    s = ClassSession(
        subject_id=body.subject_id,
        schedule_id=body.schedule_id,
        teacher_id=user.id,
        session_date=today,
        note=body.note,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"session": _fmt(s), "created": True}


@router.post("/{session_id}/close")
def close_session(
    session_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    s = db.query(ClassSession).filter(ClassSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="ไม่พบ session นี้")
    if s.closed_at:
        raise HTTPException(status_code=400, detail="ปิดคาบนี้ไปแล้ว")
    s.closed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(s)
    return {"session": _fmt(s)}


@router.get("/")
def list_sessions(
    subject_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher_or_admin),
):
    q = db.query(ClassSession)
    if subject_id:
        q = q.filter(ClassSession.subject_id == subject_id)
    if date_from:
        q = q.filter(ClassSession.session_date >= date_from)
    if date_to:
        q = q.filter(ClassSession.session_date <= date_to)
    if user.role != "admin":
        q = q.filter(ClassSession.teacher_id == user.id)
    total = q.count()
    items = q.order_by(ClassSession.session_date.desc(), ClassSession.id.desc()).offset(offset).limit(limit).all()
    return {"total": total, "sessions": [_fmt(s) for s in items]}
