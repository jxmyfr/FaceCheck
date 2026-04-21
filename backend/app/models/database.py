from datetime import datetime, date
from pathlib import Path
from typing import List, Optional
from sqlalchemy import String, Integer, LargeBinary, ForeignKey, DateTime, Date, Boolean, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker
 
# คลาสฐานสำหรับ Models
class Base(DeclarativeBase):
    pass
 
class Student(Base):
    """ตารางเก็บข้อมูลนักเรียนและค่าอัตลักษณ์ใบหน้า"""
    __tablename__ = "students"
 
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    grade_level: Mapped[Optional[str]] = mapped_column(String(10)) 
    room_number: Mapped[Optional[str]] = mapped_column(String(10))
    
    # เก็บ Face Embedding เป็นเวกเตอร์ตัวเลข (Binary) เพื่อความไวสูงสุด
    face_embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    # เก็บรูปใบหน้า JPEG สำหรับแสดงผล
    face_image: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    
    # เชื่อมไปยังประวัติการเข้าเรียน
    attendance_records: Mapped[List["AttendanceLog"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )
 
class Subject(Base):
    """ตารางเก็บข้อมูลรายวิชา"""
    __tablename__ = "subjects"
 
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # เชื่อมไปยังประวัติการเข้าเรียน
    attendance_records: Mapped[List["AttendanceLog"]] = relationship(
        back_populates="subject"
    )
 
class AttendanceLog(Base):
    """ตารางบันทึกประวัติการสแกนใบหน้าเข้าเรียนรายวิชา"""
    __tablename__ = "attendance_logs"
 
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    
    # บันทึกเวลาที่สแกนสำเร็จโดยอัตโนมัติ
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="present")
    
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


# การตั้งค่าการเชื่อมต่อฐานข้อมูล SQLite
BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
SQLALCHEMY_DATABASE_URL = f"sqlite:///{STORAGE_DIR / 'database.db'}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} # สำหรับ SQLite เท่านั้น
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
 
def get_db():
    """ฟังก์ชันจัดการวงจรชีวิตของ Database Session สำหรับ API"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()