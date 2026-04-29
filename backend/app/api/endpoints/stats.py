from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import Optional
from datetime import date, datetime, timedelta

from app.models.database import get_db, AttendanceLog, Student, Subject, SemesterSetting
from app.models.user import User, TeacherSubject
from app.core.dependencies import require_teacher_or_admin

router = APIRouter()


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    total_students = db.query(func.count(Student.id)).scalar()
    total_subjects = db.query(func.count(Subject.id)).scalar()
    total_logs     = db.query(func.count(AttendanceLog.id)).scalar()
    today_str = str(date.today())
    today_by_status = dict(
        db.query(AttendanceLog.status, func.count(AttendanceLog.id))
        .filter(func.date(AttendanceLog.timestamp) == today_str)
        .group_by(AttendanceLog.status)
        .all()
    )
    present_today = today_by_status.get("present", 0)
    late_today    = today_by_status.get("late", 0)
    return {
        "total_students":        total_students,
        "total_subjects":        total_subjects,
        "total_attendance_logs": total_logs,
        "attendance_today":      present_today + late_today,
        "present_today":         present_today,
        "late_today":            late_today,
    }


@router.get("/by-subject")
def get_stats_by_subject(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    query = (
        db.query(
            Subject.subject_code,
            Subject.subject_name,
            func.count(AttendanceLog.id).label("attendance_count"),
            func.count(distinct(AttendanceLog.student_id)).label("unique_students"),
        )
        .join(AttendanceLog, AttendanceLog.subject_id == Subject.id, isouter=True)
        .group_by(Subject.id)
    )
    # Teacher เห็นเฉพาะวิชาตัวเอง
    if current_user.role == "teacher":
        query = query.join(TeacherSubject, TeacherSubject.subject_id == Subject.id).filter(
            TeacherSubject.teacher_id == current_user.id
        )
    rows = query.order_by(func.count(AttendanceLog.id).desc()).all()
    return [
        {
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
            "attendance_count": r.attendance_count,
            "unique_students": r.unique_students,
        }
        for r in rows
    ]


@router.get("/daily")
def get_daily_stats(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    log_date_col = func.date(AttendanceLog.timestamp).label("log_date")
    q = db.query(log_date_col, func.count(AttendanceLog.id).label("count"))
    if current_user.role == "teacher":
        ts_rows = db.query(TeacherSubject).filter_by(teacher_id=current_user.id).all()
        subject_ids = [r.subject_id for r in ts_rows]
        if subject_ids:
            q = q.filter(AttendanceLog.subject_id.in_(subject_ids))
        else:
            return []
    rows = q.group_by(log_date_col).order_by(log_date_col.desc()).limit(days).all()
    return [{"date": r.log_date, "count": r.count} for r in reversed(rows)]


@router.get("/top-students")
def get_top_students(
    limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    rows = (
        db.query(
            Student.student_id,
            Student.first_name,
            Student.last_name,
            func.count(AttendanceLog.id).label("total_attendance"),
        )
        .join(AttendanceLog, AttendanceLog.student_id == Student.id, isouter=True)
        .group_by(Student.id)
        .order_by(func.count(AttendanceLog.id).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "student_id": r.student_id,
            "full_name": f"{r.first_name} {r.last_name}",
            "total_attendance": r.total_attendance,
        }
        for r in rows
    ]


@router.get("/logs")
def get_attendance_logs(
    subject_code: Optional[str] = Query(default=None),
    log_date: Optional[date]    = Query(default=None),
    limit: int                  = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    query = (
        db.query(
            AttendanceLog.timestamp,
            AttendanceLog.status,
            Student.student_id,
            Student.first_name,
            Student.last_name,
            Subject.subject_code,
            Subject.subject_name,
        )
        .join(Student, Student.id == AttendanceLog.student_id)
        .join(Subject, Subject.id == AttendanceLog.subject_id)
    )
    # Teacher เห็นเฉพาะวิชาตัวเอง
    if current_user.role == "teacher":
        query = query.join(TeacherSubject, TeacherSubject.subject_id == Subject.id).filter(
            TeacherSubject.teacher_id == current_user.id
        )
    if subject_code:
        query = query.filter(Subject.subject_code == subject_code)
    if log_date:
        query = query.filter(func.date(AttendanceLog.timestamp) == str(log_date))

    rows = query.order_by(AttendanceLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "timestamp": r.timestamp.isoformat(),
            "status": r.status,
            "student_id": r.student_id,
            "full_name": f"{r.first_name} {r.last_name}",
            "subject_code": r.subject_code,
            "subject_name": r.subject_name,
        }
        for r in rows
    ]


@router.get("/by-grade")
def get_stats_by_grade(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    today = str(date.today())
    rows = (
        db.query(Student.grade_level, func.count(Student.id).label("student_count"))
        .filter(Student.grade_level.isnot(None))
        .group_by(Student.grade_level)
        .all()
    )
    att_rows = (
        db.query(Student.grade_level, func.count(AttendanceLog.id).label("today_count"))
        .join(AttendanceLog, AttendanceLog.student_id == Student.id)
        .filter(func.date(AttendanceLog.timestamp) == today)
        .filter(Student.grade_level.isnot(None))
        .group_by(Student.grade_level)
        .all()
    )
    att_map = {r.grade_level: r.today_count for r in att_rows}
    return [
        {
            "grade_level": r.grade_level,
            "student_count": r.student_count,
            "today_attendance": att_map.get(r.grade_level, 0),
        }
        for r in rows
    ]


@router.get("/by-room")
def get_stats_by_room(
    grade_level: str = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    today = str(date.today())
    rows = (
        db.query(Student.room_number, func.count(Student.id).label("student_count"))
        .filter(Student.grade_level == grade_level)
        .filter(Student.room_number.isnot(None))
        .group_by(Student.room_number)
        .all()
    )
    att_rows = (
        db.query(Student.room_number, func.count(AttendanceLog.id).label("today_count"))
        .join(AttendanceLog, AttendanceLog.student_id == Student.id)
        .filter(Student.grade_level == grade_level)
        .filter(func.date(AttendanceLog.timestamp) == today)
        .filter(Student.room_number.isnot(None))
        .group_by(Student.room_number)
        .all()
    )
    att_map = {r.room_number: r.today_count for r in att_rows}
    return [
        {
            "room_number": r.room_number,
            "student_count": r.student_count,
            "today_attendance": att_map.get(r.room_number, 0),
        }
        for r in rows
    ]


@router.get("/students-detail")
def get_students_detail(
    grade_level: Optional[str] = Query(default=None),
    room_number: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    query = (
        db.query(
            Student.student_id,
            Student.first_name,
            Student.last_name,
            Student.grade_level,
            Student.room_number,
            func.count(AttendanceLog.id).label("total_attendance"),
        )
        .outerjoin(AttendanceLog, AttendanceLog.student_id == Student.id)
        .group_by(Student.id)
    )
    if grade_level:
        query = query.filter(Student.grade_level == grade_level)
    if room_number:
        query = query.filter(Student.room_number == room_number)
    rows = query.order_by(Student.student_id).limit(limit).all()
    return [
        {
            "student_id": r.student_id,
            "full_name": f"{r.first_name} {r.last_name}",
            "grade_level": r.grade_level,
            "room_number": r.room_number,
            "total_attendance": r.total_attendance,
        }
        for r in rows
    ]


@router.get("/student-attendance")
def get_student_attendance(
    student_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="ไม่พบนักเรียน")

    query = (
        db.query(
            AttendanceLog.id,
            AttendanceLog.timestamp,
            AttendanceLog.status,
            func.coalesce(func.length(AttendanceLog.scan_image), 0).label("scan_len"),
            Subject.subject_code,
            Subject.subject_name,
        )
        .join(Subject, Subject.id == AttendanceLog.subject_id)
        .filter(AttendanceLog.student_id == student.id)
    )
    if current_user.role == "teacher":
        query = (
            query.join(TeacherSubject, TeacherSubject.subject_id == Subject.id)
            .filter(TeacherSubject.teacher_id == current_user.id)
        )

    rows = query.order_by(AttendanceLog.timestamp.desc()).all()
    records = [
        {
            "log_id":         r.id,
            "has_scan_image": r.scan_len > 0,
            "date":           str(r.timestamp.date()),
            "time":           r.timestamp.strftime("%H:%M"),
            "status":         r.status,
            "subject_code":   r.subject_code,
            "subject_name":   r.subject_name,
        }
        for r in rows
    ]

    present = sum(1 for r in records if r["status"] == "present")
    late    = sum(1 for r in records if r["status"] == "late")
    absent  = sum(1 for r in records if r["status"] == "absent")

    # ── Attendance trend (นับตั้งแต่วันแรกที่นักเรียนเช็คชื่อ) ──
    semester = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    all_dates = sorted({r["date"] for r in records})
    trend: list[dict] = []

    if all_dates:
        first_day = date.fromisoformat(all_dates[0])
        end_day   = date.today()
        dates_present = set(all_dates)

        present_days = 0
        total_days   = 0
        cur = first_day
        while cur <= end_day:
            total_days += 1
            if str(cur) in dates_present:
                present_days += 1
            trend.append({
                "date":    str(cur),
                "rate":    round(present_days / total_days * 100),
                "present": present_days,
                "total":   total_days,
            })
            cur += timedelta(days=1)

    return {
        "student": {
            "student_id":  student.student_id,
            "full_name":   f"{student.first_name} {student.last_name}",
            "first_name":  student.first_name,
            "last_name":   student.last_name,
            "grade_level": student.grade_level,
            "room_number": student.room_number,
            "has_face":    len(student.face_embedding) > 0,
        },
        "records": records,
        "summary": {
            "total": len(records),
            "present": present,
            "late": late,
            "absent": absent,
        },
        "trend": trend,
        "semester": {
            "name":       semester.name if semester else None,
            "term_start": str(semester.term_start) if semester and semester.term_start else None,
            "term_end":   str(semester.term_end)   if semester and semester.term_end   else None,
        },
    }


@router.get("/semester-stats")
def get_semester_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    """อัตราการเข้าเรียนรายวันตลอดภาคเรียน (สำหรับ Dashboard overview chart)"""
    semester = db.query(SemesterSetting).filter(SemesterSetting.is_active == True).first()
    if not semester or not semester.term_start:
        return {"trend": [], "semester": None, "total_students": 0}

    total_students = db.query(func.count(Student.id)).scalar() or 0
    start_day = semester.term_start
    end_day   = min(semester.term_end or date.today(), date.today())

    daily_rows = (
        db.query(
            func.date(AttendanceLog.timestamp).label("log_date"),
            func.count(distinct(AttendanceLog.student_id)).label("unique_students"),
        )
        .filter(func.date(AttendanceLog.timestamp) >= str(start_day))
        .filter(func.date(AttendanceLog.timestamp) <= str(end_day))
        .group_by(func.date(AttendanceLog.timestamp))
        .all()
    )
    daily_map = {str(r.log_date): r.unique_students for r in daily_rows}

    trend: list[dict] = []
    cur = start_day
    while cur <= end_day:
        day_str = str(cur)
        count   = daily_map.get(day_str, 0)
        trend.append({
            "date":  day_str,
            "count": count,
            "rate":  round(count / total_students * 100) if total_students else 0,
        })
        cur += timedelta(days=1)

    return {
        "semester": {
            "name":       semester.name,
            "term_start": str(semester.term_start),
            "term_end":   str(semester.term_end) if semester.term_end else None,
        },
        "total_students": total_students,
        "trend": trend,
    }


@router.get("/teacher-overview")
def get_teacher_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """KPI + subject summaries สำหรับครู (กรองเฉพาะวิชาที่ตัวเองสอน)"""
    today = str(date.today())
    if current_user.role == "teacher":
        ts_rows = db.query(TeacherSubject).filter_by(teacher_id=current_user.id).all()
        subject_ids = [r.subject_id for r in ts_rows]
    else:
        subject_ids = [r.id for r in db.query(Subject.id).all()]

    if not subject_ids:
        return {"total_subjects": 0, "total_students": 0, "today_logs": 0, "total_logs": 0, "subjects": []}

    total_students = db.query(func.count(distinct(AttendanceLog.student_id))).filter(
        AttendanceLog.subject_id.in_(subject_ids)
    ).scalar() or 0
    today_logs = db.query(func.count(AttendanceLog.id)).filter(
        AttendanceLog.subject_id.in_(subject_ids),
        func.date(AttendanceLog.timestamp) == today,
    ).scalar() or 0
    total_logs = db.query(func.count(AttendanceLog.id)).filter(
        AttendanceLog.subject_id.in_(subject_ids)
    ).scalar() or 0

    subj_rows = (
        db.query(Subject.id, Subject.subject_code, Subject.subject_name, Subject.category,
                 AttendanceLog.status, func.count(AttendanceLog.id).label("cnt"))
        .outerjoin(AttendanceLog, AttendanceLog.subject_id == Subject.id)
        .filter(Subject.id.in_(subject_ids))
        .group_by(Subject.id, Subject.subject_code, Subject.subject_name, Subject.category, AttendanceLog.status)
        .all()
    )
    today_subj = {
        r.subject_id: r.cnt
        for r in db.query(AttendanceLog.subject_id, func.count(AttendanceLog.id).label("cnt"))
        .filter(AttendanceLog.subject_id.in_(subject_ids), func.date(AttendanceLog.timestamp) == today)
        .group_by(AttendanceLog.subject_id).all()
    }

    subj_map = {}
    for r in subj_rows:
        if r.id not in subj_map:
            subj_map[r.id] = {"id": r.id, "subject_code": r.subject_code,
                               "subject_name": r.subject_name, "category": r.category,
                               "present": 0, "late": 0, "absent": 0}
        if r.status:
            subj_map[r.id][r.status] = subj_map[r.id].get(r.status, 0) + (r.cnt or 0)

    subjects = []
    for s in subj_map.values():
        total = s["present"] + s["late"] + s["absent"]
        subjects.append({**s, "total": total,
                         "present_rate": round(s["present"] / total * 100) if total else None,
                         "today_logs": today_subj.get(s["id"], 0)})

    return {"total_subjects": len(subject_ids), "total_students": total_students,
            "today_logs": today_logs, "total_logs": total_logs,
            "subjects": sorted(subjects, key=lambda x: x["subject_code"])}


@router.get("/subject-rooms")
def get_subject_rooms(
    subject_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """ห้องเรียนในวิชานี้พร้อมสถิติการเข้าเรียน"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")
    if current_user.role == "teacher":
        if not db.query(TeacherSubject).filter_by(teacher_id=current_user.id, subject_id=subject_id).first():
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงวิชานี้")

    att_rows = (
        db.query(Student.grade_level, Student.room_number, AttendanceLog.status,
                 func.count(AttendanceLog.id).label("cnt"))
        .join(Student, Student.id == AttendanceLog.student_id)
        .filter(AttendanceLog.subject_id == subject_id,
                Student.grade_level.isnot(None), Student.room_number.isnot(None))
        .group_by(Student.grade_level, Student.room_number, AttendanceLog.status)
        .all()
    )
    student_counts = {
        (r.grade_level, r.room_number): r.cnt
        for r in db.query(Student.grade_level, Student.room_number, func.count(Student.id).label("cnt"))
        .filter(Student.grade_level.isnot(None), Student.room_number.isnot(None))
        .group_by(Student.grade_level, Student.room_number).all()
    }

    room_map = {}
    for r in att_rows:
        key = (r.grade_level, r.room_number)
        if key not in room_map:
            room_map[key] = {"grade_level": r.grade_level, "room_number": r.room_number,
                              "present": 0, "late": 0, "absent": 0}
        room_map[key][r.status] = room_map[key].get(r.status, 0) + r.cnt

    rooms = []
    for (grade, room), d in sorted(room_map.items()):
        total = d["present"] + d["late"] + d["absent"]
        rooms.append({**d, "total_students": student_counts.get((grade, room), 0),
                      "sessions_total": total,
                      "present_rate": round(d["present"] / total * 100) if total else None})

    return {"subject": {"id": subject.id, "subject_code": subject.subject_code,
                         "subject_name": subject.subject_name, "category": subject.category},
            "rooms": rooms}


@router.get("/room-students")
def get_room_students(
    subject_id: int = Query(...),
    grade_level: str = Query(...),
    room_number: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """รายชื่อนักเรียนในห้องพร้อมสถิติวิชานี้"""
    if current_user.role == "teacher":
        if not db.query(TeacherSubject).filter_by(teacher_id=current_user.id, subject_id=subject_id).first():
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์เข้าถึงวิชานี้")

    students = (
        db.query(Student)
        .filter(Student.grade_level == grade_level, Student.room_number == room_number)
        .order_by(Student.student_id).all()
    )
    att_rows = (
        db.query(AttendanceLog.student_id, AttendanceLog.status, func.count(AttendanceLog.id).label("cnt"))
        .join(Student, Student.id == AttendanceLog.student_id)
        .filter(AttendanceLog.subject_id == subject_id,
                Student.grade_level == grade_level, Student.room_number == room_number)
        .group_by(AttendanceLog.student_id, AttendanceLog.status).all()
    )
    att_map = {}
    for r in att_rows:
        if r.student_id not in att_map:
            att_map[r.student_id] = {"present": 0, "late": 0, "absent": 0}
        att_map[r.student_id][r.status] = r.cnt

    result = []
    for s in students:
        a = att_map.get(s.id, {"present": 0, "late": 0, "absent": 0})
        total = a["present"] + a["late"] + a["absent"]
        result.append({
            "student_id": s.student_id,
            "full_name": " ".join(filter(None, [s.title, s.first_name, s.last_name])),
            "present": a["present"], "late": a["late"], "absent": a["absent"],
            "total": total,
            "present_rate": round(a["present"] / total * 100) if total else None,
        })
    return result


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin),
):
    today   = str(datetime.now().date())
    total   = db.query(func.count(Student.id)).scalar()
    present = (
        db.query(func.count(AttendanceLog.id))
        .filter(func.date(AttendanceLog.timestamp) == today)
        .scalar()
    )
    recent = db.query(AttendanceLog).order_by(AttendanceLog.timestamp.desc()).limit(5).all()
    return {
        "total": total,
        "present": present,
        "absent": total - present,
        "recent_logs": [
            {"name": log.student.first_name, "time": log.timestamp.strftime("%H:%M")}
            for log in recent
        ],
    }


@router.get("/subject-attendance")
def get_subject_attendance(
    subject_id: int = Query(...),
    date_from:  Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    date_to:    Optional[str] = Query(default=None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin),
):
    """สรุปการเข้าเรียนรายนักเรียนในวิชาที่กำหนด (gradebook view)"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="ไม่พบรายวิชา")

    if current_user.role == "teacher":
        from app.models.user import TeacherSubject
        assigned = db.query(TeacherSubject).filter_by(
            teacher_id=current_user.id, subject_id=subject_id
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ดูวิชานี้")

    q = (
        db.query(AttendanceLog, Student)
        .join(Student, Student.id == AttendanceLog.student_id)
        .filter(AttendanceLog.subject_id == subject_id)
    )
    if date_from:
        q = q.filter(func.date(AttendanceLog.timestamp) >= date_from)
    if date_to:
        q = q.filter(func.date(AttendanceLog.timestamp) <= date_to)

    rows = q.order_by(AttendanceLog.timestamp).all()

    # Collect unique session dates
    session_dates = sorted({str(log.timestamp.date()) for log, _ in rows})

    # Aggregate per student
    from collections import defaultdict
    student_map: dict[int, dict] = {}
    date_status: dict[int, dict[str, str]] = defaultdict(dict)

    for log, student in rows:
        sid = student.id
        if sid not in student_map:
            student_map[sid] = {
                "student_id":  student.student_id,
                "name":        f"{student.title + ' ' if student.title else ''}{student.first_name} {student.last_name}",
                "grade_level": student.grade_level,
                "room_number": student.room_number,
                "present": 0, "late": 0, "absent": 0,
            }
        student_map[sid][log.status] = student_map[sid].get(log.status, 0) + 1
        date_status[sid][str(log.timestamp.date())] = log.status

    result = []
    for sid, info in student_map.items():
        total = info["present"] + info["late"] + info["absent"]
        rate  = round((info["present"] + info["late"]) / total * 100) if total else 0
        result.append({
            **info,
            "total":       total,
            "rate":        rate,
            "date_status": date_status[sid],
        })

    result.sort(key=lambda x: (x["grade_level"] or "", x["room_number"] or "", x["student_id"]))

    return {
        "subject": {
            "id":           subject.id,
            "subject_code": subject.subject_code,
            "subject_name": subject.subject_name,
            "teacher_name": subject.teacher_name,
        },
        "session_dates": session_dates,
        "students":      result,
    }