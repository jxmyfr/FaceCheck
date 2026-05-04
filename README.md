# FaceCheck: AI-Based Face Recognition Attendance System

ระบบเช็คชื่อเข้าเรียนอัตโนมัติด้วยเทคโนโลยีการจดจำใบหน้า (Face Recognition) ที่มีความแม่นยำสูง พัฒนาขึ้นเพื่อช่วยลดขั้นตอนการทำงานและเพิ่มความถูกต้องในการบันทึกเวลา

---

## 💡 หลักการทำงานของระบบ (How it Works)

ระบบ FaceCheck ใช้กระบวนการประมวลผลภาพเชิงลึก (Deep Learning) เพื่อระบุตัวตนบุคคลผ่านขั้นตอนดังนี้:

### 1. การลงทะเบียนใบหน้า (Face Enrollment)
*   **การจับภาพ:** ระบบจะรับภาพใบหน้าจากผู้ใช้งาน
*   **การสกัดคุณลักษณะ (Feature Extraction):** ใช้โมเดล AI (InsightFace) ในการวิเคราะห์โครงสร้างใบหน้าและแปลงให้เป็นค่ารหัสทางคณิตศาสตร์ที่เรียกว่า **Face Embedding** (Vector ขนาดคงที่)
*   **การจัดเก็บ:** ระบบจะเก็บเฉพาะค่ารหัส Vector นี้ลงในฐานข้อมูล (Database) แทนการเปรียบเทียบจากไฟล์ภาพโดยตรง เพื่อความรวดเร็วและความเป็นส่วนตัว

### 2. การตรวจจับและสแกนใบหน้า (Detection & Scanning)
*   **Real-time Detection:** เมื่อนักศึกษามายืนหน้ากล้อง ระบบจะใช้ OpenCV และ InsightFace ในการตรวจจับตำแหน่งใบหน้า (Face Detection) จากวิดีโอแบบสดๆ
*   **On-the-fly Embedding:** ระบบจะทำการสกัดรหัส Vector จากใบหน้าที่สแกนได้ในขณะนั้นทันที

### 3. การเปรียบเทียบและระบุตัวตน (Face Matching)
*   **Cosine Similarity:** ระบบจะนำรหัส Vector จากกล้องไปเปรียบเทียบกับรหัส Vector ทั้งหมดที่มีอยู่ในฐานข้อมูล
*   **Thresholding:** 
    *   หากค่าความคล้ายคลึง (Similarity Score) สูงกว่าเกณฑ์ที่กำหนด ระบบจะระบุตัวตนบุคคลนั้นสำเร็จ
    *   หากค่าต่ำกว่าเกณฑ์ ระบบจะระบุว่าเป็น "บุคคลนิรนาม" (Unknown)

### 4. การบันทึกและแสดงผล (Logging & Dashboard)
*   **Auto-Checkin:** เมื่อระบุตัวตนสำเร็จ ระบบจะบันทึกเวลาเข้าเรียน (Timestamp) ลงฐานข้อมูลทันที
*   **Admin Reporting:** ผู้ดูแลระบบสามารถตรวจสอบประวัติการเข้าเรียนและสถิติต่างๆ ได้ผ่านหน้า Dashboard ในรูปแบบกราฟและตาราง

---

## 🚀 ฟีเจอร์เด่น (Key Features)
*   **High Accuracy:** ใช้โมเดล AI ระดับ State-of-the-art ในการจดจำใบหน้า
*   **Real-time Processing:** สแกนและระบุตัวตนได้อย่างรวดเร็ว
*   **Easy Enrollment:** ระบบเพิ่มข้อมูลนักศึกษาพร้อมรูปถ่ายที่ใช้งานง่าย
*   **Comprehensive Reports:** สรุปผลการเข้าเรียนรายวัน/รายวิชาได้ทันที
*   **Responsive UI:** ใช้งานได้ทั้งบนคอมพิวเตอร์และแท็บเล็ต

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

### Backend
*   **Framework:** FastAPI (Python)
*   **AI Library:** InsightFace, OpenCV, ONNX Runtime
*   **Database:** SQLite (SQLAlchemy ORM)

### Frontend
*   **Library:** React.js
*   **Build Tool:** Vite
*   **Styling:** CSS (Modern UI Design)

---

## 📂 โครงสร้างโปรเจค (Project Structure)
*   `backend/`: โค้ดส่วน Server และการประมวลผล AI
*   `frontend/`: โค้ดส่วนหน้าจอผู้ใช้งาน (Web Application)
*   `storage/`: ส่วนจัดเก็บฐานข้อมูลและรูปภาพใบหน้า

---

## 💻 การติดตั้งและใช้งาน (Installation)

### 1. ส่วนของ Backend
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Install dependencies
pip install -r requirements.txt
# Start Server
python main.py
```

### 2. ส่วนของ Frontend
```bash
cd frontend
npm install
npm run dev
```
