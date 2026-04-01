from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, LargeBinary, ForeignKey, DateTime, func, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

# คลาสฐานสำหรับ Models ทั้งหมด
class Base(DeclarativeBase):
    pass

class Student(Base):
    """ตารางเก็บข้อมูลพื้นฐานของนักเรียนและอัตลักษณ์ใบหน้า"""
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    grade_level: Mapped[Optional[str]] = mapped_column(String(10)) 
    room_number: Mapped[Optional[str]] = mapped_column(String(10))
    
    # เก็บ Face Embedding เป็นเวกเตอร์ตัวเลข (Binary)
    face_embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    
    # ระบุชนิดข้อมูลเป็น List["AttendanceLog"] เพื่อความชัดเจน
    attendance_records: Mapped[List["AttendanceLog"]] = relationship(
        back_populates="student", cascade="all, delete-orphan"
    )

class Subject(Base):
    """ตารางเก็บข้อมูลรายวิชา"""
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)

class AttendanceLog(Base):
    """ตารางบันทึกประวัติการสแกนใบหน้าเข้าเรียน"""
    __tablename__ = "attendance_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="present")
    
    # แก้ไขจุดสำคัญ: ต้องระบุ Mapped ให้ครบถ้วน
    student: Mapped = relationship(back_populates="attendance_records")

# การตั้งค่าการเชื่อมต่อฐานข้อมูล SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///../storage/database.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """ฟังก์ชัน Dependency Injection สำหรับ API เพื่อจัดการ lifecycle ของ session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """สร้างตารางในฐานข้อมูล"""
    Base.metadata.create_all(bind=engine)