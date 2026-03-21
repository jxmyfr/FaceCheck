from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.models.database import engine, Base

# สร้างตารางในฐานข้อมูล SQLite อัตโนมัติเมื่อรันระบบ 
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FaceCheck API - Professional Edition")

# ตั้งค่า CORS เพื่อให้ React (Port 5173) คุยกับ API (Port 8000) ได้ 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "FaceCheck API is online"}