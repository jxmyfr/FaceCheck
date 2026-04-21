import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1/stats'
const pct = (v, t) => (t > 0 ? Math.round((v / t) * 100) : 0)
const fmt = (n) => Number(n).toLocaleString('th-TH')
const DAY = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const gradeNum = (g) => {
  if (!g) return null
  const n = parseInt(String(g).replace(/[^\d]/g, ''))
  return isNaN(n) ? null : n
}
const JUNIOR = [1, 2, 3]
const SENIOR = [4, 5, 6]

// ── SVG Icons ──────────────────────────────────────────────────
const IcUsers = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IcBook = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
)
const IcCheck = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IcLog = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
)
const IcRefresh = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
const IcChevronRight = ({ color = '#D1D5DB', size = 16 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

// ── Components ─────────────────────────────────────────────────
function Chip({ status }) {
  const map = {
    present: [{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)' }, 'มาเรียน'],
    absent:  [{ background: 'var(--fc-danger-light)',  color: 'var(--fc-danger)'       }, 'ขาดเรียน'],
    late:    [{ background: 'var(--fc-warning-light)', color: 'var(--fc-warning)'      }, 'มาสาย'],
  }
  const [style, label] = map[status] ?? [{ background: 'rgba(0,0,0,0.06)', color: 'var(--fc-text-3)' }, status]
  return <span className="chip" style={style}>{label}</span>
}

function StatCard({ label, value, color, sub, icon }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: `color-mix(in srgb, ${color} 9%, transparent)`, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-3)' }}>{label}</div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--fc-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 7 }}>{sub}</div>}
    </div>
  )
}

function DrillCard({ title, sub, studentCount, attendance, rate, color = '#1A56DB', onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? color + '06' : 'var(--fc-surface)',
        borderRadius: 12,
        border: '1px solid var(--fc-border)',
        boxShadow: hov ? 'var(--fc-shadow-lg)' : 'var(--fc-shadow-sm)',
        transform: hov ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.15s, transform 0.15s, background 0.15s',
        cursor: 'pointer',
        padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-text)' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 2 }}>{sub}</div>}
        </div>
        <IcChevronRight />
      </div>
      <div style={{ height: 4, background: 'var(--fc-muted)', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: '100%', transformOrigin: 'left', transform: `scaleX(${rate / 100})`, transition: 'transform 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>
          มาเรียน <strong style={{ color: 'var(--fc-success)' }}>{fmt(attendance)}</strong> / {fmt(studentCount)} คน
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{rate}%</span>
      </div>
    </div>
  )
}

// ── AreaChart ───────────────────────────────────────────────────
function AreaChart({ data, valueKey = 'rate', color = '#1A56DB', height = 110 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>ยังไม่มีข้อมูลกราฟ</span>
    </div>
  )
  const vals   = data.map(d => d[valueKey])
  const max    = Math.max(...vals, 1)
  const chartH = height - 24
  const PAD    = 4

  const xs = (i) => PAD + (i / (data.length - 1)) * (100 - PAD * 2)
  const ys = (v) => PAD + (1 - v / max) * (chartH - PAD * 2)

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)},${ys(d[valueKey])}`).join(' ')
  const areaPath = `${linePath} L ${xs(data.length - 1)},${chartH} L ${PAD},${chartH} Z`

  const n    = data.length
  const step = Math.max(1, Math.floor(n / 5))
  const idxs = [...new Set([0, step, step * 2, step * 3, step * 4, n - 1])].filter(i => i < n)
  const dotIdxs = n <= 30 ? data.map((_, i) => i) : idxs
  const gradId = `ag${color.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <div>
      <svg viewBox={`0 0 100 ${chartH}`} width="100%" height={chartH}
        preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t} x1="0" y1={PAD + (1 - t) * (chartH - PAD * 2)}
            x2="100" y2={PAD + (1 - t) * (chartH - PAD * 2)}
            stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
        ))}
        <path d={areaPath} fill={`url(#${gradId})`}/>
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.8"
          vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
        {/* dots */}
        {dotIdxs.map(i => (
          <circle key={i} cx={xs(i)} cy={ys(data[i][valueKey])} r="1.4"
            fill={color} vectorEffect="non-scaling-stroke"/>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {idxs.map(i => (
          <span key={i} style={{ fontSize: 10, color: 'var(--fc-text-4)', lineHeight: 1 }}>
            {new Date(data[i].date + 'T00:00:00').toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function Dashboard() {
  const [ov, setOv]         = useState(null)
  const [dl, setDl]         = useState([])
  const [sb, setSb]         = useState([])
  const [lg, setLg]         = useState([])
  const [byGrade, setByGrade]     = useState([])
  const [smStats, setSmStats]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [refreshed, setRefreshed] = useState(new Date())

  const [drillLevel, setDrillLevel]       = useState(0)
  const [selGroup, setSelGroup]           = useState(null)
  const [selGrade, setSelGrade]           = useState(null)
  const [selRoom, setSelRoom]             = useState(null)
  const [selStudent, setSelStudent]       = useState(null)
  const [byRoom, setByRoom]               = useState([])
  const [drillStudents, setDrillStudents] = useState([])
  const [studentDetail, setStudentDetail] = useState(null)
  const [drillLoading, setDrillLoading]   = useState(false)

  const load = useCallback(async () => {
    try {
      const [a, b, c, d, e, f] = await Promise.all([
        axios.get(`${API}/overview`).then(r => r.data),
        axios.get(`${API}/daily?days=7`).then(r => r.data),
        axios.get(`${API}/by-subject`).then(r => r.data),
        axios.get(`${API}/logs?limit=8`).then(r => r.data),
        axios.get(`${API}/by-grade`).then(r => r.data),
        axios.get(`${API}/semester-stats`).then(r => r.data).catch(() => null),
      ])
      setOv(a)
      setDl(Array.isArray(b) ? b : [])
      setSb(Array.isArray(c) ? c : [])
      setLg(Array.isArray(d) ? d : [])
      setByGrade(Array.isArray(e) ? e : [])
      setSmStats(f?.trend?.length ? f : null)
      setRefreshed(new Date())
      setError(null)
    } catch {
      setError('เชื่อมต่อ API ไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  // Navigation
  const goSchool  = () => { setDrillLevel(0); setSelGroup(null); setSelGrade(null); setSelRoom(null); setSelStudent(null) }
  const goGroup   = () => { setDrillLevel(1); setSelGrade(null); setSelRoom(null); setSelStudent(null) }
  const goRoom    = () => { setDrillLevel(3); setSelStudent(null) }
  const goGrade   = async () => {
    setDrillLoading(true)
    try {
      const res = await axios.get(`${API}/by-room?grade_level=${encodeURIComponent(selGrade)}`)
      setByRoom(Array.isArray(res.data) ? res.data : [])
      setDrillLevel(2); setSelRoom(null); setSelStudent(null)
    } catch {} finally { setDrillLoading(false) }
  }

  const drillGroup = (group) => { setSelGroup(group); setDrillLevel(1) }

  const drillGrade = async (rawGrade) => {
    setDrillLoading(true); setSelGrade(rawGrade)
    try {
      const res = await axios.get(`${API}/by-room?grade_level=${encodeURIComponent(rawGrade)}`)
      setByRoom(Array.isArray(res.data) ? res.data : [])
      setDrillLevel(2)
    } catch {} finally { setDrillLoading(false) }
  }

  const drillRoom = async (rawRoom) => {
    setDrillLoading(true); setSelRoom(rawRoom)
    try {
      const res = await axios.get(
        `${API}/students-detail?grade_level=${encodeURIComponent(selGrade)}&room_number=${encodeURIComponent(rawRoom)}`
      )
      setDrillStudents(Array.isArray(res.data) ? res.data : [])
      setDrillLevel(3)
    } catch {} finally { setDrillLoading(false) }
  }

  const drillStudent = async (student) => {
    setSelStudent(student); setDrillLoading(true)
    try {
      const res = await axios.get(`${API}/student-attendance?student_id=${encodeURIComponent(student.student_id)}`)
      setStudentDetail(res.data)
      setDrillLevel(4)
    } catch {} finally { setDrillLoading(false) }
  }

  // Derived
  const today  = new Date().getDay()
  const maxDl  = Math.max(...dl.map(d => d.count), 1)
  const bars   = Array.from({ length: 7 }, (_, i) => ({
    label: DAY[(today - 6 + i + 7) % 7],
    count: dl[i]?.count ?? 0,
    today: i === 6,
  }))
  const maxSb = Math.max(...sb.map(s => s.attendance_count), 1)

  const juniorGrades = byGrade.filter(g => JUNIOR.includes(gradeNum(g.grade_level)))
  const seniorGrades = byGrade.filter(g => SENIOR.includes(gradeNum(g.grade_level)))
  const levelGroups  = [
    {
      name: 'ม.ต้น', desc: 'มัธยมศึกษาปีที่ 1–3', grades: juniorGrades, color: '#1A56DB',
      studentCount: juniorGrades.reduce((s, g) => s + g.student_count, 0),
      attendance:   juniorGrades.reduce((s, g) => s + g.today_attendance, 0),
    },
    {
      name: 'ม.ปลาย', desc: 'มัธยมศึกษาปีที่ 4–6', grades: seniorGrades, color: '#7C3AED',
      studentCount: seniorGrades.reduce((s, g) => s + g.student_count, 0),
      attendance:   seniorGrades.reduce((s, g) => s + g.today_attendance, 0),
    },
  ]
  const curGroup       = levelGroups.find(g => g.name === selGroup)
  const gradesForDrill = curGroup
    ? [...curGroup.grades].sort((a, b) => gradeNum(a.grade_level) - gradeNum(b.grade_level))
    : []

  const crumbs = [
    { label: 'ทั้งโรงเรียน', onClick: drillLevel > 0 ? goSchool : null, active: drillLevel === 0 },
    ...(drillLevel >= 1 ? [{ label: selGroup, onClick: drillLevel > 1 ? goGroup : null, active: drillLevel === 1 }] : []),
    ...(drillLevel >= 2 ? [{ label: `ม.${gradeNum(selGrade)}`, onClick: drillLevel > 2 ? goGrade : null, active: drillLevel === 2 }] : []),
    ...(drillLevel >= 3 ? [{ label: `ห้อง ${selRoom}`, onClick: drillLevel > 3 ? goRoom : null, active: drillLevel === 3 }] : []),
    ...(drillLevel >= 4 ? [{ label: selStudent?.full_name, onClick: null, active: true }] : []),
  ]

  // Donut params — multi-segment
  const R = 52, SW = 14, CIRC = 2 * Math.PI * R
  const attendanceRate = ov ? pct(ov.attendance_today, ov.total_students) : 0
  const lateCount    = 0 // backend doesn't split present/late in overview; use 0 for now
  const presentCount = ov ? ov.attendance_today : 0
  const absentCount  = ov ? Math.max(0, ov.total_students - ov.attendance_today) : 0
  const total        = ov ? ov.total_students : 1

  const donutSegments = [
    { value: presentCount, color: '#16A34A' },
    { value: lateCount,    color: '#D97706' },
    { value: absentCount,  color: '#F3F4F6' },
  ]
  const donutArcs = donutSegments.reduce((acc, seg) => {
    const dash = (seg.value / Math.max(total, 1)) * CIRC
    acc.arcs.push({ ...seg, dash, gap: CIRC - dash, offset: -acc.total })
    acc.total += dash
    return acc
  }, { arcs: [], total: 0 }).arcs

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      <p style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>กำลังโหลด...</p>
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360, flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: 'var(--fc-danger)' }}>{error}</p>
      <button className="btn btn-ghost" onClick={load}>ลองใหม่</button>
    </div>
  )

  return (
    <main id="main-content" className="page">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &ensp;·&ensp;อัปเดต {refreshed.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><IcRefresh /> รีเฟรช</button>
      </div>

      {/* ── ภาพรวมทั้งโรงเรียน ── */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          ภาพรวมทั้งโรงเรียน
        </p>

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
          <StatCard label="นักเรียนทั้งหมด" value={fmt(ov.total_students)} color="#1A56DB" icon={<IcUsers />} sub="คนที่ลงทะเบียนในระบบ" />
          <StatCard label="รายวิชา"          value={fmt(ov.total_subjects)} color="#0891B2" icon={<IcBook />}  sub="วิชาที่เปิดสอน" />
          <StatCard label="เช็คชื่อวันนี้"   value={fmt(ov.attendance_today)} color="#16A34A" icon={<IcCheck />}
            sub={`${attendanceRate}% ของนักเรียนทั้งหมด`} />
          <StatCard label="บันทึกสะสม"       value={fmt(ov.total_attendance_logs)} color="#7C3AED" icon={<IcLog />}  sub="รายการเช็คชื่อทั้งหมด" />
        </div>

        {/* Overview row: big donut + bar chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 20 }}>

          {/* Attendance rate card */}
          <div className="card" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 32 }}>
            {/* Multi-segment Donut */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                {donutArcs.map((seg, i) => (
                  <circle key={i} cx="64" cy="64" r={R} fill="none"
                    stroke={seg.color} strokeWidth={SW}
                    strokeDasharray={`${seg.dash} ${seg.gap}`}
                    strokeDashoffset={seg.offset}
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                ))}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--fc-text)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {attendanceRate}%
                </span>
                <span style={{ fontSize: 11, color: 'var(--fc-text-4)', fontWeight: 500 }}>เข้าเรียน</span>
              </div>
            </div>

            {/* Stats beside donut */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fc-text)', marginBottom: 16 }}>อัตราการเข้าเรียนวันนี้</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fc-success)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--fc-text-3)', flex: 1 }}>มาเรียน</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)' }}>{fmt(ov.attendance_today)}</span>
                  <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>คน</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fc-danger)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--fc-text-3)', flex: 1 }}>ขาดเรียน</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)' }}>{fmt(ov.total_students - ov.attendance_today)}</span>
                  <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>คน</span>
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fc-neutral)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--fc-text-3)', flex: 1 }}>นักเรียนทั้งหมด</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)' }}>{fmt(ov.total_students)}</span>
                  <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>คน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="card" style={{ padding: '28px 28px 24px' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 20 }}>การเช็คชื่อรายวัน</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
              {bars.map((b, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10, color: 'var(--fc-text-4)', visibility: b.count ? 'visible' : 'hidden' }}>{b.count}</span>
                  <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', flex: 1 }}>
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '4px 4px 0 0',
                      background: b.today ? 'var(--fc-primary)' : 'var(--fc-primary-light)',
                      transformOrigin: 'bottom',
                      transform: `scaleY(${b.count ? Math.max(b.count / maxDl, 0.08) : 0.04})`,
                      transition: 'transform 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: b.today ? 700 : 400, color: b.today ? 'var(--fc-primary)' : 'var(--fc-text-4)' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Semester overview chart ── */}
      {smStats && (
        <div style={{ marginBottom: 20 }}>
          <div className="card" style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)' }}>อัตราการเข้าเรียนตลอดภาคเรียน</div>
                {smStats.semester && (
                  <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 3 }}>
                    {smStats.semester.name}
                    {smStats.semester.term_start && ` · ${new Date(smStats.semester.term_start + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    {smStats.semester.term_end && ` – ${new Date(smStats.semester.term_end + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--fc-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {smStats.trend[smStats.trend.length - 1]?.rate ?? 0}%
                </div>
                <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 4 }}>วันล่าสุด</div>
              </div>
            </div>
            <AreaChart data={smStats.trend} valueKey="rate" color="#1A56DB" height={130} />
          </div>
        </div>
      )}

      {/* ── Drill-down section ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fc-text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
          เจาะลึกตามระดับชั้น
        </p>

        <div className="card" style={{ padding: '20px 24px' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 20, flexWrap: 'wrap' }}>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {i > 0 && <IcChevronRight color="#E5E7EB" size={14} />}
                <button
                  onClick={c.onClick ?? undefined}
                  disabled={!c.onClick}
                  style={{
                    fontSize: 13,
                    fontWeight: c.active ? 700 : 500,
                    color: c.active ? 'var(--fc-text)' : 'var(--fc-primary)',
                    background: 'none', border: 'none',
                    padding: '2px 6px', borderRadius: 5,
                    cursor: c.onClick ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                  }}
                >
                  {c.label}
                </button>
              </span>
            ))}
          </div>

          {/* Drill content */}
          {drillLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner" />
            </div>

          ) : drillLevel === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              {levelGroups.map(g => (
                <DrillCard
                  key={g.name} title={g.name} sub={g.desc}
                  studentCount={g.studentCount} attendance={g.attendance}
                  rate={pct(g.attendance, g.studentCount)} color={g.color}
                  onClick={() => drillGroup(g.name)}
                />
              ))}
            </div>

          ) : drillLevel === 1 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {gradesForDrill.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', gridColumn: '1/-1', textAlign: 'center', padding: '24px 0' }}>ยังไม่มีข้อมูลระดับชั้น</p>
                : gradesForDrill.map(g => (
                  <DrillCard
                    key={g.grade_level}
                    title={`ชั้นมัธยมศึกษาปีที่ ${gradeNum(g.grade_level)}`}
                    sub={`${fmt(g.student_count)} คน`}
                    studentCount={g.student_count} attendance={g.today_attendance}
                    rate={pct(g.today_attendance, g.student_count)} color={curGroup.color}
                    onClick={() => drillGrade(g.grade_level)}
                  />
                ))
              }
            </div>

          ) : drillLevel === 2 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              {byRoom.length === 0
                ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', gridColumn: '1/-1', textAlign: 'center', padding: '24px 0' }}>ยังไม่มีข้อมูลห้องเรียน</p>
                : [...byRoom]
                    .sort((a, b) => String(a.room_number).localeCompare(String(b.room_number), undefined, { numeric: true }))
                    .map(r => (
                      <DrillCard
                        key={r.room_number}
                        title={`ห้อง ${r.room_number}`}
                        sub={`${fmt(r.student_count)} คน`}
                        studentCount={r.student_count} attendance={r.today_attendance}
                        rate={pct(r.today_attendance, r.student_count)} color={curGroup?.color ?? '#1A56DB'}
                        onClick={() => drillRoom(r.room_number)}
                      />
                    ))
              }
            </div>

          ) : drillLevel === 3 ? (
            drillStudents.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', textAlign: 'center', padding: '24px 0' }}>ยังไม่มีนักเรียนในห้องนี้</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>รหัสนักเรียน</th>
                      <th>ชื่อ-นามสกุล</th>
                      <th>ชั้น</th>
                      <th>ห้อง</th>
                      <th style={{ textAlign: 'right' }}>เช็คชื่อสะสม</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {drillStudents.map(s => (
                      <tr
                        key={s.student_id}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => drillStudent(s)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && drillStudent(s)}
                      >
                        <td style={{ fontFamily: 'var(--fc-font-mono)', fontWeight: 600, color: 'var(--fc-text-2)' }}>{s.student_id}</td>
                        <td style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{s.full_name}</td>
                        <td style={{ color: 'var(--fc-text-3)' }}>{s.grade_level ?? '—'}</td>
                        <td style={{ color: 'var(--fc-text-3)' }}>{s.room_number ?? '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="chip" style={{ background: 'var(--fc-primary-light)', color: 'var(--fc-primary)' }}>
                            {s.total_attendance} ครั้ง
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: 4 }}>
                          <IcChevronRight color="#D1D5DB" size={14} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )

          ) : drillLevel === 4 ? (
            !studentDetail ? null : (
              <div>
                {/* Student header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--fc-primary-light)', color: 'var(--fc-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, flexShrink: 0,
                  }}>
                    {studentDetail.student.full_name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--fc-text)' }}>{studentDetail.student.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 3, display: 'flex', gap: 8 }}>
                      <span>รหัส {studentDetail.student.student_id}</span>
                      {studentDetail.student.grade_level && <span>· ม.{gradeNum(studentDetail.student.grade_level)}</span>}
                      {studentDetail.student.room_number && <span>/ {studentDetail.student.room_number}</span>}
                    </div>
                  </div>
                </div>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { label: 'มาเรียน',    value: studentDetail.summary.present, color: 'var(--fc-success)', bg: 'var(--fc-success-light)' },
                    { label: 'มาสาย',      value: studentDetail.summary.late,    color: 'var(--fc-warning)', bg: 'var(--fc-warning-light)' },
                    { label: 'ขาดเรียน',   value: studentDetail.summary.absent,  color: 'var(--fc-danger)',  bg: 'var(--fc-danger-light)'  },
                    { label: 'รวมทั้งหมด', value: studentDetail.summary.total,   color: 'var(--fc-primary)', bg: 'var(--fc-primary-light)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, borderRadius: 10, padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 6, opacity: 0.85 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Attendance trend chart */}
                {studentDetail.trend?.length >= 2 && (() => {
                  const lastRate = studentDetail.trend[studentDetail.trend.length - 1].rate
                  const trendColor = lastRate >= 80 ? '#16A34A' : lastRate >= 60 ? '#D97706' : '#DC2626'
                  return (
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>แนวโน้มการเข้าเรียน</div>
                          <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>นับตั้งแต่วันแรกที่เช็คชื่อ</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 28, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                            {lastRate}%
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>วันนี้</div>
                        </div>
                      </div>
                      <AreaChart data={studentDetail.trend} valueKey="rate" color={trendColor} height={120} />
                    </div>
                  )
                })()}

                {/* Attendance records */}
                {studentDetail.records.length === 0
                  ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', textAlign: 'center', padding: '24px 0' }}>ยังไม่มีบันทึกการเข้าเรียน</p>
                  : (
                    <div style={{ overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>วันที่</th>
                          <th>รายวิชา</th>
                          <th>เวลา</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentDetail.records.map((r, i) => (
                          <tr key={i}>
                            <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-2)' }}>
                              {new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{r.subject_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{r.subject_code}</div>
                            </td>
                            <td style={{ color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</td>
                            <td><Chip status={r.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )
                }
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>

        {/* Recent logs */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 16 }}>บันทึกล่าสุด</div>
          {lg.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', textAlign: 'center', padding: '24px 0' }}>ยังไม่มีบันทึก</p>
            : (
              <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead><tr>
                  <th>นักเรียน</th><th>วิชา</th><th>เวลา</th><th>สถานะ</th>
                </tr></thead>
                <tbody>
                  {lg.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--fc-primary-light)', color: 'var(--fc-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {r.full_name?.[0]}
                          </div>
                          <span style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{r.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--fc-text-3)', fontFamily: 'var(--fc-font-mono)', fontSize: 12 }}>{r.subject_code}</td>
                      <td style={{ color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td><Chip status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )
          }
        </div>

        {/* Subject bars */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 16 }}>รายวิชา</div>
          {sb.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--fc-text-4)', textAlign: 'center', padding: '20px 0' }}>ยังไม่มีข้อมูล</p>
            : sb.slice(0, 8).map(s => (
              <div key={s.subject_code} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fc-text-2)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.subject_name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--fc-text-4)', flexShrink: 0, marginLeft: 8 }}>{s.attendance_count}</span>
                </div>
                <div style={{ height: 5, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: 'var(--fc-primary)', width: '100%', transformOrigin: 'left', transform: `scaleX(${s.attendance_count / maxSb})`, transition: 'transform 0.5s ease' }} />
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </main>
  )
}
