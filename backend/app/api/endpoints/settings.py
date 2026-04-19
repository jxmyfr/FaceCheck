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


def _fmt(setting: SemesterSetting) -> dict:
    return {
        "id": setting.id,
        "name": setting.name,
        "term_start": str(setting.term_start) if setting.term_start else None,
        "term_end": str(setting.term_end) if setting.term_end else None,
    }


@router.get("/semester")
def get_semester(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    setting = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if not setting:
        return {"id": None, "name": None, "term_start": None, "term_end": None}
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
    db.commit()
    db.refresh(setting)
    return _fmt(setting)
