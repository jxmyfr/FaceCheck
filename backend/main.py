import os

# Must be set before any import that pulls in insightface/albumentations
os.environ.setdefault("NO_ALBUMENTATIONS_UPDATE", "1")
os.environ.setdefault("ORT_LOGGING_LEVEL", "3")

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
    "ALTER TABLE attendance_logs ADD COLUMN face_distance REAL",
    "ALTER TABLE semester_settings ADD COLUMN academic_year VARCHAR(10)",
    "ALTER TABLE semester_settings ADD COLUMN semester_number INTEGER DEFAULT 1",
]

def _is_expected_migration_error(msg: str) -> bool:
    msg = msg.lower()
    return any(k in msg for k in (
        "already exists", "duplicate column", "duplicate key",
        "undefinedcolumn", "undefined column", "no such column",
        "does not exist", "column does not exist",
    ))

def _run_migrations():
    if os.getenv("DATABASE_URL"):
        from sqlalchemy import text as _text
        with engine.connect() as conn:
            for sql in _MIGRATIONS:
                try:
                    conn.execute(_text(sql))
                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    if not _is_expected_migration_error(str(e)):
                        logger.warning(f"[MIGRATION] {sql!r}: {e}")
    else:
        import sqlite3
        from app.models.database import STORAGE_DIR
        migrations = [s.replace("BYTEA", "BLOB") for s in _MIGRATIONS]
        with sqlite3.connect(str(STORAGE_DIR / "database.db")) as conn:
            for sql in migrations:
                try:
                    conn.execute(sql)
                except sqlite3.OperationalError as e:
                    if not _is_expected_migration_error(str(e)):
                        logger.warning(f"[MIGRATION] {sql!r}: {e}")

def _qr_cleanup_loop():
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
    # All DB work happens here — after uvicorn worker is fully up,
    # not at import time (avoids StatReload crash-loop on slow PG connections)
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    t = threading.Thread(target=_qr_cleanup_loop, daemon=True)
    t.start()
    logger.info("FaceCheck startup complete")
    yield

app = FastAPI(title="FaceCheck API", lifespan=lifespan)

_raw_origins = os.getenv("CORS_ORIGINS", "")
if _raw_origins.strip():
    _CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    _CORS_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def health_check():
    return {"status": "online", "message": "FaceCheck Professional Backend is Ready"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
