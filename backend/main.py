from fastapi import FastAPI
from app.models.database import engine, Base, init_db
from app.api.router import api_router

# คำสั่งสร้างไฟล์ database.db และตารางทั้งหมดตามที่ออกแบบไว้ [1, 7]
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FaceCheck System")

# รวม API Routes (Enroll, Scan, Stats)
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"status": "online", "message": "FaceCheck Backend is ready"}