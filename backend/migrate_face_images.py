"""รัน 1 ครั้งเพื่อ migrate รูปใบหน้าจาก filesystem เข้า database"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.models.database import SessionLocal, Student, STORAGE_DIR

FACES_DIR = STORAGE_DIR / "faces"
db = SessionLocal()

students = db.query(Student).filter(Student.face_image == None).all()
print(f"พบนักเรียน {len(students)} คน ที่ยังไม่มี face_image ใน DB")

updated = 0
for s in students:
    img_path = FACES_DIR / f"{s.student_id}.jpg"
    if img_path.is_file():
        s.face_image = img_path.read_bytes()
        updated += 1
        print(f"  ✓ {s.student_id} - {s.first_name} {s.last_name}")
    else:
        print(f"  ✗ {s.student_id} - ไม่พบไฟล์รูป")

db.commit()
db.close()
print(f"\nอัปเดตสำเร็จ {updated}/{len(students)} คน")
