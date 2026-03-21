import cv2
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.database import Student
from app.services.face_proc import FaceProcessor
from app.core.config import settings # สมมติว่ามีการตั้งค่า PATH ไว้

router = APIRouter()
face_processor = FaceProcessor()

# --- 1. Bulk Import API: นำเข้ารายชื่อนักเรียนจาก Excel/CSV ---
@router.post("/import-students", status_code=status.HTTP_201_CREATED)
async def import_students(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db) # ใช้ Dependency Injection สำหรับ DB Session
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์.xlsx หรือ.csv เท่านั้น")

    try:
        # อ่านไฟล์ด้วย Pandas
        df = pd.read_excel(file.file) if file.filename.endswith('.xlsx') else pd.read_csv(file.file)
        
        # ล้างข้อมูลเดิมและเพิ่มใหม่ (หรือจะใช้ตรรกะตรวจสอบการซ้ำ)
        imported_count = 0
        for _, row in df.iterrows():
            # ตรวจสอบว่ามีรหัสนักเรียนนี้อยู่แล้วหรือไม่
            existing = db.query(Student).filter(Student.student_id == str(row)).first()
            if not existing:
                new_student = Student(
                    student_id=str(row),
                    first_name=row.split(' '),
                    last_name=' '.join(row.split(' ')[1:]),
                    grade_level=row['Classroom'],
                    face_embedding=b"" # ยังไม่มีข้อมูลใบหน้า
                )
                db.add(new_student)
                imported_count += 1
        
        db.commit()
        return {"message": f"นำเข้ารายชื่อสำเร็จ {imported_count} รายการ"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการนำเข้า: {str(e)}")

# --- 2. Face Enrollment API: ลงทะเบียนใบหน้าจริง ---
@router.post("/register-face/{student_id}")
async def register_face(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. ตรวจสอบว่ามีนักเรียนคนนี้ในระบบหรือไม่
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสนักเรียนในฐานข้อมูล กรุณานำเข้ารายชื่อก่อน")

    # 2. แปลงไฟล์ภาพที่อัปโหลดเป็น OpenCV Format
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 3. ประมวลผลใบหน้า (Detection -> Liveness -> Embedding)
    embedding = face_processor.process_capture(frame)
    
    if embedding is None:
        raise HTTPException(
            status_code=400, 
            detail="ไม่พบใบหน้า หรือตรวจสอบแล้วไม่ใช่คนจริง (Liveness Failed)"
        )

    # 4. บันทึกค่า Embedding (BLOB) ลง SQLite
    student.face_embedding = embedding.tobytes()
    
    # 5. บันทึกรูปภาพต้นฉบับไว้เป็น Reference (ตั้งชื่อตาม Student ID)
    file_path = f"storage/faces/{student_id}.jpg"
    cv2.imwrite(file_path, frame)

    db.commit()
    return {"status": "success", "message": f"ลงทะเบียนใบหน้าของ {student.first_name} สำเร็จ"}