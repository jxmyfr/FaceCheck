from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.user import User
from app.core.security import decode_token

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """ดึง user จาก JWT token — ใช้เป็น dependency ใน route"""
    token = credentials.credentials
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ไม่ถูกต้องหรือหมดอายุ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token ไม่มีข้อมูล user")

    user = db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="ไม่พบผู้ใช้หรือถูกระงับบัญชี")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """เฉพาะ Admin เท่านั้น"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ต้องการสิทธิ์ Admin",
        )
    return current_user


def require_teacher_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """Admin หรือ Teacher เท่านั้น"""
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ต้องการสิทธิ์ Teacher หรือ Admin",
        )
    return current_user