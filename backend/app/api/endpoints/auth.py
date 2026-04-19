from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.models.database import Subject, get_db
from app.models.user import User, TeacherSubject
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.core.dependencies import get_current_user, require_admin

router = APIRouter()
bearer_scheme = HTTPBearer()


# ── Schemas ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "teacher"  # "admin" | "teacher"

class RefreshRequest(BaseModel):
    refresh_token: str


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Login → คืน access_token + refresh_token"""
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email หรือ Password ไม่ถูกต้อง")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="บัญชีนี้ถูกระงับการใช้งาน")

    access_token  = create_access_token({"sub": str(user.id), "role": user.role})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "user": {
            "id":        user.id,
            "email":     user.email,
            "full_name": user.full_name,
            "role":      user.role,
        },
    }


@router.post("/refresh")
def refresh_token(body: RefreshRequest, db: Session = Depends(get_db)):
    """แลก refresh_token → access_token ใหม่"""
    payload = decode_token(body.refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Refresh token ไม่ถูกต้องหรือหมดอายุ")

    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="ไม่พบผู้ใช้")

    new_token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": new_token, "token_type": "bearer"}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),   # เฉพาะ Admin สร้าง user ใหม่ได้
):
    """Admin สร้างบัญชีครูหรือ Admin ใหม่"""
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email นี้มีในระบบแล้ว")
    if body.role not in ("admin", "teacher"):
        raise HTTPException(status_code=400, detail="role ต้องเป็น admin หรือ teacher เท่านั้น")

    new_user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id":        new_user.id,
        "email":     new_user.email,
        "full_name": new_user.full_name,
        "role":      new_user.role,
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """ดูข้อมูลตัวเอง"""
    return {
        "id":        current_user.id,
        "email":     current_user.email,
        "full_name": current_user.full_name,
        "role":      current_user.role,
        "is_active": current_user.is_active,
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin ดูรายชื่อ user ทั้งหมด"""
    users = db.query(User).order_by(User.id).all()
    return [
        {
            "id":        u.id,
            "email":     u.email,
            "full_name": u.full_name,
            "role":      u.role,
            "is_active": u.is_active,
        }
        for u in users
    ]
    
    
@router.get("/users/{user_id}/subjects")
def get_teacher_subjects(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    records = db.query(TeacherSubject).filter_by(teacher_id=user_id).all()
    result = []
    for r in records:
        s = db.query(Subject).filter(Subject.id == r.subject_id).first()
        if s:
            result.append({"id": s.id, "subject_code": s.subject_code, "subject_name": s.subject_name})
    return result


@router.patch("/users/{user_id}/toggle")
def toggle_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin เปิด/ปิดบัญชีผู้ใช้"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้")

    user.is_active = not user.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.post("/users/{user_id}/assign-subject/{subject_id}")
def assign_subject(
    user_id: int,
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin มอบหมายวิชาให้ครู"""
    existing = db.query(TeacherSubject).filter_by(
        teacher_id=user_id, subject_id=subject_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="มอบหมายวิชานี้ให้ครูคนนี้แล้ว")

    db.add(TeacherSubject(teacher_id=user_id, subject_id=subject_id))
    db.commit()
    return {"message": "มอบหมายวิชาสำเร็จ"}


@router.delete("/users/{user_id}/assign-subject/{subject_id}", status_code=204)
def remove_subject(
    user_id: int,
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin ถอนวิชาจากครู"""
    record = db.query(TeacherSubject).filter_by(
        teacher_id=user_id, subject_id=subject_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="ไม่พบการมอบหมายนี้")
    db.delete(record)
    db.commit()