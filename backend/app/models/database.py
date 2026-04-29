from datetime import datetime, date, timezone
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from sqlalchemy import String, Integer, LargeBinary, ForeignKey, DateTime, Date, Boolean, func, create_engine, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")
 
# คลาสฐานสำหรับ Models
class Base(DeclarativeBase):
    pass
 
class Student(Base):
    """ตารางเก็บข้อมูลนักเรียนและค่าอัตลักษณ์ใบหน้า"""
    __tablename__ = "students"
 
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    grade_level: Mapped[Optional[str]] = mapped_column(String(10)) 
    room_number: Mapped[Optional[str]] = mapped_column(String(10))
    
    # เก็บ Face Embedding เป็นเวกเตอร์ตัวเลข (Binary) เพื่อความไวสูงสุด
    face_embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False, default=b"")
    # เก็บรูปใบหน้า JPEG สำหรับแสดงผล
    face_image: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    
    attendance_records: Mapped[List["AttendanceLog"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
    face_embeddings: Mapped[List["StudentFaceEmbedding"]] = relationship(
        back_populates="student", cascade="all, delete-orphan", order_by="StudentFaceEmbedding.id"
    )
 
class StudentFaceEmbedding(Base):
    """ใบหน้าแต่ละมุม (สูงสุด 5 slot ต่อนักเรียน) — nearest-neighbor matching"""
    __tablename__ = "student_face_embeddings"

    id:         Mapped[int]   = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int]   = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    embedding:  Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    face_image: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    label:      Mapped[Optional[str]]   = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime]        = mapped_column(DateTime, server_default=func.now())

    student: Mapped["Student"] = relationship(back_populates="face_embeddings")


class Subject(Base):
    """ตารางเก็บข้อมูลรายวิชา"""
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    teacher_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    attendance_records: Mapped[List["AttendanceLog"]] = relationship(back_populates="subject")
    schedules: Mapped[List["SubjectSchedule"]] = relationship(back_populates="subject", cascade="all, delete-orphan")


class SubjectSchedule(Base):
    """ตารางสอน: วัน/เวลา/ห้องของแต่ละวิชา"""
    __tablename__ = "subject_schedules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)   # จ อ พ พฤ ศ ส อา
    time_start: Mapped[str] = mapped_column(String(5), nullable=False)     # HH:MM
    time_end: Mapped[str] = mapped_column(String(5), nullable=False)       # HH:MM
    grade_level: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    room_number: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    subject: Mapped["Subject"] = relationship(back_populates="schedules")
 
class AttendanceLog(Base):
    """ตารางบันทึกประวัติการสแกนใบหน้าเข้าเรียนรายวิชา"""
    __tablename__ = "attendance_logs"
 
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    
    # บันทึกเวลาที่สแกนสำเร็จโดยอัตโนมัติ
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="present")
    scan_image: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    
    # ✅ แก้ไขแล้ว: ระบุชื่อ Class ใน Mapped["ClassName"] ให้ครบถ้วน
    student: Mapped["Student"] = relationship(back_populates="attendance_records")
    subject: Mapped["Subject"] = relationship(back_populates="attendance_records")
 
class SemesterSetting(Base):
    """ตารางเก็บข้อมูลภาคเรียน (แอดมินกำหนด)"""
    __tablename__ = "semester_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), default="ภาคเรียนที่ 1")
    term_start: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    term_end: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    face_threshold: Mapped[float] = mapped_column(default=1.0)
    # Quality check thresholds (lower = more lenient, helps low-res cameras)
    min_det_score:  Mapped[float] = mapped_column(default=0.65)
    min_face_ratio: Mapped[float] = mapped_column(default=0.08)
    min_blur_score: Mapped[float] = mapped_column(default=40.0)


import os
BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL (Supabase)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # SQLite fallback (local dev)
    STORAGE_DIR = BASE_DIR / "storage"
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{STORAGE_DIR / 'database.db'}"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30},
    )
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        conn.execute(text("PRAGMA busy_timeout=30000"))

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
 
def get_db():
    """ฟังก์ชันจัดการวงจรชีวิตของ Database Session สำหรับ API"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()