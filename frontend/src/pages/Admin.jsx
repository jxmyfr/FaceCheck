import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useDialog } from '../hooks/useDialog'

const API = import.meta.env.VITE_API_URL

const SUBJECT_CATEGORIES = [
  'ภาษาไทย',
  'คณิตศาสตร์',
  'วิทยาศาสตร์และเทคโนโลยี',
  'สังคมศึกษา ศาสนาและวัฒนธรรม',
  'สุขศึกษาและพลศึกษา',
  'ศิลปะ',
  'การงานอาชีพ',
  'ภาษาต่างประเทศ',
  'กิจกรรมพัฒนาผู้เรียน',
]

const PERIODS = [
  { label: 'คาบ 1  (08:30–09:20)', start: '08:30', end: '09:20' },
  { label: 'คาบ 2  (09:20–10:10)', start: '09:20', end: '10:10' },
  { label: 'คาบ 3  (10:20–11:10)', start: '10:20', end: '11:10' },
  { label: 'คาบ 4  (11:10–12:00)', start: '11:10', end: '12:00' },
  { label: 'คาบ 5  (13:00–13:50)', start: '13:00', end: '13:50' },
  { label: 'คาบ 6  (13:50–14:40)', start: '13:50', end: '14:40' },
  { label: 'คาบ 7  (14:40–15:30)', start: '14:40', end: '15:30' },
]
const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ']

const periodLabel = (start, end) => {
  const p = PERIODS.find(p => p.start === start && p.end === end)
  return p ? p.label : `${start}–${end}`
}

const STATUS_MAP = {
  present:         { label: 'มาเรียน',  color: 'var(--fc-success)', bg: 'rgba(16,185,129,0.1)' },
  late:            { label: 'สาย',      color: 'var(--fc-warning)', bg: 'rgba(245,158,11,0.1)' },
  absent:          { label: 'ขาด',     color: 'var(--fc-danger)',  bg: 'rgba(239,68,68,0.1)' },
  excused:         { label: 'ลา',      color: '#7c3aed',           bg: 'rgba(124,58,237,0.1)' },
  already_checked: { label: 'สแกนซ้ำ', color: '#0891b2',           bg: 'rgba(8,145,178,0.08)' },
}

function StatusBadge({ status, reason, logId, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [excuseMode, setExcuseMode] = useState(false)
  const [excuseReason, setExcuseReason] = useState('')
  const s = STATUS_MAP[status]

  const handleSelect = (v) => {
    if (v === 'excused') { setExcuseMode(true); setExcuseReason('') }
    else { onUpdate(logId, v); setOpen(false) }
  }

  const confirmExcuse = () => {
    onUpdate(logId, 'excused', excuseReason)
    setOpen(false); setExcuseMode(false)
  }

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <div>
        <span
          onClick={e=>{e.stopPropagation();setOpen(o=>!o);setExcuseMode(false)}}
          style={{
            fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,cursor:'pointer',
            background: s?.bg || 'var(--fc-muted)',
            color: s?.color || 'var(--fc-text-3)',
          }}
        >{s?.label || '—'}</span>
        {status === 'excused' && reason && (
          <span style={{fontSize:10,color:'#7c3aed',marginLeft:4,fontStyle:'italic'}}>{reason}</span>
        )}
      </div>
      {open && (
        <div
          style={{position:'absolute',top:'110%',left:0,zIndex:50,background:'#ffffff',border:'1px solid var(--fc-border)',borderRadius:8,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',padding:4,minWidth:130}}
          onClick={e=>e.stopPropagation()}
        >
          {!excuseMode ? (
            Object.entries(STATUS_MAP).map(([v,{label,color}])=>(
              <button key={v}
                onClick={()=>handleSelect(v)}
                style={{display:'block',width:'100%',textAlign:'left',padding:'6px 10px',fontSize:12,color,fontWeight:600,background:'none',border:'none',cursor:'pointer',borderRadius:6}}
              >{label}</button>
            ))
          ) : (
            <div style={{padding:'8px 10px',minWidth:180}}>
              <div style={{fontSize:11,color:'var(--fc-text-3)',marginBottom:6}}>ระบุเหตุผลการลา</div>
              <input
                autoFocus
                value={excuseReason}
                onChange={e=>setExcuseReason(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') confirmExcuse() }}
                placeholder="เช่น ป่วย, ธุระสำคัญ"
                style={{width:'100%',fontSize:12,padding:'4px 8px',borderRadius:6,border:'1px solid var(--fc-border)',boxSizing:'border-box'}}
              />
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={()=>setExcuseMode(false)}
                  style={{flex:1,padding:'4px 0',fontSize:11,borderRadius:6,border:'1px solid var(--fc-border)',background:'none',cursor:'pointer'}}>
                  ยกเลิก
                </button>
                <button onClick={confirmExcuse}
                  style={{flex:1,padding:'4px 0',fontSize:11,borderRadius:6,border:'none',background:'#7c3aed',color:'#fff',cursor:'pointer',fontWeight:600}}>
                  ยืนยัน
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SchedForm({ sched, setSched, onAdd, gradeRooms = {}, requireTeacher = false }) {
  const grades = Object.keys(gradeRooms).sort()
  const rooms  = sched.grade_level ? (gradeRooms[sched.grade_level] || []) : []

  const setGrade = (g) => setSched(s => ({ ...s, grade_level: g, room_number: '' }))

  if (requireTeacher) return (
    <div style={{padding:'10px 14px',borderRadius:8,background:'var(--fc-muted)',fontSize:12,color:'var(--fc-text-4)'}}>
      เลือกครูผู้สอนก่อนเพื่อเพิ่มตารางสอน
    </div>
  )

  return (
    <div className="schedule-form-grid">
      <div>
        <label className="form-label">วัน</label>
        <select value={sched.day_of_week} onChange={e=>setSched(s=>({...s,day_of_week:e.target.value}))}>
          {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">คาบ</label>
        <select value={sched.period} onChange={e=>setSched(s=>({...s,period:e.target.value}))}>
          {PERIODS.map((p,i)=><option key={i} value={i}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">ชั้น</label>
        <select value={sched.grade_level} onChange={e=>setGrade(e.target.value)}>
          <option value="">-- เลือก --</option>
          {grades.map(g=><option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div>
        <label className="form-label">ห้อง</label>
        <select value={sched.room_number} onChange={e=>setSched(s=>({...s,room_number:e.target.value}))} disabled={!sched.grade_level}>
          <option value="">-- เลือก --</option>
          {rooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-sm" onClick={onAdd} style={{marginBottom:1}}>+ เพิ่ม</button>
    </div>
  )
}

function Modal({ title, onClose, children, maxWidth }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 className="modal-title" style={{margin:0}}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="ปิด" style={{fontSize:16}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { dialog, confirm, alert } = useDialog()
  const [users, setUsers]         = useState([])
  const [subjects, setSubjects]   = useState([])
  const [gradeRooms, setGradeRooms] = useState({}) // { 'ม.5': ['1','2','3'], ... }
  const [tab, setTab]             = useState('users')
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)

  const [semester, setSemester]     = useState({ name: '', academic_year: '', semester_number: 1, term_start: '', term_end: '', face_threshold: 1.0 })
  const [semSaving, setSemSaving]   = useState(false)
  const [semesters, setSemesters]   = useState([])
  const [showNewSem, setShowNewSem] = useState(false)
  const [newSemForm, setNewSemForm] = useState({ name: '', academic_year: '', semester_number: 1, term_start: '', term_end: '' })
  const [newSemSaving, setNewSemSaving] = useState(false)

  const [holidays, setHolidays]     = useState([])
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
  const [holidayLoading, setHolidayLoading] = useState(false)
  const [holidaySyncing, setHolidaySyncing] = useState(false)
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '', type: 'school' })
  const [holidayAdding, setHolidayAdding] = useState(false)

  // Audit log state
  const [auditLogs, setAuditLogs]     = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTotal, setAuditTotal]   = useState(0)
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditFilter, setAuditFilter] = useState({ date_from: '', date_to: '', action: '', student_id: '' })
  const AUDIT_LIMIT = 50

  const loadAuditLogs = async (offset = 0, filter = auditFilter) => {
    setAuditLoading(true)
    try {
      const p = new URLSearchParams({ limit: AUDIT_LIMIT, offset })
      if (filter.date_from)  p.append('date_from',  filter.date_from)
      if (filter.date_to)    p.append('date_to',    filter.date_to)
      if (filter.action)     p.append('action',     filter.action)
      if (filter.student_id) p.append('student_id', filter.student_id)
      const res = await axios.get(`${API}/audit/logs?${p}`)
      setAuditLogs(res.data.logs || [])
      setAuditTotal(res.data.total || 0)
      setAuditOffset(offset)
    } catch {}
    finally { setAuditLoading(false) }
  }

  // Attendance log state
  const [logs, setLogs]             = useState([])
  const [logDate, setLogDate]       = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })
  const [logSubject, setLogSubject] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [logDetail, setLogDetail]   = useState(null)   // selected log for detail modal
  const [logPhoto, setLogPhoto]     = useState(null)   // blob URL for scan image
  const [showDupScans, setShowDupScans] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const LOG_PAGE_SIZE = 25
  const [selectedLogs, setSelectedLogs] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [showUser, setShowUser]     = useState(false)
  const [newUser, setNewUser]       = useState({email:'',username:'',password:'',full_name:'',role:'teacher',categories:[]})
  const [showSubject, setShowSubject] = useState(false)
  const [newSub, setNewSub]         = useState({subject_code:'',subject_name:'',teacher_name:'',description:'',category:'', schedules:[]})
  const [subDetail, setSubDetail]   = useState(null)
  const [subEditing, setSubEditing] = useState(false)
  const [subForm, setSubForm]       = useState({subject_code:'',subject_name:'',teacher_name:'',description:'',category:''})
  const [newSched, setNewSched]     = useState({day_of_week:'จ', period:'0', grade_level:'', room_number:''})
  const [subFilter, setSubFilter]     = useState({ q: '', teacher: '', grade: '', category: '' })
  const [assignModal, setAssignModal] = useState(null)
  const [teacherSubs, setTeacherSubs] = useState([])
  const [assignId, setAssignId]     = useState('')
  const [teacherDetail, setTeacherDetail]       = useState(null)
  const [teacherSubjectIds, setTeacherSubjectIds] = useState(new Set())
  const [teacherEdit, setTeacherEdit] = useState(false)
  const [teacherForm, setTeacherForm] = useState({})
  const [teacherSaving, setTeacherSaving] = useState(false)

  const flash = (text, type='success') => {
    setToast({text,type})
    setTimeout(()=>setToast(null), 3000)
  }

  const saveTeacher = async () => {
    setTeacherSaving(true)
    try {
      const body = {
        full_name: teacherForm.full_name,
        email: teacherForm.email,
        username: teacherForm.username || null,
        role: teacherForm.role,
        categories: teacherForm.categories || [],
      }
      if (teacherForm.new_password) body.new_password = teacherForm.new_password
      const res = await axios.patch(`${API}/auth/users/${teacherDetail.id}`, body, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      })
      setTeacherDetail(prev => ({ ...prev, ...res.data }))
      setUsers(prev => prev.map(u => u.id === teacherDetail.id ? { ...u, ...res.data } : u))
      setTeacherEdit(false)
      flash('บันทึกข้อมูลสำเร็จ')
    } catch (e) {
      flash(e.response?.data?.detail || 'บันทึกไม่สำเร็จ', 'error')
    } finally {
      setTeacherSaving(false)
    }
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [u, s, sem, sems] = await Promise.all([
        axios.get(`${API}/auth/users`).then(r=>r.data),
        axios.get(`${API}/attendance/subjects`).then(async r => {
          return Promise.all(r.data.map(s => axios.get(`${API}/attendance/subjects/${s.id}`).then(d=>d.data)))
        }),
        axios.get(`${API}/settings/semester`).then(r=>r.data).catch(()=>null),
        axios.get(`${API}/settings/semesters`).then(r=>r.data).catch(()=>[]),
      ])
      setUsers(u); setSubjects(s); setSemesters(sems)
      if (sem) setSemester({ name: sem.name||'', academic_year: sem.academic_year||'', semester_number: sem.semester_number||1, term_start: sem.term_start||'', term_end: sem.term_end||'', face_threshold: sem.face_threshold ?? 1.0 })
      // build grade→rooms map from student list
      const students = await axios.get(`${API}/enroll/students`).then(r=>r.data).catch(()=>[])
      const gr = {}
      students.forEach(st => {
        if (!st.grade_level) return
        if (!gr[st.grade_level]) gr[st.grade_level] = new Set()
        if (st.room_number) gr[st.grade_level].add(st.room_number)
      })
      setGradeRooms(Object.fromEntries(Object.entries(gr).map(([g,rs])=>[g,[...rs].sort((a,b)=>Number(a)-Number(b))])))
    } finally { setLoading(false) }
  }

  const saveSemester = async () => {
    setSemSaving(true)
    try {
      await axios.put(`${API}/settings/semester`, {
        name:            semester.name            || undefined,
        academic_year:   semester.academic_year   || undefined,
        semester_number: semester.semester_number || undefined,
        term_start:      semester.term_start      || undefined,
        term_end:        semester.term_end        || undefined,
        face_threshold:  semester.face_threshold,
      })
      flash('บันทึกข้อมูลภาคเรียนสำเร็จ')
      const sems = await axios.get(`${API}/settings/semesters`).then(r=>r.data).catch(()=>[])
      setSemesters(sems)
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
    finally { setSemSaving(false) }
  }

  const createNewSemester = async () => {
    if (!newSemForm.name.trim()) { flash('กรุณากรอกชื่อภาคเรียน', 'error'); return }
    setNewSemSaving(true)
    try {
      await axios.post(`${API}/settings/semester/new`, {
        name:            newSemForm.name,
        academic_year:   newSemForm.academic_year   || undefined,
        semester_number: newSemForm.semester_number || 1,
        term_start:      newSemForm.term_start       || undefined,
        term_end:        newSemForm.term_end         || undefined,
      })
      flash('เริ่มภาคเรียนใหม่สำเร็จ')
      setShowNewSem(false)
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
    finally { setNewSemSaving(false) }
  }

  const loadHolidays = async (year = holidayYear) => {
    setHolidayLoading(true)
    try {
      const res = await axios.get(`${API}/holidays/?year=${year}`)
      setHolidays(res.data)
    } catch {}
    finally { setHolidayLoading(false) }
  }

  const syncHolidays = async () => {
    setHolidaySyncing(true)
    try {
      const res = await axios.post(`${API}/holidays/sync/${holidayYear}`)
      flash(`ซิงค์วันหยุดราชการ ${res.data.year} สำเร็จ · เพิ่มใหม่ ${res.data.added} วัน`)
      loadHolidays(holidayYear)
    } catch (e) { flash(e.response?.data?.detail||'ซิงค์ไม่สำเร็จ','error') }
    finally { setHolidaySyncing(false) }
  }

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name.trim()) { flash('กรุณากรอกวันที่และชื่อวันหยุด','error'); return }
    setHolidayAdding(true)
    try {
      await axios.post(`${API}/holidays/`, newHoliday)
      flash('เพิ่มวันหยุดสำเร็จ')
      setNewHoliday({ date: '', name: '', type: 'school' })
      loadHolidays(holidayYear)
    } catch (e) { flash(e.response?.data?.detail||'เพิ่มวันหยุดไม่สำเร็จ','error') }
    finally { setHolidayAdding(false) }
  }

  const deleteHoliday = async (id) => {
    try {
      await axios.delete(`${API}/holidays/${id}`)
      setHolidays(prev => prev.filter(h => h.id !== id))
      flash('ลบวันหยุดสำเร็จ')
    } catch (e) { flash(e.response?.data?.detail||'ลบไม่สำเร็จ','error') }
  }

  const deleteUser = async (id) => {
    if (!await confirm('ลบบัญชีนี้ถาวร? ไม่สามารถกู้คืนได้', { title: 'ลบบัญชี', danger: true })) return
    try {
      await axios.delete(`${API}/auth/users/${id}`)
      flash('ลบบัญชีสำเร็จ')
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return }
    loadAll()
  }, [])

  const createUser = async () => {
    try {
      await axios.post(`${API}/auth/register`, newUser)
      flash('สร้างบัญชีสำเร็จ')
      setShowUser(false)
      setNewUser({email:'',password:'',full_name:'',role:'teacher'})
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const toggleUser = async (id) => {
    await axios.patch(`${API}/auth/users/${id}/toggle`)
    loadAll()
  }

  const openAssign = async (teacher) => {
    let assigned = []
    try {
      const res = await axios.get(`${API}/auth/users/${teacher.id}/subjects`)
      assigned = res.data.map(s=>s.id)
      setTeacherSubs(assigned)
    } catch { setTeacherSubs([]) }
    const teacherCats = teacher.categories || []
    const avail = subjects.filter(s => {
      if (assigned.includes(s.id)) return false
      if (teacherCats.length === 0) return true
      if (!s.category) return true
      return teacherCats.includes(s.category)
    })
    setAssignId(avail[0]?.id ? String(avail[0].id) : '')
    setAssignModal(teacher)
  }

  const assign = async () => {
    try {
      await axios.post(`${API}/auth/users/${assignModal.id}/assign-subject/${assignId}`)
      flash('มอบหมายวิชาสำเร็จ')
      setTeacherSubs(p=>[...p,Number(assignId)])
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const unassign = async (subId) => {
    await axios.delete(`${API}/auth/users/${assignModal.id}/assign-subject/${subId}`)
    setTeacherSubs(p=>p.filter(x=>x!==subId))
    flash('ถอนวิชาสำเร็จ')
  }

  const createSub = async () => {
    if (!newSub.subject_code.trim()) { flash('กรุณากรอกรหัสวิชา', 'error'); return }
    if (!newSub.subject_name.trim()) { flash('กรุณากรอกชื่อวิชา', 'error'); return }
    if (newSub.schedules.length === 0) { flash('กรุณาเพิ่มตารางสอนอย่างน้อย 1 คาบ', 'error'); return }
    try {
      const p = new URLSearchParams({ subject_code: newSub.subject_code, subject_name: newSub.subject_name })
      const res = await axios.post(`${API}/attendance/subjects?${p}`)
      const id = res.data.id
      if (newSub.teacher_name || newSub.description || newSub.category) {
        const p2 = new URLSearchParams({ subject_code: newSub.subject_code, subject_name: newSub.subject_name, teacher_name: newSub.teacher_name, description: newSub.description, category: newSub.category })
        await axios.put(`${API}/attendance/subjects/${id}?${p2}`)
      }
      for (const sc of newSub.schedules) {
        const period = PERIODS[Number(sc.period)]
        const p3 = new URLSearchParams({ day_of_week: sc.day_of_week, time_start: period.start, time_end: period.end, grade_level: sc.grade_level, room_number: sc.room_number })
        await axios.post(`${API}/attendance/subjects/${id}/schedules?${p3}`)
      }
      // auto-assign to teacher if selected
      if (newSub.teacher_name) {
        const teacher = teachers.find(t => t.full_name === newSub.teacher_name)
        if (teacher) {
          try { await axios.post(`${API}/auth/users/${teacher.id}/assign-subject/${id}`) } catch {}
        }
      }
      flash('เพิ่มวิชาสำเร็จ')
      setShowSubject(false)
      setNewSub({subject_code:'',subject_name:'',teacher_name:'',description:'',category:'',schedules:[]})
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const loadLogs = async (date = logDate, subject = logSubject) => {
    setLogLoading(true); setLogPage(1); setSelectedLogs(new Set())
    try {
      const params = new URLSearchParams({ log_date: date })
      if (subject) params.append('subject_id', subject)
      const res = await axios.get(`${API}/attendance/logs?${params}`)
      setLogs(res.data)
    } catch { flash('โหลด log ไม่สำเร็จ', 'error') }
    finally { setLogLoading(false) }
  }

  const openLogDetail = async (log) => {
    setLogDetail(log)
    setLogPhoto(null)
    try {
      const res = await axios.get(`${API}/attendance/logs/${log.log_id}/image`, { responseType: 'blob' })
      setLogPhoto(URL.createObjectURL(res.data))
    } catch { /* ไม่มีรูป */ }
  }

  const closeLogDetail = () => {
    if (logPhoto) URL.revokeObjectURL(logPhoto)
    setLogDetail(null)
    setLogPhoto(null)
  }

  const deleteLog = async (logId) => {
    if (!await confirm('ยืนยันการยกเลิกการเช็คชื่อนี้?', { title: 'ยกเลิกการเช็คชื่อ', danger: true })) return
    try {
      await axios.delete(`${API}/attendance/logs/${logId}`)
      setLogs(prev => prev.filter(l => l.log_id !== logId))
      setSelectedLogs(prev => { const n = new Set(prev); n.delete(logId); return n })
      flash('ยกเลิกการเช็คชื่อสำเร็จ')
    } catch (e) { flash(e.response?.data?.detail || 'เกิดข้อผิดพลาด', 'error') }
  }

  const bulkDeleteLogs = async () => {
    if (selectedLogs.size === 0) return
    if (!await confirm(`ยืนยันการยกเลิกการเช็คชื่อ ${selectedLogs.size} รายการ?`, { title: 'ยกเลิกหลายรายการ', danger: true })) return
    setBulkDeleting(true)
    try {
      const ids = [...selectedLogs].join(',')
      const res = await axios.delete(`${API}/attendance/logs/bulk?ids=${ids}`)
      setLogs(prev => prev.filter(l => !selectedLogs.has(l.log_id)))
      setSelectedLogs(new Set())
      flash(`ยกเลิกสำเร็จ ${res.data.deleted} รายการ`)
    } catch (e) {
      const d = e.response?.data?.detail
      flash(typeof d === 'string' ? d : 'เกิดข้อผิดพลาด', 'error')
    }
    finally { setBulkDeleting(false) }
  }

  const updateLogStatus = async (logId, status, reason = '') => {
    try {
      const params = new URLSearchParams({ status })
      if (status === 'excused' && reason) params.append('reason', reason)
      await axios.patch(`${API}/attendance/logs/${logId}?${params}`)
      const newReason = status === 'excused' ? reason : null
      setLogs(prev => prev.map(l => l.log_id === logId ? { ...l, status, reason: newReason } : l))
      if (logDetail?.log_id === logId) setLogDetail(d => ({ ...d, status, reason: newReason }))
      flash('อัปเดตสถานะสำเร็จ')
    } catch (e) { flash(e.response?.data?.detail || 'อัปเดตไม่สำเร็จ', 'error') }
  }

  const deleteSub = async (id) => {
    if (!await confirm('ลบวิชาจะลบประวัติเช็คชื่อที่เกี่ยวข้องด้วย ยืนยัน?', { title: 'ลบรายวิชา', danger: true })) return
    try {
      await axios.delete(`${API}/attendance/subjects/${id}`)
      flash('ลบวิชาสำเร็จ'); loadAll()
    } catch (e) { flash(e.response?.data?.detail || 'ลบวิชาไม่สำเร็จ', 'error') }
  }

  const openSubDetail = async (s) => {
    try {
      const res = await axios.get(`${API}/attendance/subjects/${s.id}`)
      setSubDetail(res.data)
      setSubForm({ subject_code: res.data.subject_code, subject_name: res.data.subject_name, teacher_name: res.data.teacher_name || '', description: res.data.description || '', category: res.data.category || '' })
      setSubEditing(false)
    } catch { flash('โหลดข้อมูลวิชาไม่สำเร็จ', 'error') }
  }

  const saveSubDetail = async () => {
    try {
      const p = new URLSearchParams(subForm)
      const res = await axios.put(`${API}/attendance/subjects/${subDetail.id}?${p}`)
      setSubDetail(res.data)
      setSubEditing(false)
      flash('บันทึกสำเร็จ')
      loadAll()
    } catch (e) { flash(e.response?.data?.detail || 'บันทึกไม่สำเร็จ', 'error') }
  }

  const addSchedule = async () => {
    if (!newSched.grade_level) { flash('กรุณาเลือกชั้น', 'error'); return }
    if (!newSched.room_number) { flash('กรุณาเลือกห้อง', 'error'); return }
    const period = PERIODS[Number(newSched.period)]
    if (subDetail.teacher_name) {
      const conflict = subjects.find(s =>
        s.id !== subDetail.id &&
        s.teacher_name === subDetail.teacher_name &&
        s.schedules?.some(sc =>
          sc.day_of_week === newSched.day_of_week &&
          sc.time_start === period.start &&
          sc.time_end === period.end
        )
      )
      if (conflict) {
        flash(`ครู${subDetail.teacher_name} มีคาบนี้แล้ว (${conflict.subject_name})`, 'error')
        return
      }
    }
    try {
      const p = new URLSearchParams({ day_of_week: newSched.day_of_week, time_start: period.start, time_end: period.end, grade_level: newSched.grade_level, room_number: newSched.room_number })
      const res = await axios.post(`${API}/attendance/subjects/${subDetail.id}/schedules?${p}`)
      setSubDetail(prev => ({ ...prev, schedules: [...prev.schedules, res.data] }))
      setNewSched(s => ({ ...s, grade_level: '', room_number: '' }))
    } catch (e) { flash(e.response?.data?.detail || 'เพิ่มไม่สำเร็จ', 'error') }
  }

  const removeSchedule = async (schedId) => {
    try {
      await axios.delete(`${API}/attendance/subjects/schedules/${schedId}`)
      setSubDetail(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== schedId) }))
    } catch { flash('ลบไม่สำเร็จ', 'error') }
  }

  const teachers = users.filter(u => u.role === 'teacher')
  const superadminId = users.filter(u => u.role === 'admin').reduce((min, u) => u.id < min ? u.id : min, Infinity)

  const teachersForCategory = (category) => {
    if (!category) return []
    return teachers.filter(t => (t.categories||[]).includes(category))
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:320,flexDirection:'column',gap:12}}>
      <div className="spinner"/>
      <p style={{fontSize:13,color:'var(--fc-text-4)'}}>กำลังโหลด...</p>
    </div>
  )

  const availSubs = subjects.filter(s => {
    if (teacherSubs.includes(s.id)) return false
    if (!assignModal) return true
    const teacherCats = assignModal.categories || []
    if (teacherCats.length === 0) return true   // ครูไม่ได้กำหนดหมวด → แสดงทุกวิชา
    if (!s.category) return true                // วิชาไม่มีหมวด → แสดงได้ทุกครู
    return teacherCats.includes(s.category)
  })

  return (
    <main id="main-content" className="page">
      {dialog}
      {toast && (
        <div className={`toast ${toast.type==='success'?'toast-success':'toast-error'}`}>{toast.text}</div>
      )}

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Admin Panel</h1>
        <p className="page-sub">จัดการบัญชีครูและรายวิชา</p>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{marginBottom:20}}>
        <button className={`tab-item ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>
          ครูและผู้ดูแล ({users.length})
        </button>
        <button className={`tab-item ${tab==='subjects'?'active':''}`} onClick={()=>setTab('subjects')}>
          รายวิชา ({subjects.length})
        </button>
        <button className={`tab-item ${tab==='logs'?'active':''}`} onClick={()=>{ setTab('logs'); loadLogs() }}>
          บันทึกการเช็คชื่อ
        </button>
        <button className={`tab-item ${tab==='semester'?'active':''}`} onClick={()=>setTab('semester')}>
          ภาคเรียน
        </button>
        <button className={`tab-item ${tab==='holidays'?'active':''}`} onClick={()=>{ setTab('holidays'); loadHolidays(holidayYear) }}>
          วันหยุด
        </button>
        <button className={`tab-item ${tab==='audit'?'active':''}`} onClick={()=>{ setTab('audit'); loadAuditLogs(0) }}>
          Audit Log
        </button>
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
            <span style={{fontSize:14,fontWeight:600,color:'var(--fc-text)'}}>บัญชีผู้ใช้ทั้งหมด</span>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowUser(true)}>+ เพิ่มบัญชี</button>
          </div>

          {/* Desktop table */}
          <div className="admin-users-table-wrap" style={{overflowX:'auto'}}>
            <table className="tbl">
              <thead><tr>
                <th style={{width:'22%'}}>ชื่อ</th>
                <th style={{width:'26%'}}>Email</th>
                <th style={{width:'10%'}}>Role</th>
                <th style={{width:'10%'}}>สถานะ</th>
                <th style={{width:'32%',textAlign:'right',paddingRight:20}}>การจัดการ</th>
              </tr></thead>
              <tbody>
                {users.map(u=>(
                  <tr key={u.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'var(--fc-primary-light)',color:'var(--fc-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                          {u.full_name?.[0]}
                        </div>
                        <span style={{fontWeight:600,color:'var(--fc-text)',fontSize:13}}>{u.full_name}</span>
                      </div>
                    </td>
                    <td style={{color:'var(--fc-text-3)',fontSize:13}}>{u.email}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <span className="chip" style={u.role==='admin'
                          ? {background:'rgba(124,58,237,0.1)',color:'var(--fc-secondary)'}
                          : {background:'var(--fc-primary-light)',color:'var(--fc-primary)'}
                        }>{u.role}</span>
                        {u.id === superadminId && (
                          <span className="chip" style={{background:'rgba(245,158,11,0.12)',color:'var(--fc-warning)',fontSize:10}}>หลัก</span>
                        )}
                        {u.id === user?.id && (
                          <span className="chip" style={{background:'var(--fc-muted)',color:'var(--fc-text-4)',fontSize:10}}>คุณ</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span className={u.is_active?'dot-on':'dot-off'}/>
                        <span style={{fontSize:12,color:'var(--fc-text-3)'}}>{u.is_active?'ใช้งาน':'ระงับ'}</span>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const isSelf = u.id === user?.id
                        const isSuperadmin = u.id === superadminId
                        const canManage = !isSelf && !(isSuperadmin && user?.id !== superadminId)
                        if (!canManage) return (
                          <div style={{textAlign:'right',paddingRight:4,fontSize:12,color:'var(--fc-text-4)'}}>
                            {isSelf ? 'บัญชีของคุณ' : 'ผู้ดูแลหลัก'}
                          </div>
                        )
                        return (
                          <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                            {u.role==='teacher' && <>
                              <button className="btn btn-ghost btn-sm" onClick={async ()=>{
                                setTeacherDetail(u)
                                setTeacherEdit(false)
                                setTeacherForm({full_name:u.full_name,email:u.email,username:u.username||'',role:u.role,new_password:'',categories:u.categories||[]})
                                try {
                                  const res = await axios.get(`${API}/auth/users/${u.id}/subjects`)
                                  setTeacherSubjectIds(new Set(res.data.map(s => s.id)))
                                } catch { setTeacherSubjectIds(new Set()) }
                              }}>ดูข้อมูล</button>
                              <button className="btn btn-ghost btn-sm" onClick={()=>openAssign(u)}>มอบหมายวิชา</button>
                            </>}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{color: u.is_active ? 'var(--fc-warning)' : 'var(--fc-success-dark)'}}
                              onClick={()=>toggleUser(u.id)}
                            >{u.is_active?'ระงับ':'เปิดใช้'}</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>deleteUser(u.id)}>ลบ</button>
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="admin-users-cards-wrap">
            {users.map(u => {
              const isSelf = u.id === user?.id
              const isSuperadmin = u.id === superadminId
              const canManage = !isSelf && !(isSuperadmin && user?.id !== superadminId)
              return (
                <div key={u.id} className="admin-user-card">
                  <div className="admin-user-card-top">
                    <div className="admin-user-card-avatar">{u.full_name?.[0]}</div>
                    <span className="admin-user-card-name">{u.full_name}</span>
                    <div style={{display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                      <span className={u.is_active?'dot-on':'dot-off'}/>
                      <span style={{fontSize:11,color:'var(--fc-text-3)'}}>{u.is_active?'ใช้งาน':'ระงับ'}</span>
                    </div>
                  </div>
                  <div className="admin-user-card-email">{u.email}</div>
                  <div className="admin-user-card-meta">
                    <span className="chip" style={u.role==='admin'
                      ? {background:'rgba(124,58,237,0.1)',color:'var(--fc-secondary)'}
                      : {background:'var(--fc-primary-light)',color:'var(--fc-primary)'}
                    }>{u.role}</span>
                    {u.id === superadminId && (
                      <span className="chip" style={{background:'rgba(245,158,11,0.12)',color:'var(--fc-warning)',fontSize:10}}>หลัก</span>
                    )}
                    {u.id === user?.id && (
                      <span className="chip" style={{background:'var(--fc-muted)',color:'var(--fc-text-4)',fontSize:10}}>คุณ</span>
                    )}
                  </div>
                  <div className="admin-user-card-actions">
                    {canManage ? <>
                      {u.role==='teacher' && <>
                        <button className="btn btn-ghost btn-sm" onClick={async ()=>{
                          setTeacherDetail(u)
                          setTeacherEdit(false)
                          setTeacherForm({full_name:u.full_name,email:u.email,username:u.username||'',role:u.role,new_password:'',categories:u.categories||[]})
                          try {
                            const res = await axios.get(`${API}/auth/users/${u.id}/subjects`)
                            setTeacherSubjectIds(new Set(res.data.map(s => s.id)))
                          } catch { setTeacherSubjectIds(new Set()) }
                        }}>ดูข้อมูล</button>
                        <button className="btn btn-ghost btn-sm" onClick={()=>openAssign(u)}>มอบหมายวิชา</button>
                      </>}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{color: u.is_active ? 'var(--fc-warning)' : 'var(--fc-success-dark)'}}
                        onClick={()=>toggleUser(u.id)}
                      >{u.is_active?'ระงับ':'เปิดใช้'}</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>deleteUser(u.id)}>ลบ</button>
                    </> : (
                      <span style={{fontSize:12,color:'var(--fc-text-4)'}}>{isSelf ? 'บัญชีของคุณ' : 'ผู้ดูแลหลัก'}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Subjects tab */}
      {tab === 'subjects' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {/* Header + filter bar */}
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--fc-border)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:600,color:'var(--fc-text)'}}>
                รายวิชาทั้งหมด
                {(() => {
                  const q = subFilter.q.toLowerCase()
                  const count = subjects.filter(s =>
                    (!q || s.subject_code.toLowerCase().includes(q) || s.subject_name.toLowerCase().includes(q)) &&
                    (!subFilter.teacher || s.teacher_name === subFilter.teacher) &&
                    (!subFilter.grade || s.schedules?.some(sc => sc.grade_level === subFilter.grade)) &&
                    (!subFilter.category || s.category === subFilter.category)
                  ).length
                  return subjects.length !== count
                    ? <span style={{fontWeight:400,color:'var(--fc-text-4)',marginLeft:6}}>({count}/{subjects.length})</span>
                    : <span style={{fontWeight:400,color:'var(--fc-text-4)',marginLeft:6}}>({subjects.length})</span>
                })()}
              </span>
              <button className="btn btn-primary btn-sm" onClick={()=>setShowSubject(true)}>+ เพิ่มวิชา</button>
            </div>
            {/* Filters */}
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
              <input
                placeholder="ค้นหารหัสหรือชื่อวิชา..."
                value={subFilter.q}
                onChange={e=>setSubFilter(f=>({...f,q:e.target.value}))}
                style={{flex:'1 1 180px',minWidth:0}}
              />
              <select
                value={subFilter.category}
                onChange={e=>setSubFilter(f=>({...f,category:e.target.value}))}
                style={{flex:'0 1 200px'}}
              >
                <option value="">ทุกหมวดวิชา</option>
                {SUBJECT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={subFilter.teacher}
                onChange={e=>setSubFilter(f=>({...f,teacher:e.target.value}))}
                style={{flex:'0 1 170px'}}
              >
                <option value="">ครูทั้งหมด</option>
                {[...new Set(subjects.map(s=>s.teacher_name).filter(Boolean))].sort().map(t=>(
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={subFilter.grade}
                onChange={e=>setSubFilter(f=>({...f,grade:e.target.value}))}
                style={{flex:'0 1 130px'}}
              >
                <option value="">ทุกชั้น</option>
                {[...new Set(subjects.flatMap(s=>s.schedules?.map(sc=>sc.grade_level)||[]).filter(Boolean))].sort().map(g=>(
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {(subFilter.q || subFilter.teacher || subFilter.grade || subFilter.category) && (
                <button className="btn btn-ghost btn-sm" onClick={()=>setSubFilter({q:'',teacher:'',grade:'',category:''})}>ล้างตัวกรอง</button>
              )}
            </div>
          </div>

          <div style={{overflowX:'auto'}}>
          {(() => {
            const q = subFilter.q.toLowerCase()
            const filtered = subjects.filter(s =>
              (!q || s.subject_code.toLowerCase().includes(q) || s.subject_name.toLowerCase().includes(q)) &&
              (!subFilter.teacher || s.teacher_name === subFilter.teacher) &&
              (!subFilter.grade || s.schedules?.some(sc => sc.grade_level === subFilter.grade)) &&
              (!subFilter.category || s.category === subFilter.category)
            )
            return (
              <table className="tbl">
                <thead><tr>
                  <th style={{width:120}}>รหัสวิชา</th>
                  <th>ชื่อวิชา</th>
                  <th style={{width:180}}>หมวด</th>
                  <th style={{width:160}}>ครูผู้สอน</th>
                  <th style={{width:100}}>ตารางสอน</th>
                  <th style={{width:120}}></th>
                </tr></thead>
                <tbody>
                  {filtered.map(s=>(
                    <tr key={s.id} style={{cursor:'pointer'}} onClick={()=>openSubDetail(s)}>
                      <td><span style={{fontFamily:'var(--fc-font-mono)',fontSize:12,background:'var(--fc-muted)',padding:'2px 8px',borderRadius:4}}>{s.subject_code}</span></td>
                      <td style={{fontWeight:500,color:'var(--fc-text)'}}>{s.subject_name}</td>
                      <td style={{fontSize:12,color:'var(--fc-text-3)'}}>{s.category || '—'}</td>
                      <td style={{fontSize:13,color:'var(--fc-text-3)'}}>{s.teacher_name || '—'}</td>
                      <td style={{fontSize:13,color:'var(--fc-text-3)'}}>{s.schedules?.length ? `${s.schedules.length} คาบ` : '—'}</td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>openSubDetail(s)}>แก้ไข</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>deleteSub(s.id)}>ลบ</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{textAlign:'center',color:'var(--fc-text-4)',padding:'32px 0',fontSize:13}}>ไม่พบรายวิชาที่ตรงกับตัวกรอง</td></tr>
                  )}
                </tbody>
              </table>
            )
          })()}

          </div>
        </div>
      )}

      {/* Attendance Log tab */}
      {tab === 'logs' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {/* Filter bar */}
          <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:12,padding:'12px 20px',borderBottom:'1px solid var(--fc-border)'}}>
            {/* Left: filters */}
            <div style={{display:'flex',alignItems:'flex-end',gap:16,flexWrap:'wrap'}}>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <label className="form-label" htmlFor="log-date" style={{marginBottom:0}}>วันที่</label>
                <input id="log-date" type="date" value={logDate}
                  onChange={e=>setLogDate(e.target.value)}
                  style={{width:155}}
                />
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <label className="form-label" htmlFor="log-subject" style={{marginBottom:0}}>วิชา</label>
                <select id="log-subject" value={logSubject} onChange={e=>setLogSubject(e.target.value)} style={{width:210}}>
                  <option value="">ทุกวิชา</option>
                  {subjects.map(s=><option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => loadLogs(logDate, logSubject)} disabled={logLoading}>
                {logLoading ? 'กำลังโหลด...' : 'แสดงข้อมูล'}
              </button>
            </div>

            {/* Right: toggle + count */}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:14}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
                <span style={{fontSize:12,color:'var(--fc-text-3)',whiteSpace:'nowrap'}}>แสดงสแกนซ้ำ</span>
                <button
                  role="switch" aria-checked={showDupScans}
                  onClick={()=>{ setShowDupScans(v=>!v); setLogPage(1) }}
                  style={{width:36,height:20,borderRadius:99,border:'none',cursor:'pointer',flexShrink:0,
                    background:showDupScans?'var(--fc-primary)':'var(--fc-neutral)',
                    position:'relative',transition:'background 0.2s'}}
                >
                  <div style={{position:'absolute',top:2,left:showDupScans?18:2,width:16,height:16,
                    borderRadius:'50%',background:'#fff',transition:'left 0.2s',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </button>
              </label>
              <div style={{fontSize:12,color:'var(--fc-text-4)',whiteSpace:'nowrap'}}>
                {logs.filter(l => showDupScans || l.status !== 'already_checked').length} รายการ
                {!showDupScans && logs.filter(l=>l.status==='already_checked').length > 0 && (
                  <span style={{color:'#0891b2',marginLeft:6}}>
                    (+{logs.filter(l=>l.status==='already_checked').length} สแกนซ้ำ)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {logLoading ? (
            <div style={{display:'flex',justifyContent:'center',padding:40}}>
              <div className="spinner"/>
            </div>
          ) : logs.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:'var(--fc-text-4)',fontSize:13}}>
              ไม่พบบันทึกการเช็คชื่อในวันนี้
            </div>
          ) : (() => {
            const filtered = logs.filter(l => showDupScans || l.status !== 'already_checked')
            const totalPages = Math.ceil(filtered.length / LOG_PAGE_SIZE)
            const page = Math.min(logPage, totalPages)
            const paged = filtered.slice((page - 1) * LOG_PAGE_SIZE, page * LOG_PAGE_SIZE)
            const pageNums = () => {
              const pages = []
              for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
                else if (pages[pages.length - 1] !== '...') pages.push('...')
              }
              return pages
            }
            const allPageSelected = paged.length > 0 && paged.every(l => selectedLogs.has(l.log_id))
            const somePageSelected = paged.some(l => selectedLogs.has(l.log_id))
            return (
              <>
                {/* Bulk action bar */}
                {selectedLogs.size > 0 && (
                  <div style={{
                    display:'flex', alignItems:'center', gap:12, marginBottom:10,
                    padding:'10px 14px', borderRadius:8,
                    background:'var(--fc-primary-light)', border:'1px solid var(--fc-primary)',
                  }}>
                    <span style={{fontSize:13,color:'var(--fc-primary)',fontWeight:600,flex:1}}>
                      เลือก {selectedLogs.size} รายการ
                    </span>
                    <button className="btn btn-sm" onClick={()=>setSelectedLogs(new Set())}
                      style={{fontSize:12,color:'var(--fc-primary)',background:'transparent',border:'1px solid var(--fc-primary)'}}>
                      ยกเลิกการเลือก
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={bulkDeleteLogs} disabled={bulkDeleting}>
                      {bulkDeleting ? 'กำลังลบ…' : `ยกเลิกการเช็คชื่อ ${selectedLogs.size} รายการ`}
                    </button>
                  </div>
                )}
                <div style={{overflowX:'auto'}}>
                  <table className="tbl">
                    <thead><tr>
                      <th style={{width:36,paddingRight:0}} onClick={e=>e.stopPropagation()}>
                        <input type="checkbox"
                          checked={allPageSelected}
                          ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                          onChange={e => {
                            if (e.target.checked) setSelectedLogs(prev => { const n = new Set(prev); paged.forEach(l => n.add(l.log_id)); return n })
                            else setSelectedLogs(prev => { const n = new Set(prev); paged.forEach(l => n.delete(l.log_id)); return n })
                          }}
                          style={{cursor:'pointer'}}
                        />
                      </th>
                      <th>เวลา</th>
                      <th>รหัสนักเรียน</th>
                      <th>ชื่อ-นามสกุล</th>
                      <th>ชั้น/ห้อง</th>
                      <th>วิชา</th>
                      <th>สถานะ</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {paged.map(log=>(
                        <tr key={log.log_id}
                          onClick={()=>openLogDetail(log)}
                          style={{
                            cursor:'pointer',
                            opacity: log.status==='already_checked' ? 0.75 : 1,
                            background: selectedLogs.has(log.log_id) ? 'var(--fc-primary-light)' : undefined,
                          }}
                        >
                          <td style={{paddingRight:0}} onClick={e=>e.stopPropagation()}>
                            <input type="checkbox"
                              checked={selectedLogs.has(log.log_id)}
                              onChange={e => setSelectedLogs(prev => {
                                const n = new Set(prev)
                                e.target.checked ? n.add(log.log_id) : n.delete(log.log_id)
                                return n
                              })}
                              style={{cursor:'pointer'}}
                            />
                          </td>
                          <td style={{fontFamily:'var(--fc-font-mono)',fontSize:12,color:'var(--fc-text-3)',whiteSpace:'nowrap'}}>
                            {log.timestamp}
                          </td>
                          <td style={{fontFamily:'var(--fc-font-mono)',fontSize:12}}>{log.student_id}</td>
                          <td style={{fontWeight:500,color:'var(--fc-text)'}}>{log.name}</td>
                          <td style={{fontSize:12,color:'var(--fc-text-3)'}}>
                            {log.grade_level ? `ชั้น ${log.grade_level}` : '—'}
                            {log.room_number ? ` ห้อง ${log.room_number}` : ''}
                          </td>
                          <td>
                            <span style={{fontSize:11,fontFamily:'var(--fc-font-mono)',background:'var(--fc-muted)',padding:'2px 6px',borderRadius:4}}>
                              {log.subject_code}
                            </span>
                            <span style={{fontSize:12,color:'var(--fc-text-3)',marginLeft:6}}>{log.subject_name}</span>
                          </td>
                          <td onClick={e=>e.stopPropagation()}>
                            <StatusBadge status={log.status} reason={log.reason} logId={log.log_id} onUpdate={updateLogStatus}/>
                          </td>
                          <td onClick={e=>e.stopPropagation()}>
                            <button className="btn btn-danger btn-sm" onClick={()=>deleteLog(log.log_id)}>ยกเลิก</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="pg-btn" onClick={()=>setLogPage(p=>Math.max(1,p-1))} disabled={page===1}>‹</button>
                    {pageNums().map((n,i) => n === '...'
                      ? <span key={`e${i}`} style={{padding:'0 4px',color:'var(--fc-text-4)',fontSize:13}}>…</span>
                      : <button key={n} className={`pg-btn${page===n?' active':''}`} onClick={()=>setLogPage(n)}>{n}</button>
                    )}
                    <button className="pg-btn" onClick={()=>setLogPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
                    <span style={{fontSize:12,color:'var(--fc-text-4)',marginLeft:8}}>{(page-1)*LOG_PAGE_SIZE+1}–{Math.min(page*LOG_PAGE_SIZE,filtered.length)} / {filtered.length}</span>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Semester tab */}
      {tab === 'semester' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, alignItems: 'start' }}>
            {/* Settings form */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-text)', marginBottom: 20 }}>ภาคเรียนปัจจุบัน</div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="semester-name" className="form-label">ชื่อภาคเรียน</label>
                  <input
                    id="semester-name"
                    placeholder="เช่น ภาคเรียนที่ 1/2568"
                    value={semester.name}
                    onChange={e => setSemester(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="semester-number" className="form-label">ภาคเรียนที่</label>
                  <select id="semester-number" value={semester.semester_number}
                    onChange={e => setSemester(p => ({ ...p, semester_number: Number(e.target.value) }))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3 (พิเศษ)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="academic-year" className="form-label">ปีการศึกษา (พ.ศ.)</label>
                <input
                  id="academic-year"
                  placeholder="เช่น 2568"
                  value={semester.academic_year}
                  onChange={e => setSemester(p => ({ ...p, academic_year: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label htmlFor="semester-start" className="form-label">วันเปิดเทอม</label>
                  <input id="semester-start" type="date" value={semester.term_start}
                    onChange={e => setSemester(p => ({ ...p, term_start: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label htmlFor="semester-end" className="form-label">วันปิดเทอม</label>
                  <input id="semester-end" type="date" value={semester.term_end}
                    onChange={e => setSemester(p => ({ ...p, term_end: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="face-threshold" className="form-label">
                  ความเข้มงวดการจดจำใบหน้า
                  <span style={{ fontWeight: 400, color: 'var(--fc-text-4)', marginLeft: 8 }}>
                    {semester.face_threshold.toFixed(2)}
                    {semester.face_threshold < 0.6 ? ' · เข้มงวดมาก' : semester.face_threshold < 1.0 ? ' · เข้มงวด' : semester.face_threshold < 1.4 ? ' · ปกติ' : ' · ผ่อนปรน'}
                  </span>
                </label>
                <input id="face-threshold" type="range" min="0.1" max="2.0" step="0.05"
                  value={semester.face_threshold}
                  onChange={e => setSemester(p => ({ ...p, face_threshold: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--fc-primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fc-text-4)', marginTop: 4 }}>
                  <span>0.1 เข้มงวดมาก</span>
                  <span>1.0 ปกติ</span>
                  <span>2.0 ผ่อนปรน</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} disabled={semSaving} onClick={saveSemester}>
                  {semSaving ? 'กำลังบันทึก…' : 'บันทึก'}
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, color: 'var(--fc-success-dark)', border: '1px solid var(--fc-success-dark)' }}
                  onClick={() => {
                    const nextYear = String(Number(semester.academic_year || new Date().getFullYear()) + (semester.semester_number >= 2 ? 1 : 0))
                    const nextNum = semester.semester_number >= 2 ? 1 : (semester.semester_number || 1) + 1
                    setNewSemForm({ name: `ภาคเรียนที่ ${nextNum}/${nextYear}`, academic_year: nextYear, semester_number: nextNum, term_start: '', term_end: '' })
                    setShowNewSem(true)
                  }}
                >
                  เริ่มภาคเรียนใหม่
                </button>
              </div>
            </div>

            {/* Info + notes */}
            <div className="card" style={{ padding: '24px 28px', background: 'var(--fc-primary-light)', border: '1px solid var(--fc-primary-light)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-primary)', marginBottom: 12 }}>เมื่อเริ่มภาคเรียนใหม่</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { n: '1', text: 'ข้อมูลนักเรียน รูปใบหน้า และตารางสอนทั้งหมดยังคงอยู่' },
                  { n: '2', text: 'ประวัติการเช็คชื่อเดิมไม่หายไป — ดูย้อนหลังได้เสมอ' },
                  { n: '3', text: 'ภาคเรียนเก่าจะถูกเก็บไว้ในประวัติด้านล่าง' },
                  { n: '4', text: 'ใช้ฟิลเตอร์วันที่ใน Reports เพื่อดูข้อมูลภาคเรียนที่ผ่านมา' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: 'var(--fc-primary)',
                      color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{item.n}</div>
                    <span style={{ fontSize: 13, color: 'var(--fc-text-2)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semester history */}
          {semesters.length > 1 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fc-border)', fontSize: 13, fontWeight: 700, color: 'var(--fc-text)' }}>
                ประวัติภาคเรียน ({semesters.length} ภาคเรียน)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr>
                    <th>ชื่อภาคเรียน</th>
                    <th style={{ width: 80 }}>ปีการศึกษา</th>
                    <th style={{ width: 60 }}>ภาคที่</th>
                    <th style={{ width: 120 }}>เปิดเทอม</th>
                    <th style={{ width: 120 }}>ปิดเทอม</th>
                    <th style={{ width: 80 }}>สถานะ</th>
                  </tr></thead>
                  <tbody>
                    {semesters.map(s => (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 500 }}>{s.name || '—'}</td>
                        <td style={{ fontFamily: 'var(--fc-font-mono)', fontSize: 13 }}>{s.academic_year || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{s.semester_number || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>{s.term_start || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>{s.term_end || '—'}</td>
                        <td>
                          {s.is_active
                            ? <span className="chip" style={{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)', fontSize: 11 }}>ปัจจุบัน</span>
                            : <span className="chip" style={{ background: 'var(--fc-muted)', color: 'var(--fc-text-4)', fontSize: 11 }}>เก็บไว้</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New semester modal */}
      {showNewSem && (
        <Modal title="เริ่มภาคเรียนใหม่" onClose={() => setShowNewSem(false)} maxWidth={480}>
          <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginBottom: 16, padding: '10px 14px', background: '#FFFBEB', borderRadius: 8, border: '1px solid #FCD34D' }}>
            ภาคเรียนปัจจุบันจะถูกเก็บไว้ในประวัติ — ข้อมูลการเช็คชื่อทั้งหมดยังคงอยู่
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">ชื่อภาคเรียน *</label>
              <input placeholder="เช่น ภาคเรียนที่ 1/2569" value={newSemForm.name}
                onChange={e => setNewSemForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">ภาคเรียนที่</label>
              <select value={newSemForm.semester_number}
                onChange={e => setNewSemForm(f => ({ ...f, semester_number: Number(e.target.value) }))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3 (พิเศษ)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">ปีการศึกษา (พ.ศ.)</label>
            <input placeholder="เช่น 2569" value={newSemForm.academic_year}
              onChange={e => setNewSemForm(f => ({ ...f, academic_year: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">วันเปิดเทอม</label>
              <input type="date" value={newSemForm.term_start}
                onChange={e => setNewSemForm(f => ({ ...f, term_start: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">วันปิดเทอม</label>
              <input type="date" value={newSemForm.term_end}
                onChange={e => setNewSemForm(f => ({ ...f, term_end: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-ghost btn-full" onClick={() => setShowNewSem(false)}>ยกเลิก</button>
            <button className="btn btn-primary btn-full" onClick={createNewSemester} disabled={newSemSaving}>
              {newSemSaving ? 'กำลังสร้าง…' : 'เริ่มภาคเรียนใหม่'}
            </button>
          </div>
        </Modal>
      )}

      {/* Holidays tab */}
      {tab === 'holidays' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Year selector + sync */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>ปี พ.ศ.</label>
                <select value={holidayYear} style={{ width: 110 }}
                  onChange={e => { const y = Number(e.target.value); setHolidayYear(y); loadHolidays(y) }}>
                  {[...Array(5)].map((_, i) => {
                    const y = new Date().getFullYear() + 543 - i
                    return <option key={y} value={y - 543}>{y}</option>
                  })}
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => loadHolidays(holidayYear)} disabled={holidayLoading}>
                {holidayLoading ? 'กำลังโหลด…' : 'แสดง'}
              </button>
              <button
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #0284C7',
                  background: 'transparent', color: '#0284C7', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', opacity: holidaySyncing ? 0.6 : 1,
                }}
                onClick={syncHolidays}
                disabled={holidaySyncing}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                {holidaySyncing ? 'กำลังซิงค์…' : 'ซิงค์วันหยุดราชการ'}
              </button>
              <span style={{ fontSize: 12, color: 'var(--fc-text-4)', marginLeft: 'auto' }}>
                วันหยุดราชการดึงจาก date.nager.at
              </span>
            </div>
          </div>

          {/* Add holiday form */}
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-text)', marginBottom: 12 }}>เพิ่มวันหยุด</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>วันที่</label>
                <input type="date" value={newHoliday.date} style={{ width: 160 }}
                  onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>ชื่อวันหยุด</label>
                <input placeholder="เช่น วันหยุดชดเชย, ปิดเพื่อจัดงาน..."
                  value={newHoliday.name}
                  onChange={e => setNewHoliday(h => ({ ...h, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addHoliday()}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>ประเภท</label>
                <select value={newHoliday.type} style={{ width: 130 }}
                  onChange={e => setNewHoliday(h => ({ ...h, type: e.target.value }))}>
                  <option value="school">โรงเรียน</option>
                  <option value="public">ราชการ</option>
                </select>
              </div>
              <button className="btn btn-primary btn-sm" onClick={addHoliday} disabled={holidayAdding}>
                {holidayAdding ? 'กำลังเพิ่ม…' : '+ เพิ่มวันหยุด'}
              </button>
            </div>
          </div>

          {/* Holiday list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--fc-border)', fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>
              วันหยุดปี {holidayYear + 543} ({holidays.length} วัน)
            </div>
            {holidayLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner" />
              </div>
            ) : holidays.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>
                ยังไม่มีวันหยุดในปีนี้ — กดซิงค์วันหยุดราชการหรือเพิ่มเอง
              </div>
            ) : (
              <table className="tbl">
                <thead><tr>
                  <th style={{ width: 120 }}>วันที่</th>
                  <th>ชื่อวันหยุด</th>
                  <th style={{ width: 100 }}>ประเภท</th>
                  <th style={{ width: 70 }}></th>
                </tr></thead>
                <tbody>
                  {holidays.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontFamily: 'var(--fc-font-mono)', fontSize: 12, color: 'var(--fc-text-3)' }}>{h.date}</td>
                      <td style={{ fontWeight: 500 }}>{h.name}</td>
                      <td>
                        <span className="chip" style={h.type === 'public'
                          ? { background: 'var(--fc-primary-light)', color: 'var(--fc-primary)', fontSize: 11 }
                          : { background: 'var(--fc-muted)', color: 'var(--fc-text-3)', fontSize: 11 }
                        }>
                          {h.type === 'public' ? 'ราชการ' : 'โรงเรียน'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteHoliday(h.id)}>ลบ</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create user */}
      {showUser && (
        <Modal title="เพิ่มบัญชีใหม่" onClose={()=>setShowUser(false)}>
          {[
            {key:'full_name',label:'ชื่อ-นามสกุล',type:'text',ph:'สมชาย ใจดี'},
            {key:'username',label:'ชื่อผู้ใช้',type:'text',ph:'somchai (ใช้ login แทน email ได้)'},
            {key:'email',label:'Email',type:'email',ph:'teacher@school.ac.th'},
            {key:'password',label:'Password',type:'password',ph:'••••••••'},
          ].map(f=>(
            <div className="form-group" key={f.key}>
              <label htmlFor={`new-user-${f.key}`} className="form-label">{f.label}</label>
              <input id={`new-user-${f.key}`} type={f.type} placeholder={f.ph}
                value={newUser[f.key]}
                onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
              />
            </div>
          ))}
          <div className="form-group">
            <label htmlFor="new-user-role" className="form-label">สิทธิ์</label>
            <select id="new-user-role" value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value,categories:[]}))}>
              <option value="teacher">ครู</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          {newUser.role === 'teacher' && (
            <div className="form-group">
              <label className="form-label">หมวดวิชาที่สอน</label>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px 16px',padding:'10px 12px',background:'var(--fc-muted)',borderRadius:8}}>
                {SUBJECT_CATEGORIES.map(cat=>{
                  const checked = newUser.categories.includes(cat)
                  return (
                    <label key={cat} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--fc-text-2)',cursor:'pointer',userSelect:'none'}}>
                      <input type="checkbox" checked={checked}
                        onChange={()=>setNewUser(u=>({...u,categories:checked?u.categories.filter(c=>c!==cat):[...u.categories,cat]}))}
                        style={{accentColor:'var(--fc-primary)',flexShrink:0,width:14,height:14}}
                      />
                      <span>{cat}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button className="btn btn-ghost btn-full" onClick={()=>setShowUser(false)}>ยกเลิก</button>
            <button className="btn btn-primary btn-full" onClick={createUser}>สร้างบัญชี</button>
          </div>
        </Modal>
      )}

      {/* Modal: Assign subject */}
      {assignModal && (
        <Modal title={`มอบหมายวิชา — ${assignModal.full_name}`} onClose={()=>setAssignModal(null)}>
          {teacherSubs.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--fc-text-3)',marginBottom:8}}>วิชาที่รับผิดชอบอยู่</div>
              {subjects.filter(s=>teacherSubs.includes(s.id)).map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'var(--fc-muted)',borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--fc-text-2)'}}>{s.subject_code} — {s.subject_name}</span>
                  <button className="btn btn-danger btn-sm" onClick={()=>unassign(s.id)}>ถอน</button>
                </div>
              ))}
              <div className="divider"/>
            </div>
          )}
          {availSubs.length > 0
            ? <>
                <div className="form-group">
                  <label htmlFor="assign-subject" className="form-label">เพิ่มวิชา</label>
                  <select id="assign-subject" value={assignId} onChange={e=>setAssignId(e.target.value)}>
                    {availSubs.map(s=><option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <button className="btn btn-ghost btn-full" onClick={()=>setAssignModal(null)}>ปิด</button>
                  <button className="btn btn-primary btn-full" onClick={assign}>มอบหมาย</button>
                </div>
              </>
            : <div style={{textAlign:'center',padding:'8px 0'}}>
                <p style={{fontSize:13,color:'var(--fc-text-4)',marginBottom:12}}>
                  {teacherSubs.length > 0 ? 'ได้รับมอบหมายวิชาครบแล้ว' : 'ไม่มีวิชาในหมวดที่ครูสอน'}
                </p>
                <button className="btn btn-ghost btn-full" onClick={()=>setAssignModal(null)}>ปิด</button>
              </div>
          }
        </Modal>
      )}

      {/* Modal: Teacher detail */}
      {teacherDetail && (() => {
        const mySubs = subjects.filter(s => teacherSubjectIds.has(s.id))
        const categories = teacherDetail.categories || []
        const totalPeriods = mySubs.reduce((n, s) => n + (s.schedules?.length || 0), 0)
        const totalRooms   = new Set(mySubs.flatMap(s => (s.schedules||[]).map(sc => `${sc.grade_level}-${sc.room_number}`))).size

        // color palette per subject (index-based)
        const CELL_COLORS = [
          {bg:'rgba(99,102,241,0.08)',  border:'rgba(99,102,241,0.25)',  text:'var(--fc-secondary)'},
          {bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.25)',  text:'var(--fc-success-dark)'},
          {bg:'rgba(245,158,11,0.08)',  border:'rgba(245,158,11,0.25)',  text:'var(--fc-warning)'},
          {bg:'rgba(59,130,246,0.08)',  border:'rgba(59,130,246,0.25)',  text:'#3b82f6'},
          {bg:'rgba(239,68,68,0.08)',   border:'rgba(239,68,68,0.25)',   text:'var(--fc-danger)'},
          {bg:'rgba(168,85,247,0.08)',  border:'rgba(168,85,247,0.25)',  text:'#a855f7'},
          {bg:'rgba(20,184,166,0.08)',  border:'rgba(20,184,166,0.25)',  text:'#14b8a6'},
        ]
        const subColor = Object.fromEntries(mySubs.map((s,i) => [s.id, CELL_COLORS[i % CELL_COLORS.length]]))

        const DAY_ORDER = ['จ','อ','พ','พฤ','ศ']
        const activeDays = DAY_ORDER   // แสดงทุกวัน จันทร์–ศุกร์เสมอ
        const activePeriods = PERIODS  // แสดงทุกคาบ 1–7 เสมอ

        // build lookup: day+periodStart → [{sub, schedule}]
        const cellMap = {}
        mySubs.forEach(s => (s.schedules||[]).forEach(sc => {
          const key = `${sc.day_of_week}__${sc.time_start}`
          if (!cellMap[key]) cellMap[key] = []
          cellMap[key].push({ sub: s, sc })
        }))

        return (
          <Modal title="ข้อมูลครู" onClose={()=>{setTeacherDetail(null);setTeacherSubjectIds(new Set())}} maxWidth={760}>
            {/* Account details */}
            <div style={{marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--fc-text-3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>ข้อมูลบัญชี</div>
                {!teacherEdit
                  ? <button
                      className="btn btn-sm"
                      style={{background:'var(--fc-primary-light)',color:'var(--fc-primary)',border:'none',display:'flex',alignItems:'center',gap:5,fontWeight:600}}
                      onClick={()=>setTeacherEdit(true)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      แก้ไขข้อมูล
                    </button>
                  : <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setTeacherEdit(false)} disabled={teacherSaving}>ยกเลิก</button>
                      <button className="btn btn-primary btn-sm" onClick={saveTeacher} disabled={teacherSaving}>{teacherSaving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
                    </div>
                }
              </div>

              {teacherEdit ? (
                <div style={{display:'flex',flexDirection:'column',gap:12,padding:'16px',background:'var(--fc-muted)',borderRadius:10}}>
                  {/* Row 1: ชื่อ + username */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:4}}>ชื่อ-นามสกุล</label>
                      <input value={teacherForm.full_name||''} onChange={e=>setTeacherForm(f=>({...f,full_name:e.target.value}))} style={{width:'100%'}} />
                    </div>
                    <div>
                      <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:4}}>ชื่อผู้ใช้ <span style={{fontSize:10}}>(ใช้ login แทน email ได้)</span></label>
                      <input value={teacherForm.username||''} onChange={e=>setTeacherForm(f=>({...f,username:e.target.value}))} placeholder="เว้นว่างถ้าไม่ต้องการ" style={{width:'100%'}} />
                    </div>
                  </div>
                  {/* Row 2: email + role */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 160px',gap:12}}>
                    <div>
                      <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:4}}>อีเมล</label>
                      <input value={teacherForm.email||''} onChange={e=>setTeacherForm(f=>({...f,email:e.target.value}))} style={{width:'100%'}} />
                    </div>
                    <div>
                      <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:4}}>บทบาท</label>
                      <select value={teacherForm.role||'teacher'} onChange={e=>setTeacherForm(f=>({...f,role:e.target.value}))} style={{width:'100%'}}>
                        <option value="teacher">ครู</option>
                        <option value="admin">ผู้ดูแลระบบ</option>
                      </select>
                    </div>
                  </div>
                  {/* Row 3: password */}
                  <div>
                    <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:4}}>รหัสผ่านใหม่ <span style={{fontSize:10}}>(เว้นว่างถ้าไม่เปลี่ยน)</span></label>
                    <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={teacherForm.new_password||''} onChange={e=>setTeacherForm(f=>({...f,new_password:e.target.value}))} style={{width:'100%',maxWidth:320}} />
                  </div>
                  {/* Row 4: categories */}
                  {teacherForm.role === 'teacher' && (
                    <div>
                      <label style={{fontSize:11,color:'var(--fc-text-4)',display:'block',marginBottom:6}}>หมวดวิชาที่สอน</label>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'8px 16px',padding:'10px 12px',background:'var(--fc-card)',border:'1px solid var(--fc-border)',borderRadius:8}}>
                        {SUBJECT_CATEGORIES.map(cat=>{
                          const checked = (teacherForm.categories||[]).includes(cat)
                          return (
                            <label key={cat} style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--fc-text-2)',cursor:'pointer',userSelect:'none'}}>
                              <input type="checkbox" checked={checked}
                                onChange={()=>setTeacherForm(f=>({...f,categories:checked?f.categories.filter(c=>c!==cat):[...(f.categories||[]),cat]}))}
                                style={{accentColor:'var(--fc-primary)',flexShrink:0,width:14,height:14}}
                              />
                              <span>{cat}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 16px',background:'var(--fc-muted)',borderRadius:10}}>
                  <div style={{width:52,height:52,borderRadius:'50%',background:'var(--fc-primary-light)',color:'var(--fc-primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,flexShrink:0}}>
                    {teacherDetail.full_name?.[0]}
                  </div>
                  <div style={{flex:1,minWidth:0,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 24px'}}>
                    <div>
                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:1}}>ชื่อ-นามสกุล</div>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--fc-text)'}}>{teacherDetail.full_name || '—'}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:1}}>ชื่อผู้ใช้</div>
                      <div style={{fontSize:13,color:'var(--fc-text-2)',fontFamily:'var(--fc-font-mono)'}}>{teacherDetail.username || <span style={{color:'var(--fc-text-4)',fontFamily:'inherit',fontSize:12}}>ไม่มี</span>}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:1}}>อีเมล</div>
                      <div style={{fontSize:13,color:'var(--fc-text-2)'}}>{teacherDetail.email || '—'}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:1}}>บทบาท</div>
                      <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(99,102,241,0.1)',color:'var(--fc-secondary)'}}>
                        {teacherDetail.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู'}
                      </span>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:1}}>สถานะ</div>
                      <span style={{fontSize:11,fontWeight:600,color: teacherDetail.is_active !== false ? 'var(--fc-success)' : 'var(--fc-danger)'}}>
                        ● {teacherDetail.is_active !== false ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                    {categories.length > 0 && (
                      <div style={{gridColumn:'1/-1'}}>
                        <div style={{fontSize:10,color:'var(--fc-text-4)',marginBottom:4}}>หมวดวิชาที่สอน</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                          {categories.map(c=>(
                            <span key={c} style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:'rgba(99,102,241,0.08)',color:'var(--fc-secondary)',fontWeight:500}}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:16,flexShrink:0,paddingLeft:12,borderLeft:'1px solid var(--fc-border)'}}>
                    {[{n:totalPeriods,l:'คาบ/สัปดาห์'},{n:mySubs.length,l:'วิชา'},{n:totalRooms,l:'ห้อง'}].map(({n,l})=>(
                      <div key={l} style={{textAlign:'center'}}>
                        <div style={{fontSize:22,fontWeight:700,color:'var(--fc-primary)',lineHeight:1}}>{n}</div>
                        <div style={{fontSize:10,color:'var(--fc-text-4)',marginTop:3}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subject list */}
            {mySubs.length > 0 && (
              <div style={{marginBottom:20}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--fc-text-3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>รายวิชาที่สอน</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {mySubs.map((s,i)=>{
                    const clr = subColor[s.id]
                    const periods = s.schedules?.length || 0
                    return (
                      <div key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 12px',background:clr.bg,border:`1px solid ${clr.border}`,borderRadius:8}}>
                        <div style={{width:28,height:28,borderRadius:6,background:clr.border,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:clr.text,flexShrink:0}}>{i+1}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                            <span style={{fontSize:12,fontWeight:700,color:clr.text,fontFamily:'var(--fc-font-mono)'}}>{s.subject_code}</span>
                            <span style={{fontSize:13,fontWeight:600,color:'var(--fc-text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{s.subject_name}</span>
                          </div>
                          {s.category && <div style={{fontSize:11,color:'var(--fc-text-4)',marginTop:1}}>{s.category}</div>}
                        </div>
                        <div style={{fontSize:11,color:'var(--fc-text-4)',flexShrink:0}}>{periods} คาบ/สัปดาห์</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Schedule grid */}
            <div style={{fontSize:12,fontWeight:600,color:'var(--fc-text-3)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>ตารางสอน</div>
            <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
                  <colgroup>
                    <col style={{width:36}}/>
                    {activePeriods.map((_,i)=><col key={i} style={{width:'13%'}}/>)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{padding:'8px 4px',fontSize:11,color:'var(--fc-text-4)',fontWeight:600,textAlign:'center',borderBottom:'2px solid var(--fc-border)'}}>วัน</th>
                      {activePeriods.map((p,i)=>(
                        <th key={i} style={{padding:'6px 8px',fontSize:11,color:'var(--fc-text-3)',fontWeight:600,textAlign:'center',borderBottom:'2px solid var(--fc-border)',borderLeft:'1px solid var(--fc-border)'}}>
                          <div style={{fontWeight:700,color:'var(--fc-text)',marginBottom:1}}>คาบ {PERIODS.indexOf(p)+1}</div>
                          <div style={{fontFamily:'var(--fc-font-mono)',fontSize:10,color:'var(--fc-text-4)'}}>{p.start}</div>
                          <div style={{fontFamily:'var(--fc-font-mono)',fontSize:10,color:'var(--fc-text-4)'}}>{p.end}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDays.map(day=>{
                      // Build merged cells: consecutive same-subject periods collapse into one colspan
                      const cells = []
                      let pi = 0
                      while (pi < activePeriods.length) {
                        const p = activePeriods[pi]
                        const entries = cellMap[`${day}__${p.start}`] || []
                        let span = 1
                        if (entries.length === 1) {
                          while (pi + span < activePeriods.length) {
                            const np = activePeriods[pi + span]
                            const ne = cellMap[`${day}__${np.start}`] || []
                            if (
                              ne.length === 1 &&
                              ne[0].sub.id === entries[0].sub.id &&
                              ne[0].sc.grade_level === entries[0].sc.grade_level &&
                              ne[0].sc.room_number === entries[0].sc.room_number
                            ) { span++ } else break
                          }
                        }
                        cells.push({ entries, span, pi })
                        pi += span
                      }
                      return (
                        <tr key={day}>
                          <td style={{padding:'6px 4px',textAlign:'center',fontWeight:700,fontSize:13,color:'var(--fc-primary)',borderBottom:'1px solid var(--fc-border)',verticalAlign:'middle',height:80}}>{day}</td>
                          {cells.map(({ entries, span, pi: startPi })=>{
                            const endPeriod = activePeriods[startPi + span - 1]
                            return (
                              <td key={startPi} colSpan={span} style={{padding:4,borderBottom:'1px solid var(--fc-border)',borderLeft:'1px solid var(--fc-border)',verticalAlign:'top',height:80}}>
                                {entries.map(({sub,sc},ei)=>{
                                  const clr = subColor[sub.id]
                                  const timeLabel = span > 1
                                    ? `คาบ ${startPi+1}–${startPi+span} · ${activePeriods[startPi].start}–${endPeriod.end}`
                                    : null
                                  return (
                                    <div key={ei} style={{
                                      background:clr.bg, border:`1px solid ${clr.border}`,
                                      borderRadius:7, padding:'6px 8px',
                                      marginBottom: ei < entries.length-1 ? 3 : 0,
                                      height: span > 1 ? '100%' : undefined,
                                    }}>
                                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:4}}>
                                        <div>
                                          <div style={{fontSize:11,fontWeight:700,color:clr.text,marginBottom:1}}>{sub.subject_code}</div>
                                          <div style={{fontSize:11,color:'var(--fc-text-2)',fontWeight:500}}>{sub.subject_name}</div>
                                        </div>
                                        {span > 1 && (
                                          <span style={{
                                            fontSize:10,fontWeight:600,color:clr.text,
                                            background:clr.border,borderRadius:4,
                                            padding:'1px 5px',whiteSpace:'nowrap',flexShrink:0,
                                          }}>{span} คาบ</span>
                                        )}
                                      </div>
                                      <div style={{fontSize:10,color:'var(--fc-text-4)',marginTop:3}}>
                                        {sc.grade_level ? `ชั้น ${sc.grade_level}` : ''}
                                        {sc.grade_level && sc.room_number ? ' · ' : ''}
                                        {sc.room_number ? `ห้อง ${sc.room_number}` : ''}
                                        {!sc.grade_level && !sc.room_number ? '—' : ''}
                                      </div>
                                      {timeLabel && (
                                        <div style={{fontSize:10,color:clr.text,opacity:0.7,marginTop:2,fontFamily:'var(--fc-font-mono)'}}>{timeLabel}</div>
                                      )}
                                    </div>
                                  )
                                })}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            <div style={{display:'flex',gap:8,marginTop:18}}>
              <button className="btn btn-ghost btn-full" onClick={()=>setTeacherDetail(null)}>ปิด</button>
              <button className="btn btn-primary btn-full" onClick={()=>{setTeacherDetail(null);openAssign(teacherDetail)}}>มอบหมายวิชา</button>
            </div>
          </Modal>
        )
      })()}

      {/* Modal: Log detail */}
      {logDetail && (
        <Modal title="รายละเอียดการเช็คชื่อ" onClose={closeLogDetail} maxWidth={680}>
          <div style={{display:'grid', gridTemplateColumns: logPhoto ? '1fr 1fr' : '1fr', gap: 20, alignItems:'start'}}>
            {/* Scan photo */}
            {logPhoto && (
              <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '4/3', background: 'var(--fc-muted)' }}>
                <img src={logPhoto} alt="scan" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
              </div>
            )}
            {/* Info */}
            <div>
              <div style={{fontSize:18,fontWeight:700,color:'var(--fc-text)',marginBottom:4}}>
                {logDetail.name}
              </div>
              <div style={{fontSize:13,color:'var(--fc-text-4)',fontFamily:'var(--fc-font-mono)',marginBottom:16}}>
                {logDetail.student_id}
                {logDetail.grade_level && ` · ชั้น ${logDetail.grade_level}`}
                {logDetail.room_number && ` ห้อง ${logDetail.room_number}`}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:'var(--fc-text-4)'}}>วิชา</span>
                  <span style={{fontSize:13,color:'var(--fc-text-2)',fontWeight:600}}>{logDetail.subject_name}
                    <span style={{fontFamily:'var(--fc-font-mono)',marginLeft:6,fontWeight:400,color:'var(--fc-text-4)'}}>{logDetail.subject_code}</span>
                  </span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:'var(--fc-text-4)'}}>วันที่</span>
                  <span style={{fontSize:13,color:'var(--fc-text-2)',fontWeight:600}}>{logDetail.date}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:'var(--fc-text-4)'}}>เวลา</span>
                  <span style={{fontSize:13,color:'var(--fc-text-2)',fontWeight:600,fontVariantNumeric:'tabular-nums'}}>{logDetail.timestamp}</span>
                </div>
              </div>
              <div style={{marginTop:16}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--fc-text-4)',marginBottom:8}}>เปลี่ยนสถานะ</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[
                    {v:'present', l:'มาเรียน', c:'var(--fc-success)'},
                    {v:'late',    l:'มาสาย',   c:'var(--fc-warning)'},
                    {v:'absent',  l:'ขาดเรียน',c:'var(--fc-danger)'},
                    {v:'excused', l:'ลา',      c:'#7c3aed'},
                  ].map(({v,l,c})=>(
                    <button key={v}
                      className="btn btn-sm"
                      onClick={()=>{
                        if (v === 'excused') {
                          const r = window.prompt('ระบุเหตุผลการลา (เว้นว่างได้):','')
                          if (r === null) return
                          updateLogStatus(logDetail.log_id, v, r)
                        } else {
                          updateLogStatus(logDetail.log_id, v)
                        }
                      }}
                      style={{
                        background: logDetail.status === v ? c : 'var(--fc-muted)',
                        color: logDetail.status === v ? '#fff' : 'var(--fc-text-3)',
                        border: `1px solid ${logDetail.status === v ? c : 'var(--fc-border)'}`,
                        fontWeight: logDetail.status === v ? 600 : 400,
                      }}
                    >{l}</button>
                  ))}
                </div>
                {logDetail.status === 'excused' && logDetail.reason && (
                  <div style={{marginTop:8,fontSize:12,color:'#7c3aed',fontStyle:'italic'}}>
                    เหตุผล: {logDetail.reason}
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <button className="btn btn-danger btn-full" onClick={()=>{deleteLog(logDetail.log_id);closeLogDetail()}}>
                  ยกเลิกการเช็คชื่อ
                </button>
                <button className="btn btn-ghost btn-full" onClick={closeLogDetail}>ปิด</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Subject detail */}
      {subDetail && (
        <Modal title={`${subDetail.subject_code} — ${subDetail.subject_name}`} onClose={()=>setSubDetail(null)} maxWidth={680}>
          {/* Subject info section */}
          <div style={{marginBottom:20}}>
            {/* Section header row */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontSize:12,fontWeight:600,color:'var(--fc-text-3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>ข้อมูลรายวิชา</span>
              {subEditing ? (
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setSubEditing(false)}>ยกเลิก</button>
                  <button className="btn btn-primary btn-sm" onClick={saveSubDetail}>บันทึก</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{display:'flex',alignItems:'center',gap:5,color:'var(--fc-primary)'}}
                  onClick={()=>setSubEditing(true)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  แก้ไข
                </button>
              )}
            </div>

            {subEditing ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
                  {[{k:'subject_code',l:'รหัสวิชา'},{k:'subject_name',l:'ชื่อวิชา'}].map(({k,l})=>(
                    <div className="form-group" key={k} style={{marginBottom:0}}>
                      <label className="form-label">{l}</label>
                      <input value={subForm[k]} onChange={e=>setSubForm(f=>({...f,[k]:e.target.value}))} />
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">หมวดวิชา</label>
                    <select value={subForm.category} onChange={e=>setSubForm(f=>({...f,category:e.target.value,teacher_name:''}))}>
                      <option value="">-- ไม่ระบุ --</option>
                      {SUBJECT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">ครูผู้สอน</label>
                    <select
                      value={subForm.teacher_name}
                      onChange={e=>setSubForm(f=>({...f,teacher_name:e.target.value}))}
                      disabled={!subForm.category}
                    >
                      <option value="">{subForm.category ? '— เลือกครู —' : '— เลือกหมวดวิชาก่อน —'}</option>
                      {teachersForCategory(subForm.category).map(t=>(
                        <option key={t.id} value={t.full_name}>{t.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">รายละเอียด</label>
                  <input value={subForm.description} onChange={e=>setSubForm(f=>({...f,description:e.target.value}))} />
                </div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {subDetail.category && (
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:13,color:'var(--fc-text-4)'}}>หมวดวิชา</span>
                    <span className="chip" style={{background:'var(--fc-primary-light)',color:'var(--fc-primary)',fontSize:12}}>{subDetail.category}</span>
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:13,color:'var(--fc-text-4)'}}>ครูผู้สอน</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--fc-text)'}}>{subDetail.teacher_name||'—'}</span>
                </div>
                {subDetail.description && (
                  <div style={{fontSize:13,color:'var(--fc-text-3)',background:'var(--fc-muted)',borderRadius:8,padding:'8px 12px'}}>
                    {subDetail.description}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Schedule list */}
          <div style={{borderTop:'1px solid var(--fc-border)',paddingTop:16,marginTop:4}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--fc-text)',marginBottom:12}}>ตารางสอน</div>
            {subDetail.schedules.length === 0
              ? <div style={{fontSize:13,color:'var(--fc-text-4)',marginBottom:12}}>ยังไม่มีตารางสอน</div>
              : <table className="tbl" style={{marginBottom:12}}>
                  <thead><tr><th>วัน</th><th>เวลา</th><th>ชั้น</th><th>ห้อง</th><th/></tr></thead>
                  <tbody>
                    {subDetail.schedules.map(sc=>(
                      <tr key={sc.id}>
                        <td style={{fontWeight:600}}>{sc.day_of_week}</td>
                        <td style={{fontSize:12,color:'var(--fc-text-3)'}}>{periodLabel(sc.time_start, sc.time_end)}</td>
                        <td>{sc.grade_level||'—'}</td>
                        <td>{sc.room_number||'—'}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={()=>removeSchedule(sc.id)}>ลบ</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }

            {/* Add schedule form */}
            <SchedForm sched={newSched} setSched={setNewSched} onAdd={addSchedule} gradeRooms={gradeRooms} />
          </div>
        </Modal>
      )}

      {/* Modal: Create subject */}
      {showSubject && (
        <Modal title="เพิ่มรายวิชา" onClose={()=>setShowSubject(false)} maxWidth={700}>
          {/* Row 1: รหัสวิชา + ชื่อวิชา */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:12}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label htmlFor="new-sub-subject_code" className="form-label">รหัสวิชา *</label>
              <input id="new-sub-subject_code" placeholder="ว30181"
                value={newSub.subject_code}
                onChange={e=>setNewSub(s=>({...s,subject_code:e.target.value}))}
              />
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label htmlFor="new-sub-subject_name" className="form-label">ชื่อวิชา *</label>
              <input id="new-sub-subject_name" placeholder="เช่น วิทยาการคำนวณ"
                value={newSub.subject_name}
                onChange={e=>setNewSub(s=>({...s,subject_name:e.target.value}))}
              />
            </div>
          </div>
          {/* Row 2: หมวดวิชา + ครูผู้สอน */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:12}}>
            <div className="form-group" style={{marginBottom:0}}>
              <label htmlFor="new-sub-category" className="form-label">หมวดวิชา</label>
              <select id="new-sub-category" value={newSub.category} onChange={e=>setNewSub(s=>({...s,category:e.target.value,teacher_name:''}))}>
                <option value="">-- ไม่ระบุ --</option>
                {SUBJECT_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}>
              <label htmlFor="new-sub-teacher_name" className="form-label">ครูผู้สอน</label>
              <select id="new-sub-teacher_name"
                value={newSub.teacher_name}
                onChange={e=>setNewSub(s=>({...s,teacher_name:e.target.value}))}
                disabled={!newSub.category}
              >
                <option value="">{newSub.category ? '— เลือกครู —' : '— เลือกหมวดวิชาก่อน —'}</option>
                {teachersForCategory(newSub.category).map(t=>(
                  <option key={t.id} value={t.full_name}>{t.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Row 3: รายละเอียด full width */}
          <div className="form-group">
            <label htmlFor="new-sub-description" className="form-label">รายละเอียด</label>
            <input id="new-sub-description" placeholder="คำอธิบายรายวิชา (ไม่บังคับ)"
              value={newSub.description}
              onChange={e=>setNewSub(s=>({...s,description:e.target.value}))}
            />
          </div>

          {/* Schedules */}
          <div style={{borderTop:'1px solid var(--fc-border)',paddingTop:14,marginTop:4}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--fc-text)',marginBottom:10}}>ตารางสอน</div>
            {newSub.schedules.length > 0 && (
              <table className="tbl" style={{marginBottom:10}}>
                <thead><tr><th>วัน</th><th>คาบ</th><th>ชั้น</th><th>ห้อง</th><th/></tr></thead>
                <tbody>
                  {newSub.schedules.map((sc,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{sc.day_of_week}</td>
                      <td style={{fontSize:12,color:'var(--fc-text-3)'}}>{PERIODS[Number(sc.period)]?.label}</td>
                      <td>{sc.grade_level||'—'}</td>
                      <td>{sc.room_number||'—'}</td>
                      <td><button className="btn btn-danger btn-sm" onClick={()=>setNewSub(s=>({...s,schedules:s.schedules.filter((_,j)=>j!==i)}))}>ลบ</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <SchedForm
              sched={newSched} setSched={setNewSched}
              onAdd={() => {
                if (!newSched.grade_level) { flash('กรุณาเลือกชั้น', 'error'); return }
                if (!newSched.room_number) { flash('กรุณาเลือกห้อง', 'error'); return }
                const period = PERIODS[Number(newSched.period)]
                if (newSub.teacher_name) {
                  const conflict = subjects.find(s =>
                    s.teacher_name === newSub.teacher_name &&
                    s.schedules?.some(sc =>
                      sc.day_of_week === newSched.day_of_week &&
                      sc.time_start === period.start &&
                      sc.time_end === period.end
                    )
                  )
                  if (conflict) {
                    flash(`ครู${newSub.teacher_name} มีคาบนี้แล้ว (${conflict.subject_name})`, 'error')
                    return
                  }
                }
                const selfConflict = newSub.schedules.some(sc =>
                  sc.day_of_week === newSched.day_of_week && String(sc.period) === String(newSched.period)
                )
                if (selfConflict) {
                  flash('คาบนี้ถูกเพิ่มในรายวิชานี้แล้ว', 'error')
                  return
                }
                setNewSub(s => ({...s, schedules: [...s.schedules, {...newSched}]}))
              }}
              gradeRooms={gradeRooms}
              requireTeacher={!newSub.teacher_name}
            />
          </div>

          <div style={{display:'flex',gap:8,marginTop:16}}>
            <button className="btn btn-ghost btn-full" onClick={()=>setShowSubject(false)}>ยกเลิก</button>
            <button className="btn btn-primary btn-full" onClick={createSub}>เพิ่มวิชา</button>
          </div>
        </Modal>
      )}

      {/* Audit Log tab */}
      {tab === 'audit' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fc-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-text)' }}>ประวัติการเปลี่ยนแปลง</div>
                <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 2 }}>รวม {auditTotal} รายการ</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => loadAuditLogs(0)}>รีเฟรช</button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>ตั้งแต่วัน</label>
                <input type="date" value={auditFilter.date_from} style={{ width: 148 }}
                  onChange={e => setAuditFilter(f => ({ ...f, date_from: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>ถึงวัน</label>
                <input type="date" value={auditFilter.date_to} style={{ width: 148 }}
                  onChange={e => setAuditFilter(f => ({ ...f, date_to: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>ประเภท</label>
                <select value={auditFilter.action} style={{ width: 160 }}
                  onChange={e => setAuditFilter(f => ({ ...f, action: e.target.value }))}>
                  <option value="">ทุกประเภท</option>
                  <option value="status_change">เปลี่ยนสถานะ</option>
                  <option value="delete">ยกเลิกการเช็คชื่อ</option>
                  <option value="create">บันทึกการเช็คชื่อ</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>รหัสนักเรียน</label>
                <input value={auditFilter.student_id} placeholder="ค้นหา…" style={{ width: 140 }}
                  onChange={e => setAuditFilter(f => ({ ...f, student_id: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && loadAuditLogs(0)} />
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => loadAuditLogs(0)}>แสดงข้อมูล</button>
              {(auditFilter.date_from || auditFilter.date_to || auditFilter.action || auditFilter.student_id) && (
                <button className="btn btn-ghost btn-sm"
                  onClick={() => { const f = { date_from: '', date_to: '', action: '', student_id: '' }; setAuditFilter(f); loadAuditLogs(0, f) }}>
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
          {auditLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '48px 0', fontSize: 13 }}>
              ยังไม่มีประวัติการเปลี่ยนแปลง
            </div>
          ) : (
            <>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>เวลา</th>
                    <th style={{ width: 130 }}>การกระทำ</th>
                    <th style={{ width: 120 }}>ผู้แก้ไข</th>
                    <th>นักเรียน</th>
                    <th>วิชา</th>
                    <th style={{ width: 80 }}>สถานะเดิม</th>
                    <th style={{ width: 80 }}>สถานะใหม่</th>
                    <th style={{ width: 140 }}>เหตุผล</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(r => {
                    const ACTION_CLR = { status_change: '#1A56DB', delete: '#DC2626', create: '#16A34A' }
                    const S = STATUS_MAP
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: 11, color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          <div>{r.log_date}</div>
                          <div>{new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: `${ACTION_CLR[r.action] || '#666'}18`,
                            color: ACTION_CLR[r.action] || 'var(--fc-text-3)',
                          }}>
                            {r.action_label}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--fc-text-2)' }}>{r.changed_by_name}</td>
                        <td>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{r.student_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{r.student_id}</div>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>
                          <div>{r.subject_name}</div>
                          <div style={{ fontSize: 11, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-text-4)' }}>{r.subject_code}</div>
                        </td>
                        <td>
                          {r.old_status && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: S[r.old_status]?.bg, color: S[r.old_status]?.color }}>
                              {S[r.old_status]?.label || r.old_status}
                            </span>
                          )}
                        </td>
                        <td>
                          {r.new_status && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: S[r.new_status]?.bg, color: S[r.new_status]?.color }}>
                              {S[r.new_status]?.label || r.new_status}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: 11, color: '#7c3aed', fontStyle: r.reason ? 'italic' : 'normal' }}>
                          {r.reason || <span style={{ color: 'var(--fc-text-4)', fontStyle: 'normal' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {auditTotal > AUDIT_LIMIT && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--fc-border)' }}>
                <button className="btn btn-ghost btn-sm" disabled={auditOffset === 0} onClick={() => loadAuditLogs(Math.max(0, auditOffset - AUDIT_LIMIT))}>
                  ← ก่อนหน้า
                </button>
                <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>
                  {auditOffset + 1}–{Math.min(auditOffset + AUDIT_LIMIT, auditTotal)} / {auditTotal}
                </span>
                <button className="btn btn-ghost btn-sm" disabled={auditOffset + AUDIT_LIMIT >= auditTotal} onClick={() => loadAuditLogs(auditOffset + AUDIT_LIMIT)}>
                  ถัดไป →
                </button>
              </div>
            )}
            </>
          )}
        </div>
      )}
    </main>
  )
}