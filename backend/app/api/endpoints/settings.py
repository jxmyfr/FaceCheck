from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional

from app.models.database import get_db, SemesterSetting
from app.models.user import User
from app.core.dependencies import require_admin, require_teacher_or_admin

router = APIRouter()


class SemesterUpdate(BaseModel):
    name: Optional[str] = None
    academic_year: Optional[str] = None
    semester_number: Optional[int] = None
    term_start: Optional[date] = None
    term_end: Optional[date] = None
    face_threshold: Optional[float] = None
    min_det_score:  Optional[float] = None
    min_face_ratio: Optional[float] = None
    min_blur_score: Optional[float] = None


def _fmt(s: SemesterSetting) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "academic_year": s.academic_year,
        "semester_number": s.semester_number if s.semester_number is not None else 1,
        "term_start": str(s.term_start) if s.term_start else None,
        "term_end": str(s.term_end) if s.term_end else None,
        "is_active": s.is_active,
        "face_threshold":  s.face_threshold  if s.face_threshold  is not None else 1.0,
        "min_det_score":   s.min_det_score   if s.min_det_score   is not None else 0.65,
        "min_face_ratio":  s.min_face_ratio  if s.min_face_ratio  is not None else 0.08,
        "min_blur_score":  s.min_blur_score  if s.min_blur_score  is not None else 40.0,
    }


@router.get("/semester")
def get_semester(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    setting = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if not setting:
        return {
            "id": None, "name": None, "academic_year": None, "semester_number": 1,
            "term_start": None, "term_end": None, "is_active": True,
            "face_threshold": 1.0, "min_det_score": 0.65,
            "min_face_ratio": 0.08, "min_blur_score": 40.0,
        }
    return _fmt(setting)


@router.put("/semester")
def update_semester(
    data: SemesterUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    setting = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if not setting:
        setting = SemesterSetting(is_active=True)
        db.add(setting)
    if data.name is not None:
        setting.name = data.name
    if data.academic_year is not None:
        setting.academic_year = data.academic_year
    if data.semester_number is not None:
        setting.semester_number = data.semester_number
    if data.term_start is not None:
        setting.term_start = data.term_start
    if data.term_end is not None:
        setting.term_end = data.term_end
    if data.face_threshold  is not None:
        setting.face_threshold  = max(0.1,  min(3.0,  data.face_threshold))
    if data.min_det_score   is not None:
        setting.min_det_score   = max(0.3,  min(0.95, data.min_det_score))
    if data.min_face_ratio  is not None:
        setting.min_face_ratio  = max(0.01, min(0.3,  data.min_face_ratio))
    if data.min_blur_score  is not None:
        setting.min_blur_score  = max(0.0,  min(200.0, data.min_blur_score))
    db.commit()
    db.refresh(setting)
    return _fmt(setting)


@router.get("/semesters")
def list_semesters(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    items = db.query(SemesterSetting).order_by(SemesterSetting.id.desc()).all()
    return [_fmt(s) for s in items]


class NewSemesterBody(BaseModel):
    name: str
    academic_year: Optional[str] = None
    semester_number: Optional[int] = 1
    term_start: Optional[date] = None
    term_end: Optional[date] = None


@router.post("/semester/new")
def new_semester(
    body: NewSemesterBody,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    # Archive current active semester
    current = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if current:
        current.is_active = False

    setting = SemesterSetting(
        name=body.name,
        academic_year=body.academic_year,
        semester_number=body.semester_number,
        term_start=body.term_start,
        term_end=body.term_end,
        is_active=True,
        face_threshold=current.face_threshold if current else 1.0,
        min_det_score=current.min_det_score if current else 0.65,
        min_face_ratio=current.min_face_ratio if current else 0.08,
        min_blur_score=current.min_blur_score if current else 40.0,
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return _fmt(setting)
