# 🏗️ FaceCheck: System Architecture & Data Flow

เอกสารฉบับนี้อธิบายโครงสร้างการทำงานและเส้นทางการรับ-ส่งข้อมูล (Data Flow) ของระบบ FaceCheck ตั้งแต่ต้นจนจบ เพื่อให้เข้าใจความเชื่อมโยงของแต่ละส่วนประกอบ (Nodes)

---

## 1. แผนภาพภาพรวมระบบ (Overall System Architecture)

ระบบแบ่งออกเป็น 3 ส่วนหลักที่ทำงานประสานกันผ่านโปรโตคอล HTTP (REST API)

```mermaid
graph TD
    subgraph "Frontend Layer (React + Vite)"
        UI[Web Interface]
        Cam[Camera Control]
    end

    subgraph "Logic Layer (FastAPI Backend)"
        API[API Gateway / Endpoints]
        FP[FaceProcessor Service]
        AI[InsightFace AI Models]
    end

    subgraph "Data Layer (Storage)"
        DB[(SQLite Database)]
        FS[File System / storage/faces]
    end

    %% Interactions
    Cam -->|1. Image Frame| API
    UI -->|2. Form Data| API
    API -->|3. Raw Image| FP
    FP -->|4. Request Analysis| AI
    AI -->|5. 512-dim Vector| FP
    FP -->|6. Result / Vector| API
    
    API -->|7. SQL Query / Save| DB
    API -->|8. Save Photo| FS
    
    DB -->|9. Identification Result| API
    API -->|10. Success/Status Response| UI
```

---

## 2. เส้นทางของข้อมูลในกระบวนการหลัก (Core Data Journeys)

### 📸 กระบวนการสแกนเช็คชื่อ (Attendance Scanning Flow)
เมื่อนักศึกษามายืนหน้ากล้อง ข้อมูลจะเดินทางดังนี้:

1.  **[Input Node]**: Frontend Capture ภาพใบหน้าจากกล้องวิดีโอ
2.  **[Transmission Node]**: ส่งภาพผ่าน HTTP POST ไปยัง `/attendance/scan`
3.  **[AI Processing Node]**: 
    *   **Detection**: ค้นหาพิกัดใบหน้า
    *   **Liveness**: ตรวจสอบว่าเป็นคนจริง (ไม่ใช่รูปถ่าย/หน้าจอ)
    *   **Embedding**: แปลงใบหน้าเป็นชุดตัวเลข (Vector)
4.  **[Matching Node]**: ระบบนำ Vector จากกล้องไปคำนวณระยะห่าง (Euclidean Distance) กับ Vector ทั้งหมดใน Database
5.  **[Business Logic Node]**: เมื่อพบเจ้าของใบหน้า ระบบเช็คตารางสอนและเวลาปัจจุบันเพื่อกำหนดสถานะ (มาเรียน / สาย)
6.  **[Output Node]**: บันทึกลงตาราง `AttendanceLog` และส่งชื่อนักศึกษากลับไปแสดงผลที่หน้าจอ

---

### 📝 กระบวนการลงทะเบียนนักศึกษาใหม่ (Student Enrollment Flow)
ขั้นตอนการสร้าง "ตัวตน" ให้กับนักศึกษาในระบบ:

1.  **Admin Input**: กรอกประวัติและอัปโหลดรูปถ่ายหน้าตรง
2.  **Processing**: AI สกัดเอา "ลักษณะเด่น" ของใบหน้าออกมาเป็น Vector
3.  **Storage**: 
    *   เก็บ **ข้อมูลประวัติ + Vector** ไว้ในฐานข้อมูล (เพื่อใช้ค้นหา)
    *   เก็บ **รูปภาพต้นฉบับ** ไว้ในระบบไฟล์ (เพื่อใช้ยืนยันด้วยตาเปล่า)

---

## 3. รายละเอียดหน้าที่ของแต่ละ Node (Node Responsibilities)

| Node | หน้าที่หลัก | เทคโนโลยีที่ใช้ |
| :--- | :--- | :--- |
| **Frontend UI** | แสดงผลหน้าจอ, รับอินพุตจากผู้ใช้, จัดการกล้อง | React, Vite |
| **API Endpoint** | รับคำขอจากหน้าเว็บ, ตรวจสอบสิทธิ์ (Auth), สั่งการ Logic | FastAPI, SQLAlchemy |
| **FaceProcessor** | ควบคุมลำดับการทำงานของ AI (Detect -> Check -> Embed) | Python, OpenCV |
| **AI Models** | วิเคราะห์ภาพใบหน้าและแปลงเป็นรหัสคณิตศาสตร์ | InsightFace, ONNX Runtime |
| **Database** | เก็บข้อมูล Metadata, ตารางเวลา และ Face Vectors | SQLite |
| **FileSystem** | จัดเก็บไฟล์รูปภาพ JPG เพื่อใช้เป็นหลักฐาน | Local Storage |

---

## 4. ความปลอดภัยของข้อมูล (Data Security)

*   **Identity Protection**: ระบบไม่ได้เก็บ "รหัสผ่านใบหน้า" ในรูปแบบรูปภาพอย่างเดียว แต่เก็บเป็น **Vector (Numerical Data)** ซึ่งยากต่อการย้อนกลับไปเป็นรูปภาพต้นฉบับได้โดยตรง
*   **Authentication**: การส่งข้อมูลระหว่าง Frontend และ Backend ถูกปกป้องด้วย **JWT Token** เพื่อให้มั่นใจว่าเฉพาะผู้ที่มีสิทธิ์เท่านั้นที่สามารถเข้าถึงข้อมูลหรือจัดการระบบได้
