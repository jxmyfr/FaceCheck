import os

def create_structure():
    # รายการโฟลเดอร์ที่ต้องสร้าง
    folders = [
        "backend/app/api/endpoints",
        "backend/app/core",
        "backend/app/models",
        "backend/app/services",
        "backend/app/utils",
        "backend/models_ai",
        "frontend/src/components",
        "frontend/src/pages",
        "frontend/src/hooks",
        "frontend/src/styles",
        "storage/faces"
    ]

    # รายการไฟล์เริ่มต้นและเนื้อหาภายใน
    files = {
        "backend/app/api/router.py": "# Central API Router",
        "backend/app/core/config.py": "# App configuration and Env vars",
        "backend/app/core/security.py": "# JWT and hashing logic",
        "backend/app/models/database.py": "# SQLAlchemy Models (SQLite)",
        "backend/app/services/face_proc.py": "# AI Logic: Detection, Embedding, Liveness",
        "backend/app/services/attendance.py": "# Attendance business logic",
        "backend/main.py": "from fastapi import FastAPI\n\napp = FastAPI(title='FaceCheck API')\n\n@app.get('/')\ndef read_root():\n    return {'message': 'FaceCheck Backend is running'}",
        "backend/requirements.txt": "fastapi\nuvicorn\nsqlalchemy\nopencv-python\ninsightface\nnumpy\npython-multipart\npython-dotenv",
        "frontend/src/styles/index.css": '@import "tailwindcss";\n\n@theme {\n  --color-primary: oklch(0.6 0.2 250);\n}',
        "README.md": "# FaceCheck\n\nAI-Based Face Recognition Attendance System\n\n## Structure\n- `backend/`: FastAPI with InsightFace\n- `frontend/`: React with Tailwind CSS v4\n- `storage/`: SQLite DB and Image files",
        ".gitignore": (
            "# Python\nbackend/venv/\nbackend/__pycache__/\nbackend/.env\n\n"
            "# Node\nfrontend/node_modules/\nfrontend/dist/\n\n"
            "# Storage & AI\nstorage/database.db\nstorage/faces/*\n!storage/faces/.gitkeep\n"
            "backend/models_ai/*.onnx\nbackend/models_ai/*.pt"
        )
    }

    # สร้างโฟลเดอร์
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        if "storage" in folder or "models_ai" in folder:
            with open(os.path.join(folder, ".gitkeep"), "w") as f:
                pass

    # สร้างไฟล์
    for file_path, content in files.items():
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

    print("FaceCheck project structure created successfully!")

if __name__ == "__main__":
    create_structure()