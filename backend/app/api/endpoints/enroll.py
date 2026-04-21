import cv2
import numpy as np
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.models.database import get_db, Student
from app.models.user import User
from app.services.face_proc import FaceProcessor
from app.core.dependencies import require_teacher_or_admin, require_admin

router = APIRouter()
face_processor = FaceProcessor()

FACES_DIR = Path(__file__).resolve().parents[3] / "storage" / "faces"
FACES_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_student(
    student_id:  str = Form(...),
    first_name:  str = Form(...),
    last_name:   str = Form(...),
    grade_level: str = Form(default=""),
    room_number: str = Form(default=""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    if db.query(Student).filter(Student.student_id == student_id).first():
        raise HTTPException(status_code=409, detail=f"รหัสนักเรียน {student_id} มีในระบบแล้ว")

    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์ภาพได้")

    try:
        embedding = face_processor.process_capture(frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if embedding is None:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในภาพ — กรุณาให้ใบหน้าอยู่กลางภาพและมองตรงเข้าหากล้อง")

    _, jpeg_buf = cv2.imencode('.jpg', frame)
    new_student = Student(
        student_id=student_id,
        first_name=first_name,
        last_name=last_name,
        grade_level=grade_level or None,
        room_number=room_number or None,
        face_embedding=embedding.tobytes(),
        face_image=jpeg_buf.tobytes(),
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    cv2.imwrite(str(FACES_DIR / f"{student_id}.jpg"), frame)

    return {"status": "success", "message": f"ลงทะเบียน {first_name} {last_name} สำเร็จ", "id": new_student.id}


@router.put("/update-face/{student_id}")
async def update_face(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสนักเรียนในระบบ")

    contents  = await file.read()
    nparr     = np.frombuffer(contents, np.uint8)
    frame     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์ภาพได้")

    try:
        embedding = face_processor.process_capture(frame)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if embedding is None:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในภาพ — กรุณาให้ใบหน้าอยู่กลางภาพและมองตรงเข้าหากล้อง")

    _, jpeg_buf = cv2.imencode('.jpg', frame)
    student.face_embedding = embedding.tobytes()
    student.face_image = jpeg_buf.tobytes()
    db.commit()
    cv2.imwrite(str(FACES_DIR / f"{student_id}.jpg"), frame)

    return {"status": "success", "message": f"อัปเดตใบหน้าของ {student.first_name} สำเร็จ"}


@router.get("/students")
def list_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    students = db.query(Student).order_by(Student.student_id).all()
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "grade_level": s.grade_level,
            "room_number": s.room_number,
            "has_face": len(s.face_embedding) > 0,
        }
        for s in students
    ]


@router.get("/students/{student_id}/face")
def get_student_face(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสนักเรียน")
    # ลองดึงจาก DB ก่อน (reliable ที่สุด)
    if student.face_image:
        return Response(content=student.face_image, media_type="image/jpeg")
    # fallback: อ่านจาก filesystem
    face_file = FACES_DIR / f"{student_id}.jpg"
    if face_file.is_file():
        return Response(content=face_file.read_bytes(), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="ไม่พบรูปใบหน้า — กรุณาอัปเดตใบหน้าใหม่")


@router.put("/students/{student_id}")
def update_student(
    student_id: str,
    first_name:  str = Form(...),
    last_name:   str = Form(...),
    grade_level: str = Form(default=""),
    room_number: str = Form(default=""),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสนักเรียน")
    student.first_name  = first_name
    student.last_name   = last_name
    student.grade_level = grade_level or None
    student.room_number = room_number or None
    db.commit()
    return {"status": "success", "message": f"อัปเดตข้อมูล {first_name} สำเร็จ"}


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบรหัสนักเรียน")

    db.delete(student)
    db.commit()

    face_file = FACES_DIR / f"{student_id}.jpg"
    if face_file.exists():
        face_file.unlink()