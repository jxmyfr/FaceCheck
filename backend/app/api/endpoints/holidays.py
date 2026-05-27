from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date
from typing import Optional
import urllib.request
import urllib.error
import json

from app.models.database import get_db, Holiday
from app.models.user import User
from app.core.dependencies import require_admin, require_teacher_or_admin

router = APIRouter()


def _fmt(h: Holiday) -> dict:
    return {
        "id": h.id,
        "date": str(h.holiday_date),
        "name": h.name,
        "type": h.holiday_type,
        "year": h.year,
    }


@router.get("/")
def list_holidays(
    year: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    items = db.query(Holiday).filter(Holiday.year == year).order_by(Holiday.holiday_date).all()
    return [_fmt(h) for h in items]


class HolidayCreate(BaseModel):
    date: date
    name: str
    type: str = "school"


@router.post("/")
def create_holiday(
    body: HolidayCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if body.type not in ("public", "school"):
        raise HTTPException(status_code=400, detail="type ต้องเป็น public หรือ school")
    existing = db.query(Holiday).filter(
        Holiday.holiday_date == body.date,
        Holiday.name == body.name,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="วันหยุดนี้มีอยู่แล้ว")
    h = Holiday(
        holiday_date=body.date,
        name=body.name,
        holiday_type=body.type,
        year=body.date.year,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return _fmt(h)


@router.delete("/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    h = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="ไม่พบวันหยุดนี้")
    db.delete(h)
    db.commit()
    return {"deleted": True}


@router.post("/sync/{year}")
def sync_thai_holidays(
    year: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/TH"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "facecheck/1.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"API ตอบกลับ HTTP {e.code}: {e.reason}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"เชื่อมต่อ API ไม่ได้: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ดึงข้อมูลวันหยุดไม่สำเร็จ: {e}")

    if not raw.strip():
        raise HTTPException(status_code=502, detail="API ส่งข้อมูลว่างกลับมา ลองใหม่อีกครั้ง")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"API ส่งข้อมูลที่ไม่ใช่ JSON: {raw[:200]}")

    added = 0
    for item in data:
        try:
            h_date = date.fromisoformat(item["date"])
            name = item.get("localName") or item.get("name", "")
            existing = db.query(Holiday).filter(
                Holiday.holiday_date == h_date,
                Holiday.holiday_type == "public",
            ).first()
            if not existing:
                db.add(Holiday(
                    holiday_date=h_date,
                    name=name,
                    holiday_type="public",
                    year=year,
                ))
                added += 1
        except Exception:
            continue

    db.commit()
    return {"synced": len(data), "added": added, "year": year}


@router.get("/check")
def check_holiday(
    date_str: str = Query(..., alias="date"),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="รูปแบบวันที่ไม่ถูกต้อง (ใช้ YYYY-MM-DD)")
    h = db.query(Holiday).filter(Holiday.holiday_date == d).first()
    return {"is_holiday": h is not None, "holiday": _fmt(h) if h else None}
