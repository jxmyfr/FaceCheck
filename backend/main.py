import sqlite3
import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models.database import engine, Base, STORAGE_DIR
from app.api.router import api_router

# 1. สั่งสร้างตารางในไฟล์.db อัตโนมัติ (ครั้งแรก)
Base.metadata.create_all(bind=engine)

# 1b. เพิ่ม column face_image ถ้ายังไม่มี (migration อัตโนมัติ)
with sqlite3.connect(str(STORAGE_DIR / "database.db")) as _conn:
    try:
        _conn.execute("ALTER TABLE students ADD COLUMN face_image BLOB")
    except sqlite3.OperationalError:
        pass  # column มีแล้ว

app = FastAPI(title="FaceCheck API")

# 2. ตั้งค่า CORS (สำคัญมากเพื่อให้ React คุยกับ API ได้)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Port มาตรฐานของ Vite
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