from app.models.database import SessionLocal
from app.models.user import User

db = SessionLocal()
u = db.query(User).filter(User.email == 'admin@facecheck.kmutt').first()
u.is_active = True
db.commit()
print(f"แก้ไขสำเร็จ: {u.email} is_active={u.is_active}")
db.close()