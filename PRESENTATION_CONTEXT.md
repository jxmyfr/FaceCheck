# FaceCheck — Presentation Context
## ไฟล์นี้สำหรับออกแบบสไลด์นำเสนอโปรแกรม

---

## ธีมสไลด์ — Academic + Subtle Gradient

### ทิศทาง
White-based, สะอาด, academic — มี gradient **เฉพาะ accent elements** ไม่ใช่ทั้ง slide
อ้างอิง: Linear.app, Notion doc export, IEEE 2024 modernized

---

### Color Palette

| ใช้ทำอะไร | สี | Hex |
|-----------|-----|-----|
| Slide background | Off-white | `#F9FAFB` |
| Heading text | Near-black | `#111827` |
| Body text | Dark gray | `#374151` |
| Caption / sub | Medium gray | `#6B7280` |
| Border / divider | Light gray | `#E5E7EB` |
| Card background | White | `#FFFFFF` |
| **Accent gradient start** | Indigo | `#4F46E5` |
| **Accent gradient end** | Violet | `#7C3AED` |
| Present / Success | Emerald | `#059669` |
| Late / Warning | Amber | `#D97706` |
| Absent / Error | Red | `#DC2626` |
| QR / Info | Blue | `#2563EB` |

**Gradient formula:** `linear-gradient(135deg, #4F46E5, #7C3AED)`
ใช้กับ: badge ตัวเลข, heading underline, cover accent shape, icon highlight

---

### ใช้ Gradient ที่ไหน / ไม่ใช้ที่ไหน

| ✅ ใช้ได้ | ❌ ไม่ใช้ |
|---------|---------|
| Badge ตัวเลข section (01, 02…) | พื้นหลัง slide ทั้งหมด |
| ตัวเลขสถิติใหญ่ (512D, 99%…) | ข้อความ body |
| Left-bar บาง 4px หน้า heading | Card background |
| Cover — shape มุมบนขวา opacity 15% | Glassmorphism blur |
| Divider line (gradient stroke) | ทุก element พร้อมกัน |

---

### Cards
- Background: `#FFFFFF`
- Border: `1px solid #E5E7EB`
- Shadow: `0 1px 4px rgba(0,0,0,0.08)`
- Radius: `12px`
- ไม่มี blur / frosted glass

---

### Typography

**Pairing หลัก (แนะนำ):**
- Heading: **Kanit Bold** — geometric, strong, academic ชัดเจน
- Body: **IBM Plex Sans Thai Regular** — technical, อ่านง่าย, clean

**Pairing สำรอง (friendly กว่า):**
- Heading: **Prompt SemiBold**
- Body: **Anuphan Regular**

**Code / ตัวเลข / label:**
- **JetBrains Mono** — ใช้กับ API path, embedding dim, threshold values

**ขนาด:**
| ระดับ | ขนาด |
|-------|------|
| Slide title | 36–40pt |
| Section heading | 28–32pt |
| Body text | 18–20pt |
| Caption / label | 13–14pt |
| Code / mono | 14–16pt |

> **ไม่ใช้:** THSarabun, Sarabun, Cordia, AngsanaNew, TH Niramit

---

### Layout Template

```
┌──────────────────────────────────────────────┐
│▌ หัวข้อ slide (Kanit Bold 36pt)              │  ← ▌ = gradient bar 4px
│                                              │
│  • bullet 1          ┌──────────────────┐   │
│  • bullet 2          │   ภาพ / diagram  │   │  ← 40% text / 60% visual
│  • bullet 3          │                  │   │
│                      └──────────────────┘   │
│ ─────────────────────────── 07 / 19 ──────  │  ← footer: gradient line + page
└──────────────────────────────────────────────┘
```

- ข้อความซ้าย ≤ 40% ของพื้นที่
- ภาพ/ไดอะแกรมขวา ≥ 60%
- หัวข้อ ≤ 6 คำ
- Bullet ≤ 3 จุด, แต่ละจุด ≤ 10 คำ
- ใช้ icon แทนคำอธิบายเสมอถ้าทำได้

---

### Cover Slide Layout
```
┌──────────────────────────────────────────────┐
│                         ╱▓▓▓▓▓▓▓▓▓▓▓        │  ← gradient shape มุมขวาบน
│                        ╱  (opacity 15%)      │    สี #4F46E5→#7C3AED
│                                              │
│  FaceCheck                                   │
│  ─────────────────────                       │  ← gradient underline
│  ระบบเช็คชื่อด้วยใบหน้าอัตโนมัติ            │
│  สำหรับโรงเรียน                              │
│                                              │
│  [โลโก้โรงเรียน]  ชื่อ — ชั้น — ปี          │  ← footer bar สีเทาอ่อน
└──────────────────────────────────────────────┘
```

---

## โครงสร้างสไลด์ (เรียงตามลำดับนำเสนอ)

---

### SLIDE 1 — Cover / Title
**หัวข้อ:** FaceCheck
**Sub:** ระบบเช็คชื่อด้วยใบหน้าอัตโนมัติสำหรับโรงเรียน
**ภาพแนะนำ:** ภาพกล้องวงกลม + face mesh overlay บน dark bg, หรือ mockup หน้า Scanner จริงจากระบบ
**ข้อมูล:** ชื่อผู้จัดทำ, โรงเรียน, ปีการศึกษา

---

### SLIDE 2 — ปัญหาที่พบ (Problem)
**หัวข้อ:** ปัญหาการเช็คชื่อแบบเดิม

**3 ประเด็นหลัก (แต่ละประเด็น = 1 icon + 1 บรรทัด):**
- เสียเวลา → เรียกชื่อทีละคน ชั้นละ 5-10 นาที
- ไม่แม่นยำ → ลืมกรอก, ลืมเซ็น, ข้อมูลหาย
- โกงได้ง่าย → เพื่อนเซ็นแทน / QR ส่งให้กัน

**ภาพแนะนำ:** รูปสมุดเช็คชื่อกระดาษ vs หน้าจอระบบ (before/after)

---

### SLIDE 3 — Solution Overview
**หัวข้อ:** FaceCheck คืออะไร

**3 วิธีเช็คชื่อ (icon + label):**
- 🤖 สแกนใบหน้า — อัตโนมัติ real-time
- 📱 QR Code — นักเรียนสแกนเอง บนมือถือ
- ✏️ กรอกมือ — สำรองเมื่อระบบมีปัญหา

**Key message:** ข้อมูลทั้งหมดเก็บในโรงเรียน — ไม่ส่งออกไปที่ใด

**ภาพแนะนำ:** 3 icon ใหญ่เรียงแนวนอน บน dark card

---

### SLIDE 4 — Tech Stack
**หัวข้อ:** เทคโนโลยีที่ใช้

**แบ่ง 2 ฝั่ง:**

| Frontend | Backend |
|----------|---------|
| React 18 + Vite | Python + FastAPI |
| Tailwind CSS v4 | InsightFace (AI Model) |
| Recharts | SQLite / PostgreSQL |
| react-webcam | JWT Authentication |

**AI Model:** InsightFace buffalo_l — ArcFace embedding 512 มิติ
**Deploy:** Vercel (frontend) + Docker (backend) + Supabase (DB)

**ภาพแนะนำ:** logo grid ของ tech stack บน dark card, หรือ architecture diagram แบบ simple

---

### SLIDE 5 — System Architecture
**หัวข้อ:** สถาปัตยกรรมระบบ

```
Browser/มือถือ
      │ HTTPS
      ▼
  FastAPI (Python)
      │
  ┌───┴────────────┐
  │                │
InsightFace     SQLite/PostgreSQL
(AI Processing)  (ข้อมูลทั้งหมด)
```

**Key points (3 จุด):**
- Frontend = React web app (รันในเบราว์เซอร์)
- Backend = Python API (รันบนเครื่องโรงเรียน หรือ cloud)
- Database = เก็บ embedding vector + ประวัติการเช็คชื่อ

**ภาพแนะนำ:** diagram สาย arrow 3 tier แนวตั้ง, สีแต่ละ tier ต่างกัน

---

### SLIDE 6 — Face Recognition Pipeline
**หัวข้อ:** AI ทำงานอย่างไร

**Pipeline (แนวตั้ง 6 ขั้น):**
```
📷  รับภาพ JPEG จากกล้อง
    ↓
🔍  ตรวจจับใบหน้า (SCRFD detector)
    ↓
✅  ตรวจคุณภาพ (blur / size / มุม)
    ↓
🛡️  Liveness check (ป้องกันใช้รูปโกง)
    ↓
🧮  สร้าง Embedding 512 มิติ (ArcFace)
    ↓
📊  เปรียบเทียบ Euclidean distance
```

**ภาพแนะนำ:** flowchart แนวตั้ง icon + label, ตัวเลข 1-6 ด้านซ้าย

---

### SLIDE 7 — Multi-Angle Enrollment
**หัวข้อ:** ลงทะเบียน 3 มุม

**ตาราง:**
| มุม | Yaw | ประโยชน์ |
|-----|-----|---------|
| ตรง | ≤ 15° | baseline |
| ซ้าย | -50° ถึง -15° | รู้จักเมื่อเอียงซ้าย |
| ขวา | 15° ถึง 50° | รู้จักเมื่อเอียงขวา |

**Auto-Learn:** ระบบเรียนรู้ใบหน้าใหม่อัตโนมัติทุกวัน (สูงสุด 50 ตัวอย่าง/คน)
→ แม่นยำขึ้นเรื่อยๆ เมื่อใช้งานนานขึ้น

**ภาพแนะนำ:** 3 รูปใบหน้ามุมต่างกัน + yaw angle indicator (แบบที่ใช้ถ่ายจริง)

---

### SLIDE 8 — Quality & Liveness Check
**หัวข้อ:** ป้องกันการโกง

**2 ชั้น:**

**ชั้น 1 — Quality Gate (ปฏิเสธภาพไม่ดี):**
- ความชัด ≥ 40 (Laplacian variance)
- ใบหน้า ≥ 8% ของภาพ
- ตาทั้งสองข้างสมมาตร

**ชั้น 2 — Liveness Check (ป้องกันรูปภาพ/หน้าจอ):**
- LBP texture: ผิวจริง = micro-texture ซับซ้อน
- FFT analysis: หน้าจอ = periodic frequency pattern
- ทั้งสองไม่ผ่าน → ปฏิเสธ

**ภาพแนะนำ:** side-by-side รูปหน้าจริง vs รูปถ่าย + ผลการตรวจ

---

### SLIDE 9 — QR Anti-Buddy-Punching
**หัวข้อ:** ป้องกัน QR แทนกัน

**Flow (4 ขั้น):**
1. ครูสร้าง QR → มี JWT token (jti = UUID เฉพาะ)
2. นักเรียนสแกน → เปิดหน้า mobile กรอกรหัส
3. ระบบตรวจ jti ใน database → เคยใช้? → ปฏิเสธ
4. **1 QR = ใช้ได้ 1 ครั้งเท่านั้น** (หมดอายุ 30 นาที)

**ภาพแนะนำ:** QR code ใหญ่ + phone mockup หน้า QRCheckin + checkmark

---

### SLIDE 10 — Scanner Page (Demo)
**หัวข้อ:** หน้าสแกนใบหน้า

**Key features:**
- Auto scan ทุก 2 วินาที
- Period-lock: ล็อคคาบอัตโนมัติ ตรวจห้องเรียนถูกต้อง
- ผล: มาเรียน / มาสาย (>15 นาที) / เช็คแล้ว / ไม่พบ
- Confidence score แสดงเปอร์เซ็นต์ความแน่ใจ

**ภาพแนะนำ:** screenshot จริงของหน้า Scanner พร้อม annotate จุดสำคัญ

---

### SLIDE 11 — Dashboard & Reports
**หัวข้อ:** Dashboard และรายงาน

**Dashboard:**
- KPI cards: อัตราเข้าเรียนวันนี้, จำนวนมา/ขาด
- กราฟ trend 30 วัน
- Drill-down: โรงเรียน → ชั้น → ห้อง → รายบุคคล

**Reports 3 มุมมอง:**
- Summary: pivot ชั้น/ห้อง + อัตรา %
- Detail: ตารางรายบุคคล + วิธีเช็ค (face/QR/manual)
- Gradebook: วันเป็น column, ม/ส/ข/ล

**ภาพแนะนำ:** screenshot Dashboard จริง + Reports จริง แบบ 2-panel

---

### SLIDE 12 — Enrollment Flow
**หัวข้อ:** ลงทะเบียนนักเรียน

**2 วิธี:**

**แบบเดี่ยว (Real-time):**
กรอกข้อมูล → ถ่าย 3 มุม → validate มุม real-time → บันทึก

**แบบ Bulk (ZIP Import):**
เตรียมรูปด้วย `prepare_photos.py` → รวมกับ Excel เป็น ZIP → import ทีเดียว → ผลรายคน

**ภาพแนะนำ:** 2 path แยกกัน, แต่ละ path มี step icon

---

### SLIDE 13 — Role & Permission
**หัวข้อ:** สิทธิ์การใช้งาน

| ฟีเจอร์ | Admin | ครู |
|--------|-------|-----|
| จัดการนักเรียน | ✅ ทุกคน | ✅ ห้องที่สอน |
| เช็คชื่อ (scan) | ✅ | ✅ |
| ดู Dashboard | ✅ ทุกวิชา | ✅ วิชาตัวเอง |
| จัดการครู/วิชา | ✅ | ❌ |
| ตั้งค่า threshold | ✅ | ❌ |
| ดู Audit Log | ✅ | ❌ |

**ภาพแนะนำ:** table สี (✅ เขียว, ❌ แดง/dim) + icon ครู vs admin

---

### SLIDE 14 — Security Summary
**หัวข้อ:** ความปลอดภัย

**6 ชั้น (icon list):**
- 🔐 JWT Authentication — token มีอายุ
- 👁️ Liveness Detection — ป้องกันรูปภาพโกง
- 🏫 Room-Lock — ตรวจห้องเรียนตรงกับตารางสอน
- 🔑 1 QR = 1 ครั้ง — JTI tracking
- 📋 Audit Trail — ทุกการแก้ไขมีบันทึก
- 🏠 On-Premise — ข้อมูลชีวมิติไม่ออกนอกโรงเรียน

**ภาพแนะนำ:** shield icon กลาง + 6 bullet รอบๆ (radial layout)

---

### SLIDE 15 — Database Schema (Simplified)
**หัวข้อ:** โครงสร้างข้อมูล

**แสดง 4 ตารางหลักและความสัมพันธ์:**
```
students ──(1:N)──► student_face_embeddings
    │
    └──(1:N)──► attendance_logs ◄──(N:1)── subjects
                                              │
                                         subject_schedules
```

**Key:** student_face_embeddings เก็บ embedding 512 มิติ (float32) ต่อมุม

**ภาพแนะนำ:** ERD แบบ simplified (ไม่ต้องแสดงทุก column) ใช้ color per table

---

### SLIDE 16 — Deployment
**หัวข้อ:** การ Deploy ระบบ

| Component | ที่ | URL |
|-----------|-----|-----|
| Frontend | Vercel | face-check-zeta.vercel.app |
| Database | Supabase (PostgreSQL) | cloud |
| Backend | Docker container | on-premise หรือ cloud |

**Local dev:** SQLite fallback อัตโนมัติ (ไม่ต้องตั้งค่า)
**Backend image:** Python 3.11-slim + libGL (InsightFace dependency)

**ภาพแนะนำ:** cloud diagram 3 node (Vercel / Supabase / Docker) + arrow

---

### SLIDE 17 — Limitations & Future
**หัวข้อ:** ข้อจำกัดและแนวทางต่อ

**ข้อจำกัดปัจจุบัน:**
- รัน CPU เท่านั้น (ไม่ใช้ GPU)
- ไม่มี push notification ผู้ปกครอง
- ไม่มี portal นักเรียน (ดูประวัติตัวเอง)

**แนวทางพัฒนาต่อ:**
- เพิ่ม CUDA provider (เร็วขึ้น 5-10x)
- Line Notify แจ้งผู้ปกครองเมื่อขาดเรียน
- Role `student` สำหรับ portal นักเรียน

**ภาพแนะนำ:** 2-column list, ด้านซ้าย = ข้อจำกัด (สีแดงอ่อน), ด้านขวา = roadmap (สีน้ำเงิน)

---

### SLIDE 18 — Demo / Live Screen
**หัวข้อ:** สาธิตการใช้งาน

**ลำดับ demo:**
1. Login (admin)
2. หน้า Scanner → สแกนใบหน้า
3. ผลการสแกน (present/late)
4. หน้า Dashboard → ดูสถิติ
5. หน้า Reports → export Excel

**หมายเหตุสำหรับผู้นำเสนอ:** เตรียมข้อมูลนักเรียน + กล้องให้พร้อมก่อน

---

### SLIDE 19 — สรุป (Closing)
**หัวข้อ:** FaceCheck — ระบบเช็คชื่ออัตโนมัติ

**3 จุดสรุป:**
- ✅ แม่นยำ — AI 512-D embedding, multi-angle, auto-learn
- ✅ ปลอดภัย — liveness, room-lock, audit trail, on-premise
- ✅ ครบถ้วน — face / QR / manual, dashboard, reports, bulk import

**ภาพแนะนำ:** logo FaceCheck กลาง + 3 feature pill ล้อมรอบ

---

## ข้อมูล Context เพิ่มเติมสำหรับ Designer

### ตัวเลขสำคัญ (ใช้ใน slide)
- Embedding: **512 มิติ** (float32 vector)
- มุมลงทะเบียน: **3 มุม** (front / left / right)
- Auto-learn limit: **50 ตัวอย่าง/คน**
- QR อายุ: **30 นาที**
- Detection confidence threshold: **0.65**
- Face size minimum: **8% ของภาพ**
- Scan interval (auto): **ทุก 2 วินาที**
- Late threshold: **>15 นาที** หลัง time_start
- Cooldown หลังสแกนสำเร็จ: **8 วินาที**

### Status/Label ที่ใช้ในระบบ
| สถานะ | ความหมาย | สี |
|-------|---------|-----|
| present | มาเรียน | เขียว |
| late | มาสาย | ส้ม |
| absent | ขาดเรียน | แดง |
| excused | ลา | น้ำเงิน |
| already_checked | เช็คแล้ว | เหลือง |

### Check Methods
| วิธี | สี chip |
|------|--------|
| face | น้ำเงิน |
| qr | ม่วง |
| manual | เทา |

### Screenshots ที่ควรถ่ายสำหรับใช้ใน slide
1. หน้า Scanner (ขณะสแกน + ผลสำเร็จ)
2. หน้า Dashboard (ภาพรวม KPI + กราฟ)
3. หน้า Reports (Summary view + Gradebook)
4. หน้า Enrollment (3 slot มุม + กล้อง)
5. หน้า QRCheckin (mobile, แสดง QR + หน้ากรอกรหัส)
6. หน้า StudentDetail (face gallery + trend chart)
7. หน้า Admin (ตั้งค่า threshold)
8. prepare_photos.py GUI (auto-crop ทำงาน)
