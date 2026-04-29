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
    term_start: Optional[date] = None
    term_end: Optional[date] = None
    face_threshold: Optional[float] = None
    min_det_score:  Optional[float] = None
    min_face_ratio: Optional[float] = None
    min_blur_score: Optional[float] = None


def _fmt(setting: SemesterSetting) -> dict:
    return {
        "id": setting.id,
        "name": setting.name,
        "term_start": str(setting.term_start) if setting.term_start else None,
        "term_end": str(setting.term_end) if setting.term_end else None,
        "face_threshold":  setting.face_threshold  if setting.face_threshold  is not None else 1.0,
        "min_det_score":   setting.min_det_score   if setting.min_det_score   is not None else 0.65,
        "min_face_ratio":  setting.min_face_ratio  if setting.min_face_ratio  is not None else 0.08,
        "min_blur_score":  setting.min_blur_score  if setting.min_blur_score  is not None else 40.0,
    }


@router.get("/semester")
def get_semester(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    setting = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if not setting:
        return {
            "id": None, "name": None, "term_start": None, "term_end": None,
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
