import cv2
import numpy as np
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timezone, timedelta

_BKK = timezone(timedelta(hours=7))
from typing import Optional

from app.models.database import get_db, Student, Subject, SubjectSchedule, AttendanceLog, SemesterSetting, StudentFaceEmbedding, AttendanceAuditLog, QRSessionUsed
from app.models.user import User, TeacherSubject
from app.services.face_proc import FaceProcessor
from app.core.dependencies import require_teacher_or_admin, require_admin, get_current_user

router = APIRouter()
face_processor = FaceProcessor()

# ── In-memory embedding cache ─────────────────────────────────────
_EMB_CACHE: dict | None = None  # {'matrix': np.ndarray, 'students': list[_CachedStudent]}

class _CachedStudent:
    """Plain-Python snapshot of Student columns — session-independent."""
    __slots__ = ('id', 'student_id', 'title', 'first_name', 'last_name', 'grade_level', 'room_number')
    def __init__(self, s: Student):
        self.id          = s.id
        self.student_id  = s.student_id
        self.title       = s.title
        self.first_name  = s.first_name
        self.last_name   = s.last_name
        self.grade_level = s.grade_level
        self.room_number = s.room_number

def invalidate_embedding_cache():
    global _EMB_CACHE
    _EMB_CACHE = None

def _ensure_emb_cache(db: Session):
    global _EMB_CACHE
    if _EMB_CACHE is not None:
        return
    rows = (
        db.query(StudentFaceEmbedding, Student)
        .join(Student, Student.id == StudentFaceEmbedding.student_id)
        .all()
    )
    valid = [
        (np.frombuffer(e.embedding, dtype=np.float32), _CachedStudent(s))
        for e, s in rows
        if len(e.embedding) == 512 * 4
    ]
    if not valid:
        return
    _EMB_CACHE = {
        'matrix':   np.stack([v[0] for v in valid]),
        'students': [v[1] for v in valid],
    }



@router.post("/scan")
async def scan_attendance(
    subject_id:  int           = Query(...,        description="ID ของรายวิชา"),
    schedule_id: Optional[int] = Query(default=None, description="ID ของ schedule สำหรับล็อคห้อง"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายวิชา ID {subject_id}")

    # Teacher เช็คชื่อได้เฉพาะวิชาที่ตัวเองสอน
    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เช็คชื่อวิชานี้")

    # Load settings first so quality thresholds are available for process_capture
    setting        = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    THRESHOLD      = setting.face_threshold  if (setting and setting.face_threshold  is not None) else 0.65
    MIN_DET_SCORE  = setting.min_det_score   if (setting and setting.min_det_score   is not None) else 0.65
    MIN_FACE_RATIO = setting.min_face_ratio  if (setting and setting.min_face_ratio  is not None) else 0.08
    MIN_BLUR_SCORE = setting.min_blur_score  if (setting and setting.min_blur_score  is not None) else 40.0

    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์ภาพได้")

    try:
        current_embedding = face_processor.process_capture(
            frame,
            min_det_score=MIN_DET_SCORE,
            min_face_ratio=MIN_FACE_RATIO,
            min_blur_score=MIN_BLUR_SCORE,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if current_embedding is None:
        raise HTTPException(status_code=400, detail="ไม่พบใบหน้าในภาพ")

    # Nearest-neighbor — use in-memory cache (built once, invalidated on enrollment changes)
    _ensure_emb_cache(db)
    if _EMB_CACHE is None:
        raise HTTPException(status_code=404, detail="ยังไม่มีนักเรียนที่ลงทะเบียนใบหน้าไว้")

    emb_matrix   = _EMB_CACHE['matrix']    # (N, 512) — already stacked
    students_arr = _EMB_CACHE['students']
    dists        = np.linalg.norm(emb_matrix - current_embedding[None, :], axis=1)
    best_idx     = int(np.argmin(dists))
    best_dist    = float(dists[best_idx])
    best_match   = students_arr[best_idx] if best_dist <= THRESHOLD else None

    if not best_match:
        raise HTTPException(status_code=404, detail="ไม่สามารถระบุตัวตนได้ กรุณาลองใหม่")

    # ── Load schedule (for room restriction + late detection) ─────
    sched = None
    if schedule_id:
        sched = db.query(SubjectSchedule).filter(SubjectSchedule.id == schedule_id).first()

    # ── Room restriction (ทุก role รวม admin) ───────────────────
    def _wrong_room_error(message: str):
        full_name = " ".join(filter(None, [best_match.title, best_match.first_name, best_match.last_name]))
        raise HTTPException(status_code=403, detail={
            "error_code":  "wrong_room",
            "message":     message,
            "name":        full_name,
            "student_id":  best_match.student_id,
            "grade_level": best_match.grade_level,
            "room_number": best_match.room_number,
        })

    if sched and (sched.grade_level or sched.room_number):
        grade_ok = not sched.grade_level or best_match.grade_level == sched.grade_level
        room_ok  = not sched.room_number  or best_match.room_number  == sched.room_number
        if not (grade_ok and room_ok):
            student_loc = f"ชั้น {best_match.grade_level or '?'} ห้อง {best_match.room_number or '?'}"
            sched_loc   = f"ชั้น {sched.grade_level or '?'} ห้อง {sched.room_number or '?'}"
            _wrong_room_error(f"ไม่ได้เรียนวิชานี้คาบนี้ ({student_loc} → ห้องที่เรียน: {sched_loc})")
    else:
        subject_schedules = db.query(SubjectSchedule).filter(
            SubjectSchedule.subject_id == subject_id
        ).all()
        allowed_rooms = {
            (sc.grade_level, sc.room_number)
            for sc in subject_schedules
            if sc.grade_level and sc.room_number
        }
        if allowed_rooms:
            student_room = (best_match.grade_level, best_match.room_number)
            if student_room not in allowed_rooms:
                student_loc = f"ชั้น {best_match.grade_level or '?'} ห้อง {best_match.room_number or '?'}"
                _wrong_room_error(f"ไม่ได้เรียนวิชานี้ ({student_loc})")

    now = datetime.now(_BKK).replace(tzinfo=None)

    # ── Period-Lock: ห้ามสแกนนอกช่วงเวลาเรียน (±10 นาที grace) ──
    if sched and sched.time_start and sched.time_end:
        try:
            sh, sm = map(int, sched.time_start.split(':'))
            eh, em = map(int, sched.time_end.split(':'))
            GRACE_MIN = 10
            now_min   = now.hour * 60 + now.minute
            if not (sh * 60 + sm - GRACE_MIN <= now_min <= eh * 60 + em + GRACE_MIN):
                raise HTTPException(
                    status_code=403,
                    detail="ไม่อยู่ในช่วงเวลาเรียน — ไม่สามารถเช็คชื่อได้ขณะนี้",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # ── Auto late detection: > 15 min past schedule start ────────
    # Fall back to today's schedules when no specific schedule is locked
    _sched_late = sched
    if _sched_late is None:
        _DAY = {0: 'จ', 1: 'อ', 2: 'พ', 3: 'พฤ', 4: 'ศ', 5: 'ส', 6: 'อา'}
        _day_scheds = db.query(SubjectSchedule).filter(
            SubjectSchedule.subject_id == subject_id,
            SubjectSchedule.day_of_week == _DAY[now.weekday()],
        ).all()
        if _day_scheds:
            def _sm(sc):
                try: h, m = map(int, (sc.time_start or '').split(':')); return h * 60 + m
                except: return 0
            _sched_late = max(_day_scheds, key=_sm)
    scan_status = "present"
    if _sched_late and _sched_late.time_start:
        try:
            sh, sm = map(int, _sched_late.time_start.split(':'))
            if now.hour * 60 + now.minute > sh * 60 + sm + 15:
                scan_status = "late"
        except Exception:
            pass

    already_checked = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.student_id == best_match.id,
            AttendanceLog.subject_id == subject_id,
            func.date(AttendanceLog.timestamp) == str(now.date()),
            AttendanceLog.status.in_(["present", "late"]),
        )
        .first()
    )
    student_info = {
        "student_id":  best_match.student_id,
        "name":        " ".join(filter(None, [best_match.title, best_match.first_name, best_match.last_name])),
        "grade_level": best_match.grade_level,
        "room_number": best_match.room_number,
        "subject_code": subject.subject_code,
        "subject":     subject.subject_name,
        "timestamp":   now.strftime("%H:%M:%S"),
        "confidence":  round(float(1 - (best_dist ** 2) / 2), 3),
    }

    if already_checked:
        checked_at_str = already_checked.timestamp.strftime("%H:%M")
        _, jpeg_buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        dup_log = AttendanceLog(
            student_id=best_match.id, subject_id=subject_id, status="already_checked",
            scan_image=jpeg_buf.tobytes(), timestamp=now, check_method="face",
        )
        db.add(dup_log)
        db.commit()
        db.refresh(dup_log)
        return {
            **student_info,
            "log_id":  dup_log.id,
            "status":  "already_checked",
            "message": f"{best_match.first_name} เช็คชื่อวิชานี้ไปแล้ววันนี้",
            "checked_at": checked_at_str,
        }

    _, jpeg_buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    new_log = AttendanceLog(
        student_id=best_match.id, subject_id=subject_id, status=scan_status,
        scan_image=jpeg_buf.tobytes(), timestamp=now, check_method="face",
    )
    db.add(new_log)

    # Auto-learn: add scan embedding to improve future recognition accuracy.
    # Fires for every successful recognition. Skip if this student already has a
    # scan-sourced embedding saved today (avoids daily duplicates from same lighting).
    MAX_AUTO_EMBEDDINGS = 50
    today_str = now.strftime("%d/%m")
    already_learned_today = db.query(StudentFaceEmbedding).filter(
        StudentFaceEmbedding.student_id == best_match.id,
        StudentFaceEmbedding.label.like(f"สแกน {today_str}%"),
    ).first()
    if not already_learned_today:
        emb_count = db.query(StudentFaceEmbedding).filter(
            StudentFaceEmbedding.student_id == best_match.id
        ).count()
        if emb_count < MAX_AUTO_EMBEDDINGS:
            _, full_jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            db.add(StudentFaceEmbedding(
                student_id=best_match.id,
                embedding=current_embedding.tobytes(),
                face_image=full_jpeg.tobytes(),
                label=f"สแกน {now.strftime('%d/%m %H:%M')}",
            ))

    db.commit()
    db.refresh(new_log)

    return {
        **student_info,
        "log_id":      new_log.id,
        "status":      "success",
        "scan_status": scan_status,
        "message":     "มาสาย" if scan_status == "late" else "เช็คชื่อสำเร็จ",
    }


@router.post("/scan/multi")
async def scan_multi(
    subject_id:  int           = Query(...,        description="ID ของรายวิชา"),
    schedule_id: Optional[int] = Query(default=None, description="ID ของ schedule สำหรับล็อคห้อง"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """สแกนใบหน้าหลายคนในภาพเดียว — คืน list ผลลัพธ์ทุกใบหน้าที่ระบุตัวตนได้"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายวิชา ID {subject_id}")

    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เช็คชื่อวิชานี้")

    setting        = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    THRESHOLD      = setting.face_threshold  if (setting and setting.face_threshold  is not None) else 0.65
    MIN_DET_SCORE  = setting.min_det_score   if (setting and setting.min_det_score   is not None) else 0.65
    MIN_FACE_RATIO = setting.min_face_ratio  if (setting and setting.min_face_ratio  is not None) else 0.08
    MIN_BLUR_SCORE = setting.min_blur_score  if (setting and setting.min_blur_score  is not None) else 40.0

    contents = await file.read()
    nparr    = np.frombuffer(contents, np.uint8)
    frame    = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="ไม่สามารถอ่านไฟล์ภาพได้")

    embeddings = face_processor.process_capture_multi(
        frame,
        min_det_score=MIN_DET_SCORE,
        min_face_ratio=MIN_FACE_RATIO,
        min_blur_score=MIN_BLUR_SCORE,
    )
    if not embeddings:
        return {"results": [], "face_count": 0, "matched_count": 0}

    _ensure_emb_cache(db)
    if _EMB_CACHE is None:
        return {"results": [], "face_count": len(embeddings), "matched_count": 0}

    sched = None
    if schedule_id:
        sched = db.query(SubjectSchedule).filter(SubjectSchedule.id == schedule_id).first()

    now = datetime.now(_BKK).replace(tzinfo=None)

    if sched and sched.time_start and sched.time_end:
        try:
            sh, sm = map(int, sched.time_start.split(':'))
            eh, em = map(int, sched.time_end.split(':'))
            GRACE_MIN = 10
            now_min   = now.hour * 60 + now.minute
            if not (sh * 60 + sm - GRACE_MIN <= now_min <= eh * 60 + em + GRACE_MIN):
                raise HTTPException(
                    status_code=403,
                    detail="ไม่อยู่ในช่วงเวลาเรียน — ไม่สามารถเช็คชื่อได้ขณะนี้",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    _sched_late = sched
    if _sched_late is None:
        _DAY = {0: 'จ', 1: 'อ', 2: 'พ', 3: 'พฤ', 4: 'ศ', 5: 'ส', 6: 'อา'}
        _day_scheds = db.query(SubjectSchedule).filter(
            SubjectSchedule.subject_id == subject_id,
            SubjectSchedule.day_of_week == _DAY[now.weekday()],
        ).all()
        if _day_scheds:
            def _sm(sc):
                try: h, m = map(int, (sc.time_start or '').split(':')); return h * 60 + m
                except: return 0
            _sched_late = max(_day_scheds, key=_sm)
    scan_status_base = "present"
    if _sched_late and _sched_late.time_start:
        try:
            sh, sm = map(int, _sched_late.time_start.split(':'))
            if now.hour * 60 + now.minute > sh * 60 + sm + 15:
                scan_status_base = "late"
        except Exception:
            pass

    emb_matrix   = _EMB_CACHE['matrix']
    students_arr = _EMB_CACHE['students']

    # Best match per face; deduplicate by student PK (keep closest distance)
    matched: dict = {}  # student.id -> (student, dist, embedding)
    for emb in embeddings:
        dists     = np.linalg.norm(emb_matrix - emb[None, :], axis=1)
        best_idx  = int(np.argmin(dists))
        best_dist = float(dists[best_idx])
        if best_dist > THRESHOLD:
            continue
        student = students_arr[best_idx]
        if student.id not in matched or best_dist < matched[student.id][1]:
            matched[student.id] = (student, best_dist, emb)

    # Pre-load allowed rooms (avoid repeated queries inside loop)
    allowed_rooms = None
    if not (sched and (sched.grade_level or sched.room_number)):
        subj_scheds = db.query(SubjectSchedule).filter(SubjectSchedule.subject_id == subject_id).all()
        rs = {(sc.grade_level, sc.room_number) for sc in subj_scheds if sc.grade_level and sc.room_number}
        allowed_rooms = rs if rs else None

    _, jpeg_scan = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    _, jpeg_full = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    jpeg_scan_bytes = jpeg_scan.tobytes()
    jpeg_full_bytes = jpeg_full.tobytes()

    today_str  = str(now.date())
    today_label = now.strftime("%d/%m")
    MAX_AUTO_EMBEDDINGS = 50
    results = []

    for student_id_pk, (student, best_dist, scan_emb) in matched.items():
        student_info = {
            "student_id":   student.student_id,
            "name":         " ".join(filter(None, [student.title, student.first_name, student.last_name])),
            "grade_level":  student.grade_level,
            "room_number":  student.room_number,
            "subject_code": subject.subject_code,
            "subject":      subject.subject_name,
            "timestamp":    now.strftime("%H:%M:%S"),
            "confidence":   round(float(1 - (best_dist ** 2) / 2), 3),
        }

        # Room restriction
        wrong_room = False
        wrong_room_msg = ""
        if sched and (sched.grade_level or sched.room_number):
            grade_ok = not sched.grade_level or student.grade_level == sched.grade_level
            room_ok  = not sched.room_number  or student.room_number  == sched.room_number
            if not (grade_ok and room_ok):
                wrong_room = True
                sl = f"ชั้น {student.grade_level or '?'} ห้อง {student.room_number or '?'}"
                rl = f"ชั้น {sched.grade_level or '?'} ห้อง {sched.room_number or '?'}"
                wrong_room_msg = f"ไม่ได้เรียนวิชานี้คาบนี้ ({sl} → ห้องที่เรียน: {rl})"
        elif allowed_rooms:
            student_room = (student.grade_level, student.room_number)
            if student_room not in allowed_rooms:
                wrong_room = True
                sl = f"ชั้น {student.grade_level or '?'} ห้อง {student.room_number or '?'}"
                wrong_room_msg = f"ไม่ได้เรียนวิชานี้ ({sl})"

        if wrong_room:
            results.append({**student_info, "log_id": None, "status": "wrong_room", "message": wrong_room_msg})
            continue

        # Already checked today?
        already_checked = (
            db.query(AttendanceLog)
            .filter(
                AttendanceLog.student_id == student_id_pk,
                AttendanceLog.subject_id == subject_id,
                func.date(AttendanceLog.timestamp) == today_str,
                AttendanceLog.status.in_(["present", "late"]),
            )
            .first()
        )

        if already_checked:
            checked_at_str = already_checked.timestamp.strftime("%H:%M")
            dup_log = AttendanceLog(
                student_id=student_id_pk, subject_id=subject_id,
                status="already_checked", scan_image=jpeg_scan_bytes,
                timestamp=now, check_method="face",
            )
            db.add(dup_log)
            results.append({
                **student_info,
                "log_id":     already_checked.id,
                "status":     "already_checked",
                "message":    f"{student.first_name} เช็คชื่อวิชานี้ไปแล้ววันนี้",
                "checked_at": checked_at_str,
            })
            continue

        # New check-in
        new_log = AttendanceLog(
            student_id=student_id_pk, subject_id=subject_id,
            status=scan_status_base, scan_image=jpeg_scan_bytes,
            timestamp=now, check_method="face",
        )
        db.add(new_log)
        db.flush()
        log_id = new_log.id

        # Auto-learn
        already_learned = db.query(StudentFaceEmbedding).filter(
            StudentFaceEmbedding.student_id == student_id_pk,
            StudentFaceEmbedding.label.like(f"สแกน {today_label}%"),
        ).first()
        if not already_learned:
            emb_count = db.query(StudentFaceEmbedding).filter(
                StudentFaceEmbedding.student_id == student_id_pk
            ).count()
            if emb_count < MAX_AUTO_EMBEDDINGS:
                db.add(StudentFaceEmbedding(
                    student_id=student_id_pk,
                    embedding=scan_emb.tobytes(),
                    face_image=jpeg_full_bytes,
                    label=f"สแกน {now.strftime('%d/%m %H:%M')}",
                ))

        results.append({
            **student_info,
            "log_id":      log_id,
            "status":      "success",
            "scan_status": scan_status_base,
            "message":     "มาสาย" if scan_status_base == "late" else "เช็คชื่อสำเร็จ",
        })

    db.commit()
    return {"results": results, "face_count": len(embeddings), "matched_count": len(matched)}


@router.get("/subjects")
def list_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    # Teacher เห็นเฉพาะวิชาที่ตัวเองสอน, Admin เห็นทั้งหมด
    if current_user.role == "teacher":
        rows = (
            db.query(Subject)
            .join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
            .filter(TeacherSubject.teacher_id == current_user.id)
            .order_by(Subject.subject_code)
            .all()
        )
    else:
        rows = db.query(Subject).order_by(Subject.subject_code).all()

    return [
        {
            "id": s.id,
            "subject_code": s.subject_code,
            "subject_name": s.subject_name,
            "teacher_name": s.teacher_name,
            "days": list({sc.day_of_week for sc in s.schedules}),
        }
        for s in rows
    ]


@router.get("/current-schedule")
def get_current_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """หา schedule ที่ตรงกับเวลาปัจจุบัน (±10 นาที grace period)"""
    DAY_MAP = {0: 'จ', 1: 'อ', 2: 'พ', 3: 'พฤ', 4: 'ศ', 5: 'ส', 6: 'อา'}
    now = datetime.now(_BKK).replace(tzinfo=None)
    today_day   = DAY_MAP[now.weekday()]
    now_minutes = now.hour * 60 + now.minute
    GRACE = 10  # นาที

    if current_user.role == "teacher":
        subj_list = (
            db.query(Subject)
            .join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
            .filter(TeacherSubject.teacher_id == current_user.id)
            .all()
        )
    else:
        subj_list = db.query(Subject).all()

    matches = []
    for s in subj_list:
        for sc in s.schedules:
            if sc.day_of_week != today_day:
                continue
            try:
                sh, sm = map(int, sc.time_start.split(':'))
                eh, em = map(int, sc.time_end.split(':'))
                if (sh * 60 + sm - GRACE) <= now_minutes <= (eh * 60 + em + GRACE):
                    matches.append({
                        "schedule_id": sc.id,
                        "subject_id":  s.id,
                        "subject_code": s.subject_code,
                        "subject_name": s.subject_name,
                        "time_start":  sc.time_start,
                        "time_end":    sc.time_end,
                        "grade_level": sc.grade_level,
                        "room_number": sc.room_number,
                    })
            except Exception:
                continue

    return {
        "today_day":    today_day,
        "current_time": now.strftime("%H:%M"),
        "matches":      matches,
    }


@router.post("/subjects", status_code=201)
def create_subject(
    subject_code: str = Query(...),
    subject_name: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if db.query(Subject).filter(Subject.subject_code == subject_code).first():
        raise HTTPException(status_code=409, detail="รหัสวิชานี้มีในระบบแล้ว")

    subject = Subject(subject_code=subject_code, subject_name=subject_name)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": subject.id, "subject_code": subject.subject_code, "subject_name": subject.subject_name}


def _subject_detail(s: Subject):
    return {
        "id": s.id, "subject_code": s.subject_code, "subject_name": s.subject_name,
        "teacher_name": s.teacher_name, "description": s.description, "category": s.category,
        "schedules": [
            {"id": sc.id, "day_of_week": sc.day_of_week, "time_start": sc.time_start,
             "time_end": sc.time_end, "grade_level": sc.grade_level, "room_number": sc.room_number}
            for sc in s.schedules
        ],
    }


@router.get("/subjects/{subject_id}")
def get_subject(subject_id: int, db: Session = Depends(get_db), _: User = Depends(require_teacher_or_admin)):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    return _subject_detail(s)


@router.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    subject_code: str = Query(...),
    subject_name: str = Query(...),
    teacher_name: str = Query(default=""),
    description: str = Query(default=""),
    category: str = Query(default=""),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    conflict = db.query(Subject).filter(Subject.subject_code == subject_code, Subject.id != subject_id).first()
    if conflict:
        raise HTTPException(status_code=409, detail="รหัสวิชานี้มีในระบบแล้ว")
    s.subject_code = subject_code
    s.subject_name = subject_name
    s.teacher_name = teacher_name or None
    s.description  = description or None
    s.category     = category or None
    db.commit()
    return _subject_detail(s)


@router.post("/subjects/{subject_id}/schedules", status_code=201)
def add_schedule(
    subject_id: int,
    day_of_week: str = Query(...),
    time_start:  str = Query(...),
    time_end:    str = Query(...),
    grade_level: str = Query(default=""),
    room_number: str = Query(default=""),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    s = db.query(Subject).filter(Subject.id == subject_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    sc = SubjectSchedule(
        subject_id=subject_id, day_of_week=day_of_week,
        time_start=time_start, time_end=time_end,
        grade_level=grade_level or None, room_number=room_number or None,
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return {"id": sc.id, "day_of_week": sc.day_of_week, "time_start": sc.time_start,
            "time_end": sc.time_end, "grade_level": sc.grade_level, "room_number": sc.room_number}


@router.delete("/subjects/schedules/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    sc = db.query(SubjectSchedule).filter(SubjectSchedule.id == schedule_id).first()
    if not sc:
        raise HTTPException(status_code=404, detail="ไม่พบตารางสอน")
    db.delete(sc)
    db.commit()


@router.get("/logs/{log_id}/image")
def get_log_image(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log or not log.scan_image:
        raise HTTPException(status_code=404, detail="ไม่พบรูปภาพการสแกน")
    return Response(content=log.scan_image, media_type="image/jpeg")


@router.get("/logs")
def list_logs(
    log_date:   Optional[str] = Query(default=None, description="วันที่เดียว YYYY-MM-DD"),
    date_from:  Optional[str] = Query(default=None, description="ช่วงเริ่มต้น YYYY-MM-DD"),
    date_to:    Optional[str] = Query(default=None, description="ช่วงสิ้นสุด YYYY-MM-DD"),
    subject_id: Optional[int] = Query(default=None),
    grade_level: Optional[str] = Query(default=None),
    room_number: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    q = (
        db.query(AttendanceLog, Student, Subject)
        .join(Student, Student.id == AttendanceLog.student_id)
        .join(Subject, Subject.id == AttendanceLog.subject_id)
    )
    if date_from and date_to:
        q = q.filter(
            func.date(AttendanceLog.timestamp) >= date_from,
            func.date(AttendanceLog.timestamp) <= date_to,
        )
    elif log_date:
        q = q.filter(func.date(AttendanceLog.timestamp) == log_date)
    else:
        q = q.filter(func.date(AttendanceLog.timestamp) == str(datetime.now(_BKK).date()))
    if subject_id:
        q = q.filter(AttendanceLog.subject_id == subject_id)
    if grade_level:
        q = q.filter(Student.grade_level == grade_level)
    if room_number:
        q = q.filter(Student.room_number == room_number)
    q = q.filter(AttendanceLog.status != "already_checked")
    rows = q.order_by(AttendanceLog.timestamp.desc()).all()
    return [
        {
            "log_id":      log.id,
            "student_id":  student.student_id,
            "name":        f"{student.first_name} {student.last_name}",
            "grade_level": student.grade_level,
            "room_number": student.room_number,
            "subject_code": subject.subject_code,
            "subject_name": subject.subject_name,
            "status":        log.status,
            "reason":        log.reason,
            "check_method":  log.check_method,
            "timestamp":     log.timestamp.strftime("%H:%M:%S"),
            "date":          log.timestamp.strftime("%Y-%m-%d"),
        }
        for log, student, subject in rows
    ]


@router.patch("/logs/{log_id}")
def update_log_status(
    log_id: int,
    status: str = Query(..., description="present | late | absent | excused"),
    reason: str = Query(None, description="เหตุผล (สำหรับ excused)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """แก้ไขสถานะการเช็คชื่อ"""
    if status not in ("present", "late", "absent", "excused"):
        raise HTTPException(status_code=400, detail="status ต้องเป็น present, late, absent หรือ excused")
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ไม่พบบันทึกการเช็คชื่อ")
    old_status = log.status
    log.status = status
    log.reason = reason if status == "excused" else None
    db.add(AttendanceAuditLog(
        log_id=log.id,
        action="status_change",
        changed_by_id=current_user.id,
        changed_by_name=current_user.full_name,
        old_status=old_status,
        new_status=status,
        reason=reason if status == "excused" else None,
        student_id_str=log.student.student_id,
        student_name=f"{log.student.first_name} {log.student.last_name}",
        subject_code=log.subject.subject_code,
        subject_name=log.subject.subject_name,
        log_date=log.timestamp.date(),
    ))
    db.commit()
    return {"log_id": log_id, "status": status, "reason": log.reason}


@router.delete("/logs/{log_id}", status_code=204)
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    log = db.query(AttendanceLog).filter(AttendanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="ไม่พบบันทึกการเช็คชื่อ")
    db.add(AttendanceAuditLog(
        log_id=log.id,
        action="delete",
        changed_by_id=current_user.id,
        changed_by_name=current_user.full_name,
        old_status=log.status,
        student_id_str=log.student.student_id,
        student_name=f"{log.student.first_name} {log.student.last_name}",
        subject_code=log.subject.subject_code,
        subject_name=log.subject.subject_name,
        log_date=log.timestamp.date(),
    ))
    db.commit()
    db.delete(log)
    db.commit()


@router.post("/manual", status_code=201)
def manual_attendance(
    subject_id:     int = Query(..., description="ID ของรายวิชา"),
    student_id_str: str = Query(..., alias="student_id", description="รหัสนักเรียน เช่น 6408052201"),
    status:         str = Query(default="present", description="present | late | absent"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """ครู/แอดมินเช็คชื่อนักเรียนด้วยตนเอง (ไม่ใช้ใบหน้า)"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail=f"ไม่พบรายวิชา ID {subject_id}")

    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เช็คชื่อวิชานี้")

    if status not in ("present", "late", "absent"):
        raise HTTPException(status_code=400, detail="status ต้องเป็น present, late หรือ absent")

    student = db.query(Student).filter(Student.student_id == student_id_str).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"ไม่พบนักเรียนรหัส {student_id_str}")

    already = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.student_id == student.id,
            AttendanceLog.subject_id == subject_id,
            func.date(AttendanceLog.timestamp) == str(datetime.now(_BKK).date()),
        )
        .first()
    )

    now  = datetime.now(_BKK).replace(tzinfo=None)
    name = " ".join(filter(None, [student.title, student.first_name, student.last_name]))
    info = {
        "student_id":  student.student_id,
        "name":        name,
        "grade_level": student.grade_level,
        "room_number": student.room_number,
        "subject_code": subject.subject_code,
        "subject":     subject.subject_name,
        "timestamp":   now.strftime("%H:%M:%S"),
        "confidence":  None,
    }

    if already:
        return {
            **info,
            "log_id":     already.id,
            "status":     "already_checked",
            "message":    f"{student.first_name} เช็คชื่อวิชานี้ไปแล้ววันนี้",
            "checked_at": already.timestamp.strftime("%H:%M"),
        }

    log = AttendanceLog(student_id=student.id, subject_id=subject_id, status=status, timestamp=now, check_method="manual")
    db.add(log)
    db.commit()
    db.refresh(log)

    STATUS_LABEL = {"present": "มาเรียน", "late": "มาสาย", "absent": "ขาดเรียน"}
    return {
        **info,
        "log_id":  log.id,
        "status":  "success",
        "message": f"บันทึก {STATUS_LABEL.get(status, status)} — {name}",
    }


@router.post("/subjects/{subject_id}/mark-absent", status_code=200)
def mark_absent(
    subject_id:  int,
    schedule_id: Optional[int] = Query(default=None, description="ID ของตารางสอน (เพื่อดึงห้อง/ชั้น)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """ปิดคาบ: บันทึกขาดเรียนให้นักเรียนที่ยังไม่ได้เช็คชื่อวิชานี้วันนี้"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")

    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์จัดการวิชานี้")

    grade_level: Optional[str] = None
    room_number: Optional[str] = None
    if schedule_id:
        sched = db.query(SubjectSchedule).filter(SubjectSchedule.id == schedule_id).first()
        if sched:
            grade_level = sched.grade_level
            room_number = sched.room_number

    student_q = db.query(Student)
    if grade_level:
        student_q = student_q.filter(Student.grade_level == grade_level)
    if room_number:
        student_q = student_q.filter(Student.room_number == room_number)
    students = student_q.all()

    today_str = str(datetime.now(_BKK).date())
    existing_ids = {
        row[0]
        for row in db.query(AttendanceLog.student_id).filter(
            AttendanceLog.subject_id == subject_id,
            func.date(AttendanceLog.timestamp) == today_str,
        ).all()
    }

    now = datetime.now(_BKK).replace(tzinfo=None)
    count = 0
    for student in students:
        if student.id not in existing_ids:
            db.add(AttendanceLog(
                student_id=student.id,
                subject_id=subject_id,
                status="absent",
                timestamp=now,
                check_method="manual",
            ))
            count += 1
    db.commit()
    return {"marked_absent": count, "total_students": len(students)}


@router.delete("/subjects/{subject_id}", status_code=204)
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    db.query(TeacherSubject).filter(TeacherSubject.subject_id == subject_id).delete()
    db.delete(subject)
    db.commit()


@router.get("/today-schedules")
def get_today_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """ตารางสอนทั้งหมดของวันนี้ (สำหรับ Teacher Dashboard)"""
    DAY_MAP = {0: 'จ', 1: 'อ', 2: 'พ', 3: 'พฤ', 4: 'ศ', 5: 'ส', 6: 'อา'}
    now = datetime.now(_BKK).replace(tzinfo=None)
    today_day = DAY_MAP[now.weekday()]
    now_minutes = now.hour * 60 + now.minute

    if current_user.role == "teacher":
        subj_list = (
            db.query(Subject)
            .join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
            .filter(TeacherSubject.teacher_id == current_user.id)
            .all()
        )
    else:
        subj_list = db.query(Subject).all()

    results = []
    for s in subj_list:
        for sc in s.schedules:
            if sc.day_of_week != today_day:
                continue
            try:
                sh, sm = map(int, sc.time_start.split(':'))
                eh, em = map(int, sc.time_end.split(':'))
                start_min = sh * 60 + sm
                end_min   = eh * 60 + em
                is_now = start_min - 10 <= now_minutes <= end_min + 10
            except Exception:
                is_now = False
            results.append({
                "schedule_id":  sc.id,
                "subject_id":   s.id,
                "subject_code": s.subject_code,
                "subject_name": s.subject_name,
                "time_start":   sc.time_start,
                "time_end":     sc.time_end,
                "grade_level":  sc.grade_level,
                "room_number":  sc.room_number,
                "is_now":       is_now,
            })
    results.sort(key=lambda x: x["time_start"])
    return results


@router.post("/subjects/{subject_id}/qr-session")
def create_qr_session(
    subject_id: int,
    schedule_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """สร้าง QR token สำหรับเช็คชื่อด้วย QR Code (อายุ 30 นาที)"""
    from app.core.security import SECRET_KEY, ALGORITHM
    from jose import jwt as _jwt
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    if current_user.role == "teacher":
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์จัดการวิชานี้")
    import uuid
    expire = datetime.utcnow() + __import__("datetime").timedelta(minutes=30)
    token = _jwt.encode({
        "subject_id":  subject_id,
        "schedule_id": schedule_id,
        "type":        "qr_session",
        "jti":         str(uuid.uuid4()),
        "exp":         expire,
    }, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "token":        token,
        "expires_at":   expire.isoformat(),
        "subject_code": subject.subject_code,
        "subject_name": subject.subject_name,
    }


@router.post("/qr-checkin", status_code=201)
def qr_checkin(
    token: str = Query(..., description="QR session token"),
    student_id_str: str = Query(..., alias="student_id", description="รหัสนักเรียน"),
    db: Session = Depends(get_db),
):
    """นักเรียนเช็คชื่อผ่าน QR Code (ไม่ต้อง login)"""
    from app.core.security import SECRET_KEY, ALGORITHM
    from jose import jwt as _jwt, JWTError
    try:
        payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="QR Code หมดอายุหรือไม่ถูกต้อง")
    if payload.get("type") != "qr_session":
        raise HTTPException(status_code=400, detail="Token ประเภทไม่ถูกต้อง")

    jti = payload.get("jti")
    if jti:
        if db.query(QRSessionUsed).filter(QRSessionUsed.jti == jti).first():
            raise HTTPException(status_code=400, detail="QR Code นี้ถูกใช้แล้ว — ขอ QR ใหม่จากครู")

    subject_id  = payload["subject_id"]
    schedule_id = payload.get("schedule_id")

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")

    student = db.query(Student).filter(Student.student_id == student_id_str).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"ไม่พบนักเรียนรหัส {student_id_str}")

    # ── Room restriction for QR checkin ─────────────────────────
    qr_sched = None
    if schedule_id:
        qr_sched = db.query(SubjectSchedule).filter(SubjectSchedule.id == schedule_id).first()
    if qr_sched and (qr_sched.grade_level or qr_sched.room_number):
        grade_ok = not qr_sched.grade_level or student.grade_level == qr_sched.grade_level
        room_ok  = not qr_sched.room_number  or student.room_number  == qr_sched.room_number
        if not (grade_ok and room_ok):
            student_loc = f"ชั้น {student.grade_level or '?'} ห้อง {student.room_number or '?'}"
            sched_loc   = f"ชั้น {qr_sched.grade_level or '?'} ห้อง {qr_sched.room_number or '?'}"
            raise HTTPException(
                status_code=403,
                detail=f"นักเรียน ({student_loc}) ไม่ได้เรียนวิชานี้คาบนี้ (ห้องที่เรียน: {sched_loc})",
            )
    else:
        qr_subject_schedules = db.query(SubjectSchedule).filter(
            SubjectSchedule.subject_id == subject_id
        ).all()
        qr_allowed_rooms = {
            (sc.grade_level, sc.room_number)
            for sc in qr_subject_schedules
            if sc.grade_level and sc.room_number
        }
        if qr_allowed_rooms:
            student_room = (student.grade_level, student.room_number)
            if student_room not in qr_allowed_rooms:
                student_loc = f"ชั้น {student.grade_level or '?'} ห้อง {student.room_number or '?'}"
                raise HTTPException(
                    status_code=403,
                    detail=f"นักเรียน ({student_loc}) ไม่ได้เรียนวิชานี้",
                )

    already = (
        db.query(AttendanceLog)
        .filter(
            AttendanceLog.student_id == student.id,
            AttendanceLog.subject_id == subject_id,
            func.date(AttendanceLog.timestamp) == str(datetime.now(_BKK).date()),
        )
        .first()
    )
    if already:
        if jti:
            db.add(QRSessionUsed(jti=jti))
            db.commit()
        return {
            "status": "already_checked",
            "message": f"เช็คชื่อวิชานี้ไปแล้ววันนี้ (เวลา {already.timestamp.strftime('%H:%M')})",
            "student_name": f"{student.first_name} {student.last_name}",
            "subject_name": subject.subject_name,
        }

    now = datetime.now(_BKK).replace(tzinfo=None)
    scan_status = "present"
    if qr_sched and qr_sched.time_start:
        try:
            sh, sm = map(int, qr_sched.time_start.split(':'))
            if now.hour * 60 + now.minute > sh * 60 + sm + 15:
                scan_status = "late"
        except Exception:
            pass

    log = AttendanceLog(student_id=student.id, subject_id=subject_id, status=scan_status, timestamp=now, check_method="qr")
    db.add(log)
    if jti:
        db.add(QRSessionUsed(jti=jti))
    db.commit()
    STATUS_LABEL = {"present": "มาเรียน", "late": "มาสาย"}
    return {
        "status":       "success",
        "scan_status":  scan_status,
        "message":      STATUS_LABEL.get(scan_status, scan_status),
        "student_name": f"{student.first_name} {student.last_name}",
        "subject_name": subject.subject_name,
    }