"""
รันครั้งเดียวเพื่อสร้างบัญชี Admin เริ่มต้น
  python seed_admin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.models.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if db.query(User).filter(User.role == "admin").first():
    print("✅ มี Admin อยู่แล้ว ไม่ต้องสร้างใหม่")
else:
    admin = User(
        email="admin@test.com",
        hashed_password=hash_password("admin"),
        full_name="ผู้ดูแลระบบ",
        role="admin",
    )
    db.add(admin)
    db.commit()
    print("✅ สร้าง Admin สำเร็จ")
    print("   Email   : admin@test.com")
    print("   Password: admin")
    print("   ⚠️  กรุณาเปลี่ยนรหัสผ่านหลัง login ครั้งแรก")

db.close()