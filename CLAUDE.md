# facecheck — Project Context

ระบบเช็คชื่อด้วยใบหน้า (Face Recognition Attendance System) สำหรับโรงเรียน

## Stack

- **Backend:** FastAPI + SQLite + InsightFace (face recognition)
- **Frontend:** React + Vite + Tailwind v4
- **Auth:** JWT (access token ใน localStorage)
- **Roles:** `admin`, `teacher`

## โครงสร้าง

```
backend/
  app/
    api/endpoints/   — auth, enroll, attendance, stats, reports, settings, audit
    models/          — database.py (SQLAlchemy), user.py
    core/            — security.py, dependencies.py
    services/        — face_processor.py (InsightFace wrapper)
  main.py
frontend/
  src/
    pages/           — Login, Dashboard, Scanner, Students, StudentDetail,
                       Enrollment, Reports, Admin
    components/      — Sidebar, Layout, hooks/
    styles/          — index.css (design tokens + utility classes)
```

## Conventions

- CSS ใช้ CSS variables ทั้งหมด (`--fc-primary`, `--fc-surface` ฯลฯ) — ห้าม hardcode สี
- Responsive: CSS classes ใน `index.css` (`scanner-grid`, `stats-4col`, `enroll-single-grid` ฯลฯ)
- Mobile ≤640px: table → card layout pattern (ดู Students.jsx, Admin.jsx)
- API base URL: `import.meta.env.VITE_API_URL`
- Face enrollment: 3 มุม (front/right/left), validate ด้วย `/enroll/check-angle`
- Attendance log status: `present`, `late`, `absent`, `excused`, `already_checked`
- `check_method`: `face`, `qr`, `manual`
