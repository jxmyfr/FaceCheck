from __future__ import annotations

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base

if TYPE_CHECKING:
    from app.models.subject import Subject


class User(Base):
    """ตารางเก็บข้อมูลผู้ใช้ระบบ (Admin / Teacher)"""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(50), unique=True, index=True, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="teacher")  # "admin" | "teacher"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    categories: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)  # comma-separated
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # ความสัมพันธ์กับรายวิชา (teacher สอนหลายวิชา)
    subjects: Mapped[List["TeacherSubject"]] = relationship(
        back_populates="teacher", cascade="all, delete-orphan"
    )


class TeacherSubject(Base):
    """ตารางกลาง เชื่อม Teacher ↔ Subject"""
    __tablename__ = "teacher_subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    teacher_id: Mapped[int] = mapped_column(
        __import__("sqlalchemy").ForeignKey("users.id"), nullable=False
    )
    subject_id: Mapped[int] = mapped_column(
        __import__("sqlalchemy").ForeignKey("subjects.id"), nullable=False
    )

    teacher: Mapped["User"] = relationship(back_populates="subjects")
    subject: Mapped["Subject"] = relationship("Subject")