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

## 2. โครงสร้างส่วนประกอบซอฟต์แวร์ (Component Diagram)

แสดงการแบ่งโมดูลภายในของทั้ง Frontend และ Backend

```mermaid
graph LR
    subgraph "Frontend Components"
        Pages[Pages: Dashboard, Scanner, Enrollment]
        Comps[Shared Components: Navbar, Sidebar]
        Hooks[Hooks: useAuth, useDialog]
        Axios[API Client: Axios]
    end

    subgraph "Backend Modules"
        Router[Router: attendance, enroll, stats, auth]
        Services[Services: FaceProcessor]
        Models[Models: Student, Subject, AttendanceLog]
        Security[Core: Security, Dependencies]
    end

    Pages --> Comps
    Pages --> Hooks
    Hooks --> Axios
    Axios -- HTTP --> Router
    Router --> Services
    Router --> Models
    Services --> Models
    Router --> Security
```

---

## 3. แผนผังผู้ใช้งาน (User Use Case Diagram)

แสดงบทบาทและสิทธิ์การเข้าถึงฟีเจอร์ต่างๆ ของผู้ใช้แต่ละกลุ่ม

```mermaid
graph LR
    %% Actors
    Admin((Admin))
    Teacher((Teacher))
    Student((Student))

    %% Use Cases
    subgraph "FaceCheck System"
        UC1[Manage Teachers & Users]
        UC2[System Settings - Thresholds]
        UC3[Manage Students & Subjects]
        UC4[Face Scanning - Attendance]
        UC5[Manual Attendance Adjustment]
        UC6[View Statistics & Reports]
        UC7[Export Data - Excel]
    end

    %% Relations
    Admin --- UC1
    Admin --- UC2
    Admin --- UC3
    
    Teacher --- UC3
    Teacher --- UC4
    Teacher --- UC5
    Teacher --- UC6
    Teacher --- UC7
    
    Student --- UC4
```

---

## 4. แผนผังความสัมพันธ์ข้อมูล (Entity Relationship Diagram - ERD)

แสดงโครงสร้างฐานข้อมูลและความเชื่อมโยงของข้อมูลในระบบ

```mermaid
erDiagram
    STUDENT ||--o{ ATTENDANCE_LOG : "has"
    STUDENT ||--o{ STUDENT_FACE_EMBEDDING : "has slots"
    SUBJECT ||--o{ ATTENDANCE_LOG : "records"
    SUBJECT ||--o{ SUBJECT_SCHEDULE : "has"
    USER ||--o{ TEACHER_SUBJECT : "teaches"
    SUBJECT ||--o{ TEACHER_SUBJECT : "assigned to"

    STUDENT {
        int id PK
        string student_id UK
        string first_name
        string last_name
        binary face_embedding "Primary Vector"
    }

    STUDENT_FACE_EMBEDDING {
        int id PK
        int student_id FK
        binary embedding "Slot Vector"
        string label
    }

    SUBJECT {
        int id PK
        string subject_code UK
        string subject_name
    }

    SUBJECT_SCHEDULE {
        int id PK
        int subject_id FK
        string day_of_week
        string time_start
        string time_end
    }

    ATTENDANCE_LOG {
        int id PK
        int student_id FK
        int subject_id FK
        datetime timestamp
        string status "present/late/absent"
        string check_method "face/manual"
    }

    USER {
        int id PK
        string username UK
        string email UK
        string role "admin/teacher"
    }
```

---

## 5. เส้นทางของข้อมูลในกระบวนการหลัก (Core Data Journeys)

### 📸 กระบวนการสแกนเช็คชื่อ (Attendance Scanning Flow)
1.  **[Input]**: Frontend Capture ภาพใบหน้าจากกล้องวิดีโอ
2.  **[AI Processing]**: 
    *   **Detection**: ค้นหาพิกัดใบหน้า
    *   **Liveness**: ตรวจสอบว่าเป็นคนจริง (Anti-spoofing)
    *   **Embedding**: แปลงใบหน้าเป็นชุดตัวเลข (Vector)
3.  **[Matching]**: ระบบนำ Vector ไปคำนวณระยะห่างกับ Vector ใน Database
4.  **[Business Logic]**: เช็คตารางสอนและเวลาเพื่อกำหนดสถานะ (มาเรียน / สาย)
5.  **[Output]**: บันทึกลงตาราง `AttendanceLog` และส่งผลลัพธ์กลับไปยัง UI

---

## 6. ความปลอดภัยของข้อมูล (Data Security)

*   **Identity Protection**: ระบบเก็บข้อมูลใบหน้าในรูปแบบ **Vector (Numerical Data)** ซึ่งยากต่อการย้อนกลับไปเป็นรูปภาพต้นฉบับได้
*   **Authentication**: การเข้าถึง API ถูกปกป้องด้วย **JWT Token** (JSON Web Token) เพื่อระบุตัวตนและสิทธิ์ของผู้ใช้งาน (Role-based Access Control)
