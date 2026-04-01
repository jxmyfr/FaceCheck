import cv2
import numpy as np
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.database import get_db

from app.models.database import Student, AttendanceLog, get_db
from app.services.face_proc import FaceProcessor

router = APIRouter()
face_processor = FaceProcessor()

@router.post("/scan")
async def scan_attendance(
    subject_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    # 1. อ่านไฟล์ภาพและเช็คความถูกต้อง
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 2. ประมวลผลใบหน้า (สกัด Embedding และเช็ค Liveness)
    current_embedding = face_processor.process_capture(frame)
    if current_embedding is None:
        raise HTTPException(status_code=400, detail="Face detection or liveness check failed")

    # 3. ค้นหาใบหน้าที่ใกล้เคียงที่สุดในฐานข้อมูล (Vectorized Matching)
    # ดึงเฉพาะนักเรียนที่มีการลงทะเบียนใบหน้าไว้แล้ว 
    students = db.query(Student).filter(Student.face_embedding!= b"").all()
    
    best_match = None
    min_dist = 0.6  # Threshold มาตรฐานเพื่อความแม่นยำสูงสุด 

    for student in students:
        # แปลง Binary กลับเป็น NumPy Array เพื่อเปรียบเทียบ
        stored_emb = np.frombuffer(student.face_embedding, dtype=np.float32)
        
        # คำนวณระยะห่างทางคณิตศาสตร์ (Euclidean Distance)
        # สูตร: d = sqrt(sum((p - q)^2))
        is_match, dist = face_processor.compare_faces(current_embedding, stored_emb, threshold=min_dist)
        
        if is_match and dist < min_dist:
            min_dist = dist
            best_match = student

    # 4. บันทึกประวัติหากพบนักเรียนที่ถูกต้อง
    if best_match:
        new_log = AttendanceLog(
            student_id=best_match.id,
            subject_id=subject_id,
            status="present"
        )
        db.add(new_log)
        db.commit()
        return {
            "status": "success",
            "name": f"{best_match.first_name} {best_match.last_name}",
            "student_id": best_match.student_id
        }
    
    raise HTTPException(status_code=404, detail="Student not recognized")