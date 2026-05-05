# FaceCheck — ระบบเช็คชื่อด้วยใบหน้า
## เอกสารสรุปการทำงานของระบบ

---

## 1. ภาพรวมระบบ

FaceCheck คือระบบบันทึกการเข้าเรียนอัตโนมัติสำหรับโรงเรียน รองรับการเช็คชื่อ 3 วิธี ได้แก่ **สแกนใบหน้า**, **สแกน QR Code**, และ **กรอกมือ** ระบบออกแบบมาเพื่อใช้งานบนเครื่องภายใน (on-premise) ไม่ต้องส่งข้อมูลชีวมิติออกนอกโรงเรียน

---

## 2. สถาปัตยกรรมระบบ (System Architecture)

```mermaid
graph TB
    subgraph Client["Frontend (React + Vite)"]
        UI[หน้าเว็บ]
        CAM[กล้องเว็บแคม react-webcam]
    end

    subgraph Server["Backend (FastAPI + Python)"]
        API["REST API :8000/api/v1"]
        FP["FaceProcessor - InsightFace buffalo_l"]
        AUTH["JWT Auth HS256"]
        DB[(SQLite / PostgreSQL)]
    end

    subgraph Store["Storage"]
        DBFILE["database.db - embedding vectors - attendance logs"]
        FACES["storage/faces - face images"]
    end

    UI -->|HTTP/JSON| API
    CAM -->|ภาพ JPEG base64| API
    API --> FP
    API --> AUTH
    API --> DB
    DB --> DBFILE
    FP --> FACES
```

### การไหลของข้อมูลหลัก

```
Browser ──HTTPS──► FastAPI ──► FaceProcessor (InsightFace)
                      │              │
                      ▼              ▼
                   SQLite       Face Embedding (512-D vector)
                      │
                      ▼
                React Dashboard ◄── Stats API ◄── SQLAlchemy ORM
```

---

## 3. เทคโนโลยีที่ใช้

### Backend

| เทคโนโลยี | เวอร์ชัน | ใช้ทำอะไร | ทำไมเลือก |
|-----------|---------|----------|-----------|
| **Python** | 3.10+ | ภาษาหลัก | ecosystem AI/ML ดีที่สุด |
| **FastAPI** | latest | REST API framework | async, auto docs (Swagger), validation ด้วย Pydantic |
| **InsightFace** | 0.7+ | Face detection + recognition | accuracy สูง, ฟรี, รัน CPU ได้ |
| **buffalo_l** | — | โมเดล AI ใบหน้า | balance ระหว่าง accuracy กับ speed |
| **OpenCV** | 4.x | ประมวลผลภาพ | blur detection, liveness check |
| **SQLite** | built-in | ฐานข้อมูล (local) | ไม่ต้องติดตั้งเพิ่ม, เพียงพอสำหรับ 1 โรงเรียน |
| **SQLAlchemy** | 2.x | ORM | type-safe, รองรับ SQLite และ PostgreSQL |
| **JWT (python-jose)** | — | Authentication | stateless, ปลอดภัย |
| **openpyxl** | — | สร้างไฟล์ Excel | export รายงาน |

### Frontend

| เทคโนโลยี | เวอร์ชัน | ใช้ทำอะไร | ทำไมเลือก |
|-----------|---------|----------|-----------|
| **React** | 18 | UI framework | component-based, state management ง่าย |
| **Vite** | 5 | Build tool | build เร็ว, HMR instant |
| **Tailwind CSS** | v4 | CSS utility | เขียน CSS เร็ว ไม่ต้องตั้งชื่อ class |
| **Recharts** | — | กราฟ/chart | declarative, React-native |
| **react-webcam** | — | เข้าถึงกล้อง | wrapper `getUserMedia` ง่าย |
| **axios** | — | HTTP client | interceptors, error handling ดี |
| **react-router-dom** | v6 | SPA routing | standard React routing |

---

## 4. โครงสร้างฐานข้อมูล (Database Schema)

```mermaid
erDiagram
    students {
        int id PK
        string student_id UK "รหัสนักเรียน"
        string title "คำนำหน้า"
        string first_name
        string last_name
        string grade_level "ม.1-ม.6"
        string room_number "ห้อง 1-15"
        bytes face_embedding "embedding รวม (legacy)"
        bytes face_image "รูปหน้า JPEG"
    }

    student_face_embeddings {
        int id PK
        int student_id FK
        bytes embedding "512-D float32 vector"
        bytes face_image
        string label "front/left/right/auto"
        datetime created_at
    }

    subjects {
        int id PK
        string subject_code UK
        string subject_name
        string teacher_name
        string category "กลุ่มสาระ"
    }

    subject_schedules {
        int id PK
        int subject_id FK
        string day_of_week "จ/อ/พ/พฤ/ศ/ส/อา"
        string time_start "HH:MM"
        string time_end "HH:MM"
        string grade_level
        string room_number
    }

    attendance_logs {
        int id PK
        int student_id FK
        int subject_id FK
        datetime timestamp
        string status "present/late/absent/excused/already_checked"
        string reason "เหตุผลการลา"
        string check_method "face/qr/manual"
        bytes scan_image "ภาพตอนสแกน"
    }

    attendance_audit_logs {
        int id PK
        int log_id
        string action "status_change/delete/create"
        string changed_by_name
        string old_status
        string new_status
        datetime timestamp
    }

    qr_sessions_used {
        string jti PK "JWT ID ที่ใช้แล้ว"
        datetime used_at
    }

    semester_settings {
        int id PK
        string name "ชื่อภาคเรียน"
        date term_start
        date term_end
        float face_threshold "ความเข้มงวด recognition"
        float min_det_score "confidence ขั้นต่ำ"
        float min_face_ratio "ขนาดหน้าขั้นต่ำ"
        float min_blur_score "ความชัดขั้นต่ำ"
    }

    students ||--o{ student_face_embeddings : "มีหลาย embedding"
    students ||--o{ attendance_logs : "มีหลาย log"
    subjects ||--o{ attendance_logs : "มีหลาย log"
    subjects ||--o{ subject_schedules : "มีหลาย คาบ"
```

---

## 5. กระบวนการทำงานหลัก (Data Flow)

### 5.1 ลงทะเบียนใบหน้า (Face Enrollment)

```mermaid
sequenceDiagram
    actor ครู
    participant FE as Frontend
    participant BE as FastAPI
    participant FP as FaceProcessor
    participant DB as SQLite

    ครู->>FE: กรอกข้อมูลนักเรียน<br/>(รหัส/ชื่อ/ชั้น/ห้อง)
    ครู->>FE: ถ่ายรูป 3 มุม (มุมตรง, หันซ้าย, หันขวา)
    FE->>BE: POST /enroll/check-angle?expected=front
    BE->>FP: วิเคราะห์ yaw angle จาก pose[1]
    FP-->>BE: valid/invalid + yaw value
    BE-->>FE: ผลตรวจมุม

    note over FE: ทำซ้ำทั้ง 3 มุม

    FE->>BE: POST /enroll/update-face-multi<br/>(3 รูป + ข้อมูลนักเรียน)
    loop ทุกรูป
        BE->>FP: process_capture(frame)
        FP->>FP: 1. Detection (confidence ≥ 0.65)
        FP->>FP: 2. Size check (face ≥ 8% of image)
        FP->>FP: 3. Blur check (Laplacian variance ≥ 40)
        FP->>FP: 4. Eye symmetry check
        FP->>FP: 5. Liveness check (LBP + FFT)
        FP-->>BE: 512-D embedding vector
    end
    BE->>DB: บันทึก student + 3 embeddings
    DB-->>BE: success
    BE-->>FE: ลงทะเบียนสำเร็จ
```

### 5.2 สแกนใบหน้าเช็คชื่อ (Face Attendance Scan)

```mermaid
sequenceDiagram
    actor นักเรียน
    participant FE as Frontend (Scanner)
    participant BE as FastAPI
    participant FP as FaceProcessor
    participant DB as SQLite

    นักเรียน->>FE: ยืนหน้ากล้อง
    FE->>FE: ถ่ายภาพทุก 2 วิ (loop)
    FE->>BE: POST /attendance/scan<br/>(ภาพ JPEG + subject_id)

    BE->>FP: process_capture(frame)
    FP->>FP: Quality + Liveness checks
    FP-->>BE: embedding vector (512-D)

    BE->>DB: โหลด embeddings ของนักเรียนทุกคน
    DB-->>BE: embeddings list

    loop เปรียบเทียบทุกนักเรียน
        BE->>BE: Euclidean distance<br/>(source - target embedding)
        note over BE: distance ≤ threshold → match
    end

    alt พบนักเรียน
        BE->>DB: ตรวจสอบ already_checked<br/>(สแกนซ้ำวันเดียวกัน?)
        DB-->>BE: ผลตรวจ
        BE->>DB: บันทึก AttendanceLog<br/>(present/already_checked)
        BE->>DB: Auto-learn: เพิ่ม embedding ใหม่<br/>(ถ้า < 50 slots และยังไม่ได้เรียนรู้วันนี้)
        BE-->>FE: ✅ ชื่อนักเรียน + สถานะ + confidence
    else ไม่พบนักเรียน
        BE-->>FE: ❌ ไม่พบใบหน้าในระบบ
    end
```

### 5.3 เช็คชื่อด้วย QR Code

```mermaid
sequenceDiagram
    actor ครู
    actor นักเรียน
    participant FE as Frontend
    participant BE as FastAPI
    participant DB as SQLite

    ครู->>FE: กด "สร้าง QR"
    FE->>BE: POST /attendance/qr-session<br/>(subject_id + expires_in)
    BE->>BE: สร้าง JWT token<br/>(payload: subject_id, exp, jti=uuid)
    BE-->>FE: QR token
    FE->>FE: แสดง QR Code บนหน้าจอ

    นักเรียน->>FE: สแกน QR ด้วยมือถือ → เปิด URL
    FE->>BE: POST /attendance/qr-checkin<br/>(token + student_id)
    BE->>BE: verify JWT signature + expiry
    BE->>DB: ตรวจสอบ jti ใน qr_sessions_used<br/>(ป้องกัน buddy-punching)
    DB-->>BE: ยังไม่เคยใช้?

    alt QR ใช้ได้ + ยังไม่หมดอายุ
        BE->>DB: บันทึก jti ลง qr_sessions_used
        BE->>DB: บันทึก AttendanceLog (check_method=qr)
        BE-->>FE: ✅ เช็คชื่อสำเร็จ
    else QR หมดอายุ / ใช้ไปแล้ว
        BE-->>FE: ❌ QR ไม่ valid
    end
```

### 5.4 ดูผลและ Dashboard

```mermaid
sequenceDiagram
    actor ครู/ผู้ดูแล
    participant FE as Dashboard
    participant BE as Stats API
    participant DB as SQLite

    ครู/ผู้ดูแล->>FE: เปิด Dashboard
    FE->>BE: GET /stats/overview
    BE->>DB: query: นักเรียนทั้งหมด, วิชา, log วันนี้
    DB-->>BE: ข้อมูล aggregate
    BE-->>FE: KPI cards (% มาเรียน, จำนวน, trend)

    FE->>BE: GET /stats/daily?days=30
    BE->>DB: GROUP BY date → นับ present/absent
    DB-->>BE: time series data
    BE-->>FE: Area chart data

    ครู/ผู้ดูแล->>FE: drill-down → ม.ต้น → ม.5 → ห้อง 1
    FE->>BE: GET /stats/by-grade?grade_level=ม.5&room=1
    BE->>DB: query filtered by grade + room
    DB-->>BE: per-student stats
    BE-->>FE: ตารางนักเรียน + attendance rate
```

---

## 6. อัลกอริทึมสำคัญ

### 6.1 Face Recognition Pipeline

ทุกครั้งที่รับภาพ ระบบทำตามขั้นตอนนี้:

```
ภาพ JPEG
    │
    ▼
[1] InsightFace Detection
    • ตรวจหาใบหน้าในภาพ (SCRFD detector)
    • เลือกใบหน้าใหญ่ที่สุด (กรณีหลายคน)
    │
    ▼
[2] Quality Check (ป้องกันภาพไม่ดี)
    • det_score ≥ 0.65      → confidence ของ AI
    • face area ≥ 8%        → ไม่ใกล้เกินไป
    • ไม่ชิดขอบภาพ (margin 3%)
    • ตาสองข้างสมมาตร (eye_y_diff/eye_dist ≤ 25%)
    • blur score ≥ 40       → Laplacian variance
    │
    ▼
[3] Liveness Check (ป้องกันใช้รูปภาพโกง)
    • LBP variance: ผิวจริงมี micro-texture ซับซ้อน
    • FFT analysis: หน้าจอสร้าง periodic frequency
    • บล็อกเมื่อ: LBP var < 40 AND FFT peak ratio > 20
    │
    ▼
[4] ArcFace Embedding
    • สร้าง vector 512 มิติ (float32)
    • normalize แล้ว (normed_embedding)
    │
    ▼
[5] Matching (ตอนสแกน)
    • Euclidean distance กับทุก embedding ในระบบ
    • distance = ||embedding_A - embedding_B||₂
    • ผ่านถ้า distance ≤ threshold (default 1.0)
    • เลือกผลที่ distance น้อยที่สุด
```

### 6.2 Multi-Angle Enrollment

ลงทะเบียน 3 มุมเพื่อเพิ่มความแม่นยำตอนสแกน:

| มุม | Yaw angle | ประโยชน์ |
|-----|-----------|---------|
| มุมตรง (front) | \|yaw\| ≤ 15° | baseline |
| หันซ้าย (left) | -50° ≤ yaw ≤ -15° | รู้จักเมื่อยืนเอียง |
| หันขวา (right) | 15° ≤ yaw ≤ 50° | รู้จักเมื่อยืนเอียง |

### 6.3 Auto-Learn

เมื่อสแกนสำเร็จ ระบบ **เรียนรู้ใบหน้าใหม่อัตโนมัติ** เพื่อรับมือกับการเปลี่ยนแปลง (ผมยาวขึ้น, แว่นตา, แสง):
- เพิ่ม embedding ใหม่เข้า `student_face_embeddings` (สูงสุด 50 slots)
- เรียนรู้ได้ **1 ครั้งต่อวันต่อนักเรียน** เท่านั้น
- ทำให้ระบบแม่นยำขึ้นเมื่อใช้งานนานขึ้น

### 6.4 QR Anti-Buddy-Punching

ป้องกันนักเรียนใช้ QR แทนกัน:
1. QR token = JWT มี `jti` (JWT ID = UUID unique)
2. เมื่อใช้ครั้งแรก → บันทึก `jti` ลง `qr_sessions_used`
3. ครั้งต่อไปใช้ QR เดิม → ตรวจพบ jti ซ้ำ → ปฏิเสธ
4. 1 QR = ใช้ได้ 1 ครั้งเท่านั้น

---

## 7. API Endpoints สรุป

| กลุ่ม | Endpoint | Method | ทำอะไร |
|-------|----------|--------|--------|
| **Auth** | `/auth/login` | POST | login รับ JWT |
| | `/auth/register` | POST | สร้าง user ใหม่ (admin) |
| | `/auth/users` | GET | ดูรายชื่อ users |
| | `/auth/me/subjects` | GET | วิชาที่ครูสอน |
| **Enrollment** | `/enroll/students` | GET/POST | จัดการนักเรียน |
| | `/enroll/students/import` | POST | import Excel |
| | `/enroll/update-face-multi` | POST | ลงทะเบียนหน้า 3 มุม |
| | `/enroll/check-angle` | POST | ตรวจมุมหน้า real-time |
| | `/enroll/students/export` | GET | export Excel |
| **Attendance** | `/attendance/scan` | POST | สแกนใบหน้าเช็คชื่อ |
| | `/attendance/qr-session` | POST | สร้าง QR token |
| | `/attendance/qr-checkin` | POST | เช็คชื่อด้วย QR |
| | `/attendance/logs` | GET | ดู log ตามวัน/วิชา |
| | `/attendance/logs/{id}` | PATCH/DELETE | แก้ไข/ลบ log |
| | `/attendance/subjects` | GET/POST | จัดการวิชา |
| **Stats** | `/stats/overview` | GET | KPI ภาพรวมโรงเรียน |
| | `/stats/daily` | GET | ข้อมูล time series 30 วัน |
| | `/stats/by-grade` | GET | สถิติแยกตามชั้น/ห้อง |
| | `/stats/subject-attendance` | GET | gradebook ต่อวิชา |
| | `/stats/student/{id}` | GET | ข้อมูลนักเรียนรายบุคคล |
| **Reports** | `/reports/export` | GET | export Excel รายงาน |
| **Settings** | `/settings/semester` | GET/PUT | ตั้งค่าภาคเรียน + threshold |
| **Audit** | `/audit/logs` | GET | ประวัติการแก้ไขข้อมูล |

---

## 8. ความปลอดภัย (Security)

| จุด | กลไก | รายละเอียด |
|-----|------|-----------|
| **Authentication** | JWT HS256 | token มีอายุ, เก็บใน localStorage |
| **Authorization** | Role-based | `admin` และ `teacher` มีสิทธิ์ต่างกัน |
| **Data Scope** | Backend + Frontend filter | `teacher` เห็นเฉพาะนักเรียนในห้องที่ตัวเองสอน (API list) และประวัติสแกนเฉพาะวิชาตัวเอง (frontend filter) — `admin` เห็นทุกข้อมูล พร้อม subject_code/subject_name/teacher_name |
| **Scan Room Lock** | Backend enforce | scan endpoint ตรวจ grade/room ของนักเรียนที่จำได้ vs ตารางสอนของวิชา — ปฏิเสธถ้าไม่ตรง แม้ไม่มี schedule_id (no period lock) |
| **QR โกง** | JTI tracking | 1 QR token ใช้ได้ 1 ครั้ง |
| **รูปภาพโกง** | Liveness check | LBP texture + FFT analysis ตรวจหน้าจอ/พิมพ์ |
| **ภาพคุณภาพต่ำ** | Quality gate | ปฏิเสธภาพเบลอ/ไกล/เอียงก่อน recognition |
| **SECRET_KEY** | Environment var | โหลดจาก `.env` พร้อม warning ถ้าใช้ default |
| **Audit Trail** | Audit log table | บันทึกทุกการแก้ไข status พร้อม ผู้แก้ไข+เวลา |

---

## 9. ฟีเจอร์ทั้งหมดของระบบ

### สำหรับผู้ดูแลระบบ (Admin)

- จัดการบัญชีครูและผู้ดูแล (เพิ่ม/ระงับ/ลบ)
- จัดการรายวิชา + ตารางสอน (วัน/คาบ/ห้อง)
- มอบหมายวิชาให้ครู
- ตั้งค่าภาคเรียน (วันเริ่ม-สิ้นสุด, ค่า threshold การจดจำหน้า)
- ดู Audit Log การเปลี่ยนแปลงข้อมูล

### สำหรับครู

- **Scanner**: สแกนใบหน้าเช็คชื่อ real-time, สร้าง QR, กรอกมือ
- **รายชื่อนักเรียน**: ค้นหา, กรองชั้น/ห้อง/มีใบหน้า, export Excel
- **Dashboard**: KPI การเข้าเรียน, กราฟ trend 30 วัน (นับนักเรียนไม่ซ้ำ เฉพาะ present/late), drill-down ม.ต้น/ม.ปลาย→ชั้น→ห้อง→รายบุคคล — อัตราเข้าเรียนนับ distinct students ไม่เกิน 100%
- **รายงาน**: ค้นหาตามวันที่/วิชา/ชั้น/ห้อง, export Excel 2 sheet, พิมพ์, Gradebook view
- **แก้ไขสถานะ**: เปลี่ยน present/late/absent/excused พร้อมบันทึกเหตุผล

### สำหรับแอดมิน (ลงทะเบียน)

- **Enrollment**: ลงทะเบียนเดี่ยว (3 มุม) หรือ import Excel จำนวนมาก
- Real-time angle validation ขณะถ่ายรูป
- ล็อกกล้องจนกว่าจะกรอกข้อมูลครบ

---

## 10. การรันระบบ

```
โครงสร้าง:
facecheck/
├── backend/          FastAPI + InsightFace
│   ├── main.py       entry point, :8000
│   ├── .env          SECRET_KEY, DATABASE_URL
│   └── storage/      database.db, faces/
└── frontend/         React + Vite
    └── .env          VITE_API_URL=http://localhost:8000/api/v1
```

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py          # → http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:5173

# Swagger UI (API docs อัตโนมัติ)
http://localhost:8000/docs
```

---

## 11. ข้อจำกัดและแนวทางพัฒนาต่อ

| ข้อจำกัด | สาเหตุ | แนวทาง |
|---------|--------|--------|
| SQLite concurrent writes | single-file DB | เปลี่ยนเป็น PostgreSQL ถ้า scale |
| รัน CPU เท่านั้น | ไม่ใช้ GPU | เพิ่ม CUDA provider ถ้ามี GPU |
| ไม่มี push notification | ยังไม่ implement | เพิ่ม Line Notify / WebSocket |
| ไม่มี student portal | ยังไม่ implement | เพิ่ม role `student` |
