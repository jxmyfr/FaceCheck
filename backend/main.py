import os
import logging
import threading
import time
import uvicorn
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import engine, Base, get_db, QRSessionUsed
from app.api.router import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("facecheck")

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
    "ALTER TABLE attendance_logs ADD COLUMN reason VARCHAR(200)",
    "ALTER TABLE students DROP COLUMN face_embedding",
    "ALTER TABLE subjects ADD COLUMN is_archived BOOLEAN DEFAULT FALSE",
    "ALTER TABLE attendance_logs ADD COLUMN scan_image_path VARCHAR(255)",
]

def _is_expected_migration_error(msg: str) -> bool:
    msg = msg.lower()
    return any(k in msg for k in ("already exists", "duplicate column", "duplicate key"))

if os.getenv("DATABASE_URL"):
    # PostgreSQL migration
    from sqlalchemy import text as _text
    with engine.connect() as _conn:
        for _sql in _MIGRATIONS:
            try:
                _conn.execute(_text(_sql))
                _conn.commit()
            except Exception as _e:
                _conn.rollback()
                if not _is_expected_migration_error(str(_e)):
                    print(f"[MIGRATION WARNING] {_sql!r}: {_e}")
else:
    # SQLite migration
    import sqlite3
    from app.models.database import STORAGE_DIR
    _sqlite_migrations = [s.replace("BYTEA", "BLOB") for s in _MIGRATIONS]
    with sqlite3.connect(str(STORAGE_DIR / "database.db")) as _conn:
        for _sql in _sqlite_migrations:
            try:
                _conn.execute(_sql)
            except sqlite3.OperationalError as _e:
                if not _is_expected_migration_error(str(_e)):
                    print(f"[MIGRATION WARNING] {_sql!r}: {_e}")

def _qr_cleanup_loop():
    """Delete QRSessionUsed rows older than 24 hours every 6 hours."""
    while True:
        try:
            db = next(get_db())
            cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
            deleted = db.query(QRSessionUsed).filter(QRSessionUsed.used_at < cutoff).delete()
            db.commit()
            db.close()
            if deleted:
                logger.info(f"QR cleanup: removed {deleted} expired token(s)")
        except Exception as e:
            logger.warning(f"QR cleanup error: {e}")
        time.sleep(6 * 3600)

@asynccontextmanager
async def lifespan(app: FastAPI):
    t = threading.Thread(target=_qr_cleanup_loop, daemon=True)
    t.start()
    yield

app = FastAPI(title="FaceCheck API", lifespan=lifespan)

# 2. CORS — restrict to configured origins (env: CORS_ORIGINS comma-separated)
_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
_CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. เชื่อมต่อเส้นทาง API ทั้งหมด
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "online", "message": "FaceCheck Professional Backend is Ready"}

if __name__ == "__main__":
    # 4. สั่งรัน Server ที่ Port 8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)