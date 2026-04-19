import cv2
import numpy as np
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date

from app.models.database import get_db, Student, Subject, AttendanceLog
from app.models.user import User, TeacherSubject
from app.services.face_proc import FaceProcessor
from app.core.dependencies import require_teacher_or_admin, require_admin, get_current_user

router = APIRouter()
face_processor = FaceProcessor()


@router.post("/scan")
async def scan_attendance(
    subject_id: int = Query(..., description="ID ของรายวิชา"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายวิชา ID {subject_id}")

    # Teacher เช็คชื่อได้เฉพาะวิชาที่ตัวเองสอน
    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เช็คชื่อวิชานี้")

    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์ภาพได้")

    current_embedding = face_processor.process_capture(frame)
    if current_embedding is None:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้า หรือ Liveness check ไม่ผ่าน")

    students = db.query(Student).filter(Student.face_embedding != b"").all()
    if not students:
        raise HTTPException(status_code=404, detail="ยังไม่มีนักเรียนที่ลงทะเบียนใบหน้าไว้")

    best_match = None
    best_dist  = float("inf")
    THRESHOLD  = 0.5

    for student in students:
        stored_emb = np.frombuffer(student.face_embedding, dtype=np.float32)
        if stored_emb.shape != current_embedding.shape:
            continue
        is_match, dist = face_processor.compare_faces(current_embedding, stored_emb, threshold=THRESHOLD)
        if is_match and dist < best_dist:
            best_dist  = dist
            best_match = student

    if not best_match:
        raise HTTPException(status_code=404, detail="ไม่สามารถระบุตัวตนได้ กรุณาลองใหม่")

    already_checked = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.student_id == best_match.id,
            AttendanceLog.subject_id == subject_id,
            func.date(AttendanceLog.timestamp) == str(date.today()),
        )
        .first()
    )
    if already_checked:
        return {
            "status": "already_checked",
            "message": f"{best_match.first_name} เช็คชื่อวิชานี้ไปแล้ววันนี้",
            "student_id": best_match.student_id,
            "name": f"{best_match.first_name} {best_match.last_name}",
        }

    db.add(AttendanceLog(student_id=best_match.id, subject_id=subject_id, status="present"))
    db.commit()

    return {
        "status": "success",
        "message": "เช็คชื่อสำเร็จ",
        "student_id": best_match.student_id,
        "name": f"{best_match.first_name} {best_match.last_name}",
        "subject": subject.subject_name,
        "confidence": round(1 - best_dist, 3),
    }


@router.get("/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    # Teacher เห็นเฉพาะวิชาที่ตัวเองสอน, Admin เห็นทั้งหมด
    if current_user.role == "teacher":
        rows = (
            db.query(Subject)
            .join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
            .filter(TeacherSubject.teacher_id == current_user.id)
            .order_by(Subject.subject_code)
            .all()
        )
    else:
        rows = db.query(Subject).order_by(Subject.subject_code).all()

    return [{"id": s.id, "subject_code": s.subject_code, "subject_name": s.subject_name} for s in rows]


@router.post("/subjects", status_code=201)
def create_subject(
    subject_code: str = Query(...),
    subject_name: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(Subject).filter(Subject.subject_code == subject_code).first():
        raise HTTPException(status_code=409, detail="รหัสวิชานี้มีในระบบแล้ว")

    subject = Subject(subject_code=subject_code, subject_name=subject_name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "subject_code": subject.subject_code, "subject_name": subject.subject_name}


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    db.delete(subject)
    db.commit()