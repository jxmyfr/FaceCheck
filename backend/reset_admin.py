import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.models.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

NEW_PASSWORD = "admin1234"

db = SessionLocal()
admin = db.query(User).filter(User.role == "admin").first()
if admin:
    admin.hashed_password = hash_password(NEW_PASSWORD)
    admin.is_active = True
    db.commit()
    print(f"✅ Reset สำเร็จ")
    print(f"   Email   : {admin.email}")
    print(f"   Password: {NEW_PASSWORD}")
else:
    print("❌ ไม่พบ admin")
db.close()
