@echo off
cd /d %~dp0backend

REM Start FastAPI backend
start "FaceCheck Backend" cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start Cloudflare tunnel (แก้ URL ให้ตรงกับที่ตั้งค่าไว้ใน cloudflared)
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel run"

echo FaceCheck started. Press any key to exit...
pause
