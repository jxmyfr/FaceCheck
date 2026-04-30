import os
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models.database import engine, Base
from app.api.router import api_router

# สร้างตารางทั้งหมดอัตโนมัติ (ครั้งแรก)
Base.metadata.create_all(bind=engine)

_MIGRATIONS = [
    "ALTER TABLE students ADD COLUMN face_image BYTEA",
    "ALTER TABLE attendance_logs ADD COLUMN scan_image BYTEA",
    "ALTER TABLE students ADD COLUMN title TEXT",
    "ALTER TABLE subjects ADD COLUMN teacher_name TEXT",
    "ALTER TABLE subjects ADD COLUMN description TEXT",
    "ALTER TABLE subjects ADD COLUMN category TEXT",
    "ALTER TABLE semester_settings ADD COLUMN face_threshold REAL DEFAULT 1.0",
    "ALTER TABLE users ADD COLUMN categories TEXT",
    "ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE",
    "ALTER TABLE semester_settings ADD COLUMN min_det_score REAL DEFAULT 0.65",
    "ALTER TABLE semester_settings ADD COLUMN min_face_ratio REAL DEFAULT 0.08",
    "ALTER TABLE semester_settings ADD COLUMN min_blur_score REAL DEFAULT 40.0",
]

if os.getenv("DATABASE_URL"):
    # PostgreSQL migration
    from sqlalchemy import text as _text
    with engine.connect() as _conn:
        for _sql in _MIGRATIONS:
            try:
                _conn.execute(_text(_sql))
                _conn.commit()
            except Exception:
                _conn.rollback()
else:
    # SQLite migration
    import sqlite3
    from app.models.database import STORAGE_DIR
    _sqlite_migrations = [s.replace("BYTEA", "BLOB") for s in _MIGRATIONS]
    with sqlite3.connect(str(STORAGE_DIR / "database.db")) as _conn:
        for _sql in _sqlite_migrations:
            try:
                _conn.execute(_sql)
            except sqlite3.OperationalError:
                pass

app = FastAPI(title="FaceCheck API")

# 2. ตั้งค่า CORS (สำคัญมากเพื่อให้ React คุยกับ API ได้)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", os.getenv("FRONTEND_URL", "")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. เชื่อมต่อเส้นทาง API ทั้งหมด
app.include_router(api_router, prefix="/api/v1")

# 4. Serve face images as static files
FACES_DIR = Path(__file__).parent / "storage" / "faces"
FACES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/faces", StaticFiles(directory=str(FACES_DIR)), name="faces")

@app.get("/")
def health_check():
    return {"status": "online", "message": "FaceCheck Professional Backend is Ready"}

if __name__ == "__main__":
    # 4. สั่งรัน Server ที่ Port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)