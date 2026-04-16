from pydantic_settings import BaseSettings
 
class Settings(BaseSettings):
    # --- Face Recognition Model ---
    face_model_name: str = "buffalo_l"       # ชื่อ model ของ insightface
    face_model_root: str = "models"          # โฟลเดอร์เก็บ model
    similarity_threshold: float = 0.5        # ค่า threshold การจับคู่ใบหน้า
 
    # --- Database ---
    db_url: str = "sqlite:///../storage/database.db"
 
    # --- API ---
    api_title: str = "FaceCheck API"
    api_prefix: str = "/api/v1"
 
    class Config:
        env_file = ".env"           # โหลดค่าจากไฟล์ .env ได้ (optional)
        env_file_encoding = "utf-8"
 
settings = Settings()