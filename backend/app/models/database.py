from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, LargeBinary, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

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
    grade_level: Mapped[Optional[str]] = mapped_column(String(10))  # เช่น 'ม.5'
    room_number: Mapped[Optional[str]] = mapped_column(String(10))   # เช่น '1'
    
    # เก็บ Face Embedding เป็นเวกเตอร์ตัวเลขในรูปแบบ Binary (BLOB)
    # เพื่อประสิทธิภาพสูงสุดในการประมวลผลระยะห่าง (Distance Calculation)
    face_embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    
    # กำหนดความสัมพันธ์ไปยังประวัติการเข้าเรียน
    attendance_records: Mapped[List["AttendanceLog"]] = relationship(
        back_coordinates="student", cascade="all, delete-orphan"
    )

class Subject(Base):
    """ตารางเก็บข้อมูลรายวิชา"""
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    subject_name: Mapped[str] = mapped_column(String(100), nullable=False)

class AttendanceLog(Base):
    """ตารางบันทึกประวัติการสแกนใบหน้าเข้าเรียนรายวิชา"""
    __tablename__ = "attendance_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"), nullable=False)
    
    # บันทึกเวลาที่สแกนสำเร็จโดยอัตโนมัติ
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="present") # present, late, absent
    
    # เชื่อมโยงข้อมูลนักเรียนกลับมาเพื่อใช้ทำ Dashboard
    student: Mapped = relationship(back_coordinates="attendance_records")