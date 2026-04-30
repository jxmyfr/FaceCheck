import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const API = `${import.meta.env.VITE_API_URL}/stats`
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
function Chip({ status, reason }) {
  const map = {
    present: [{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)' }, 'มาเรียน'],
    absent:  [{ background: 'var(--fc-danger-light)',  color: 'var(--fc-danger)'       }, 'ขาดเรียน'],
    late:    [{ background: 'var(--fc-warning-light)', color: 'var(--fc-warning)'      }, 'มาสาย'],
    excused: [{ background: 'rgba(124,58,237,0.1)',    color: '#7c3aed'                }, 'ลา'],
  }
  const [style, label] = map[status] ?? [{ background: 'rgba(0,0,0,0.06)', color: 'var(--fc-text-3)' }, status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="chip" style={style}>{label}</span>
      {status === 'excused' && reason && (
        <span style={{ fontSize: 10, color: '#7c3aed', fontStyle: 'italic' }}>{reason}</span>
      )}
    </span>
  )
}

function StatCard({ label, value, color, sub, icon }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: `${color}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 34, fontWeight: 700, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-3)', marginTop: 7 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>{sub}</div>}
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
function AreaChart({ data, valueKey = 'rate', color = '#1A56DB', height = 110, title }) {
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
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${gradId}-chart-title`}
        style={{ display: 'block', overflow: 'visible' }}>
        <title id={`${gradId}-chart-title`}>{title || 'กราฟแนวโน้ม'}</title>
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

// ── Rate bar ────────────────────────────────────────────────────
function RateBar({ rate, color = 'var(--fc-primary)' }) {
  return (
    <div style={{ height: 5, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${rate ?? 0}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
    </div>
  )
}

// ── TeacherDashboard ────────────────────────────────────────────
function TeacherDashboard() {
  const navigate = useNavigate()
  const [ov, setOv]           = useState(null)
  const [dl30, setDl30]       = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshed, setRefreshed] = useState(new Date())

  // drill-down state: null = subjects, {subject} = rooms, {subject,room} = students
  const [selSubject, setSelSubject] = useState(null)
  const [selRoom, setSelRoom]       = useState(null)
  const [rooms, setRooms]           = useState([])
  const [students, setStudents]     = useState([])
  const [drillLoading, setDrillLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        axios.get(`${API}/teacher-overview`).then(r => r.data),
        axios.get(`${API}/daily?days=30`).then(r => r.data).catch(() => []),
      ])
      setOv(a)
      setDl30(Array.isArray(b) ? b : [])
    } catch { setOv(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, refreshed])

  const drillSubject = async (sub) => {
    setSelSubject(sub)
    setSelRoom(null)
    setDrillLoading(true)
    try {
      const data = await axios.get(`${API}/subject-rooms?subject_id=${sub.id}`).then(r => r.data)
      setRooms(data.rooms || [])
    } catch { setRooms([]) }
    finally { setDrillLoading(false) }
  }

  const drillRoom = async (room) => {
    setSelRoom(room)
    setDrillLoading(true)
    try {
      const q = new URLSearchParams({ subject_id: selSubject.id, grade_level: room.grade_level, room_number: room.room_number })
      const data = await axios.get(`${API}/room-students?${q}`).then(r => r.data)
      setStudents(Array.isArray(data) ? data : [])
    } catch { setStudents([]) }
    finally { setDrillLoading(false) }
  }

  const back = () => {
    if (selRoom) { setSelRoom(null); setStudents([]) }
    else { setSelSubject(null); setRooms([]) }
  }

  const rateColor = (r) => r == null ? 'var(--fc-text-4)' : r >= 80 ? 'var(--fc-success-dark)' : r >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)'
  const barColor  = (r) => r == null ? 'var(--fc-neutral)'  : r >= 80 ? 'var(--fc-success)'      : r >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)'

  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <main id="main-content" className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{today}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setRefreshed(new Date())} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IcRefresh /> รีเฟรช
        </button>
      </div>

      {/* KPI row */}
      {ov && (
        <div className="grid-kpi" style={{ marginBottom: 24 }}>
          {[
            { label: 'นักเรียนที่สอน', value: fmt(ov.total_students), sub: 'คนทั้งหมด', color: '#1A56DB', icon: <IcUsers /> },
            { label: 'รายวิชา',        value: fmt(ov.total_subjects), sub: 'วิชาที่รับผิดชอบ', color: '#7C3AED', icon: <IcBook /> },
            { label: 'เช็คชื่อวันนี้',  value: fmt(ov.today_logs),    sub: 'บันทึกในวันนี้', color: '#16A34A', icon: <IcCheck /> },
            { label: 'บันทึกทั้งหมด',  value: fmt(ov.total_logs),    sub: 'ตลอดภาคเรียน',  color: '#D97706', icon: <IcLog /> },
          ].map(k => <StatCard key={k.label} {...k} />)}
        </div>
      )}

      {/* Overview chart — only at root level */}
      {!selSubject && !loading && dl30.length >= 2 && (
        <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>แนวโน้มการบันทึกการเข้าเรียน</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>30 วันล่าสุด · รวมทุกรายวิชาที่สอน</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--fc-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {dl30[dl30.length - 1]?.count ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>บันทึกวันนี้</div>
            </div>
          </div>
          <AreaChart data={dl30} valueKey="count" color="var(--fc-primary)" height={120} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>{dl30[0]?.date}</span>
            <span style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>{dl30[dl30.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {selSubject && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={back} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            กลับ
          </button>
          <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>รายวิชา</span>
          <IcChevronRight color="var(--fc-text-4)" size={14} />
          <span style={{ fontSize: 13, fontWeight: 600, color: selRoom ? 'var(--fc-text-3)' : 'var(--fc-text)', cursor: selRoom ? 'pointer' : 'default' }}
            onClick={() => selRoom && (setSelRoom(null), setStudents([]))}>
            {selSubject.subject_code} {selSubject.subject_name}
          </span>
          {selRoom && (<>
            <IcChevronRight color="var(--fc-text-4)" size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>
              ชั้น {selRoom.grade_level} ห้อง {selRoom.room_number}
            </span>
          </>)}
        </div>
      )}

      {drillLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div className="spinner" />
        </div>
      )}

      {!drillLoading && !selSubject && !loading && ov && (
        /* ── Level 0: Subject cards ── */
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            รายวิชาของฉัน
          </div>
          {ov.subjects.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '48px 0' }}>
              ยังไม่มีวิชาที่ได้รับมอบหมาย
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {ov.subjects.map(sub => {
                const rate = sub.present_rate
                return (
                  <div key={sub.id} onClick={() => drillSubject(sub)} style={{
                    background: 'var(--fc-surface)', borderRadius: 12,
                    border: '1px solid var(--fc-border)', boxShadow: 'var(--fc-shadow-sm)',
                    padding: '18px 20px', cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--fc-shadow-lg)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--fc-shadow-sm)'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-primary)', fontWeight: 600, marginBottom: 3 }}>{sub.subject_code}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-text)', lineHeight: 1.3 }}>{sub.subject_name}</div>
                        {sub.category && <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>{sub.category}</div>}
                      </div>
                      <IcChevronRight />
                    </div>
                    <RateBar rate={rate} color={barColor(rate)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--fc-text-3)' }}>
                        มา <strong style={{ color: 'var(--fc-success-dark)' }}>{sub.present}</strong>
                        {' · '}สาย <strong style={{ color: 'var(--fc-warning)' }}>{sub.late}</strong>
                        {' · '}ขาด <strong style={{ color: 'var(--fc-danger)' }}>{sub.absent}</strong>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: rateColor(rate) }}>
                        {rate != null ? `${rate}%` : '—'}
                      </span>
                    </div>
                    {sub.today_logs > 0 && (
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fc-primary)', fontWeight: 500 }}>
                        วันนี้: {sub.today_logs} บันทึก
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!drillLoading && selSubject && !selRoom && (
        /* ── Level 1: Room cards ── */
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            ห้องเรียนในวิชานี้
          </div>
          {rooms.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '48px 0' }}>
              ยังไม่มีข้อมูลการเข้าเรียนในวิชานี้
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {rooms.map(room => {
                const rate = room.present_rate
                return (
                  <div key={`${room.grade_level}-${room.room_number}`} onClick={() => drillRoom(room)} style={{
                    background: 'var(--fc-surface)', borderRadius: 12,
                    border: '1px solid var(--fc-border)', boxShadow: 'var(--fc-shadow-sm)',
                    padding: '18px 20px', cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--fc-shadow-lg)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--fc-shadow-sm)'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)' }}>ชั้น {room.grade_level}</div>
                        <div style={{ fontSize: 13, color: 'var(--fc-text-3)' }}>ห้อง {room.room_number}</div>
                      </div>
                      <IcChevronRight />
                    </div>
                    <RateBar rate={rate} color={barColor(rate)} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--fc-text-3)' }}>
                        {room.total_students} นักเรียน · {room.sessions_total} บันทึก
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: rateColor(rate) }}>
                        {rate != null ? `${rate}%` : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!drillLoading && selSubject && selRoom && (
        /* ── Level 2: Student table ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>
              รายชื่อนักเรียน — {students.length} คน
            </div>
          </div>
          {students.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '40px 0', fontSize: 13 }}>
              ยังไม่มีบันทึกการเข้าเรียน
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <th style={{ textAlign: 'center' }}>มาเรียน</th>
                    <th style={{ textAlign: 'center' }}>มาสาย</th>
                    <th style={{ textAlign: 'center' }}>ขาด</th>
                    <th style={{ textAlign: 'center' }}>รวม</th>
                    <th style={{ textAlign: 'right' }}>อัตราเข้าเรียน</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.student_id} style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/students/${encodeURIComponent(s.student_id)}`)}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{s.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{s.student_id}</div>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--fc-success-dark)', fontWeight: 600 }}>{s.present}</td>
                      <td style={{ textAlign: 'center', color: 'var(--fc-warning)',      fontWeight: 600 }}>{s.late}</td>
                      <td style={{ textAlign: 'center', color: 'var(--fc-danger)',       fontWeight: 600 }}>{s.absent}</td>
                      <td style={{ textAlign: 'center', color: 'var(--fc-text-3)' }}>{s.total}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: rateColor(s.present_rate) }}>
                          {s.present_rate != null ? `${s.present_rate}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'teacher') return <TeacherDashboard />
  const [ov, setOv]         = useState(null)
  const [dl, setDl]         = useState([])
  const [dl30, setDl30]     = useState([])
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

  // Log detail modal
  const [logModal, setLogModal]             = useState(null)
  const [logModalUrl, setLogModalUrl]       = useState(null)
  const [logModalLoading, setLogModalLoading] = useState(false)
  const API_ATTEND = import.meta.env.VITE_API_URL + '/attendance'

  const openLogModal = async (r) => {
    setLogModal(r)
    setLogModalUrl(null)
    if (r.has_scan_image && r.log_id) {
      setLogModalLoading(true)
      try {
        const res = await axios.get(`${API_ATTEND}/logs/${r.log_id}/image`, { responseType: 'blob' })
        setLogModalUrl(URL.createObjectURL(res.data))
      } catch {}
      finally { setLogModalLoading(false) }
    }
  }

  const closeLogModal = () => {
    if (logModalUrl) URL.revokeObjectURL(logModalUrl)
    setLogModal(null)
    setLogModalUrl(null)
  }

  const updateLogModalStatus = async (logId, status, reason = '') => {
    try {
      const params = new URLSearchParams({ status })
      if (status === 'excused' && reason) params.append('reason', reason)
      await axios.patch(`${API_ATTEND}/logs/${logId}?${params}`)
      const newReason = status === 'excused' ? reason : null
      setLogModal(d => ({ ...d, status, reason: newReason }))
      if (studentDetail) {
        setStudentDetail(d => ({
          ...d,
          records: d.records.map(r => r.log_id === logId ? { ...r, status, reason: newReason } : r)
        }))
      }
    } catch {}
  }

  const deleteLogModal = async (logId) => {
    if (!window.confirm('ยืนยันการยกเลิกการเช็คชื่อนี้?')) return
    try {
      await axios.delete(`${API_ATTEND}/logs/${logId}`)
      if (studentDetail) {
        setStudentDetail(d => ({ ...d, records: d.records.filter(r => r.log_id !== logId) }))
      }
      closeLogModal()
    } catch {}
  }

  const load = useCallback(async () => {
    try {
      const [a, b, b30, c, d, e, f] = await Promise.all([
        axios.get(`${API}/overview`).then(r => r.data),
        axios.get(`${API}/daily?days=7`).then(r => r.data),
        axios.get(`${API}/daily?days=30`).then(r => r.data),
        axios.get(`${API}/by-subject`).then(r => r.data),
        axios.get(`${API}/logs?limit=8`).then(r => r.data),
        axios.get(`${API}/by-grade`).then(r => r.data),
        axios.get(`${API}/semester-stats`).then(r => r.data).catch(() => null),
      ])
      setOv(a)
      setDl(Array.isArray(b) ? b : [])
      setDl30(Array.isArray(b30) ? b30 : [])
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
  const juniorGrades = byGrade.filter(g => JUNIOR.includes(gradeNum(g.grade_level)))
  const seniorGrades = byGrade.filter(g => SENIOR.includes(gradeNum(g.grade_level)))
  const levelGroups  = [
    {
      name: 'ม.ต้น', desc: 'มัธยมศึกษาปีที่ 1–3', grades: juniorGrades, color: '#1A56DB', colorVar: 'var(--fc-primary)',
      studentCount: juniorGrades.reduce((s, g) => s + g.student_count, 0),
      attendance:   juniorGrades.reduce((s, g) => s + g.today_attendance, 0),
    },
    {
      name: 'ม.ปลาย', desc: 'มัธยมศึกษาปีที่ 4–6', grades: seniorGrades, color: '#7C3AED', colorVar: 'var(--fc-secondary)',
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
  const presentCount = ov ? (ov.present_today ?? ov.attendance_today) : 0
  const lateCount    = ov ? (ov.late_today ?? 0) : 0
  const checkedIn    = presentCount + lateCount
  const absentCount  = ov ? Math.max(0, ov.total_students - checkedIn) : 0
  const total        = ov ? ov.total_students : 1
  const attendanceRate = pct(checkedIn, total)

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

      {/* ── KPI strip ── */}
      <div className="grid-kpi">
        <StatCard label="นักเรียนทั้งหมด"   value={fmt(ov.total_students)}          color="#1A56DB" icon={<IcUsers />} sub="คนที่ลงทะเบียน" />
        <StatCard label="รายวิชา"            value={fmt(ov.total_subjects)}          color="#0891B2" icon={<IcBook />}  sub="วิชาที่เปิดสอน" />
        <StatCard label="เช็คชื่อวันนี้"     value={fmt(checkedIn)}                  color="#16A34A" icon={<IcCheck />} sub={lateCount > 0 ? `มาตรงเวลา ${fmt(presentCount)} · สาย ${fmt(lateCount)}` : `${attendanceRate}% ของทั้งหมด`} />
        <StatCard label="บันทึกสะสม"         value={fmt(ov.total_attendance_logs)}   color="#7C3AED" icon={<IcLog />}   sub="รายการทั้งหมด" />
      </div>

      {/* ── Bento grid ── */}
      <div className="grid-bento">

        {/* Col 1: Today donut — spans 2 rows on wide layouts */}
        <div className="card grid-bento-span" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-text)' }}>วันนี้</div>
            <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>
              {new Date().toLocaleDateString('th-TH', { weekday: 'long' })}
            </div>
          </div>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 128 128"
              role="img"
              aria-label={`อัตราการเข้าเรียนวันนี้: ${attendanceRate}% — มา ${fmt(presentCount)} คน ขาด ${fmt(absentCount)} คน จากทั้งหมด ${fmt(total)} คน`}
              style={{ transform: 'rotate(-90deg)' }}>
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
              <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--fc-text)', letterSpacing: '-0.03em', lineHeight: 1 }}>{attendanceRate}%</span>
              <span style={{ fontSize: 11, color: 'var(--fc-text-4)', fontWeight: 500 }}>เข้าเรียน</span>
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { dot: '#16A34A', label: 'มาเรียน',  val: fmt(presentCount), bold: true  },
              { dot: '#D97706', label: 'มาสาย',    val: fmt(lateCount),    bold: true  },
              { dot: '#DC2626', label: 'ขาดเรียน', val: fmt(absentCount),  bold: true  },
              { dot: '#D1D5DB', label: 'ทั้งหมด',  val: fmt(total),        bold: false },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--fc-text-3)', flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 15, fontWeight: s.bold ? 700 : 500, color: s.bold ? 'var(--fc-text)' : 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>{s.val}</span>
              </div>
            ))}
          </div>
          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: 'var(--fc-border)' }} />
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 8 }}>ม.ต้น vs ม.ปลาย</div>
            {levelGroups.map(g => (
              <div key={g.name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>{g.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: g.colorVar }}>{pct(g.attendance, g.studentCount)}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, background: g.colorVar, width: `${pct(g.attendance, g.studentCount)}%`, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 2 Row 1: 30-day trend chart */}
        <div className="card" style={{ padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)' }}>แนวโน้มการเช็คชื่อ 30 วัน</div>
              <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 3 }}>ครั้ง/วัน รวมทุกรายวิชา</div>
            </div>
            {dl30.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--fc-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{dl30[dl30.length - 1]?.count ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>วันนี้</div>
              </div>
            )}
          </div>
          <AreaChart data={dl30} valueKey="count" color="#1A56DB" height={160} title="กราฟแนวโน้มการเช็คชื่อ 30 วันล่าสุด" />
        </div>

        {/* Col 3 Row 1: Subject ranking */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 14 }}>เช็คชื่อรายวิชา</div>
          {sb.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--fc-text-4)', textAlign: 'center', paddingTop: 24 }}>ยังไม่มีข้อมูล</p>
            : (() => {
                const top = sb.slice(0, 5)
                const maxVal = Math.max(...top.map(s => s.attendance_count), 1)
                const colors = ['var(--fc-primary)', 'var(--fc-info)', 'var(--fc-success)', 'var(--fc-secondary)', 'var(--fc-warning)']
                return top.map((s, i) => (
                  <div key={s.subject_code} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: 'var(--fc-text-3)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subject_name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors[i], flexShrink: 0, marginLeft: 6 }}>{s.attendance_count}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: colors[i], width: `${(s.attendance_count / maxVal) * 100}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))
              })()
          }
        </div>

        {/* Col 2 Row 2: Grade bars */}
        <div className="card" style={{ padding: '22px 26px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 14 }}>อัตราเข้าเรียนวันนี้รายชั้น</div>
          {byGrade.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--fc-text-4)', textAlign: 'center', paddingTop: 24 }}>ยังไม่มีข้อมูลระดับชั้น</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...byGrade].sort((a, b) => (gradeNum(a.grade_level) ?? 99) - (gradeNum(b.grade_level) ?? 99)).map(g => {
                  const rate = pct(g.today_attendance, g.student_count)
                  const tier = rate >= 80
                    ? { color: 'var(--fc-success)', label: 'สูง' }
                    : rate >= 60
                    ? { color: 'var(--fc-warning)', label: 'ปานกลาง' }
                    : { color: 'var(--fc-danger)',  label: 'ต่ำ' }
                  return (
                    <div key={g.grade_level}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-2)' }}>ม.{gradeNum(g.grade_level)}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>{fmt(g.today_attendance)}/{fmt(g.student_count)}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `color-mix(in srgb, ${tier.color} 15%, transparent)`, color: tier.color, flexShrink: 0 }}>{tier.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: tier.color, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right' }}>{rate}%</span>
                        </div>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={rate}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`ชั้นมัธยมศึกษาปีที่ ${gradeNum(g.grade_level)}: ${rate}% (${tier.label})`}
                        style={{ height: 6, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}
                      >
                        <div style={{ height: '100%', borderRadius: 99, background: tier.color, width: `${rate}%`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
        </div>

        {/* Col 3 Row 2: Recent logs mini */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 14 }}>บันทึกล่าสุด</div>
          {lg.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--fc-text-4)', textAlign: 'center', paddingTop: 24 }}>ยังไม่มีบันทึก</p>
            : lg.slice(0, 5).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--fc-primary-light)', color: 'var(--fc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {r.full_name?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fc-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.full_name}</div>
                  <div style={{ fontSize: 10, color: 'var(--fc-text-4)' }}>{r.subject_code} · {new Date(r.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* ── Semester chart (full width, conditional) ── */}
      {smStats && (
        <div className="card" style={{ padding: '22px 26px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
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
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--fc-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>{smStats.trend[smStats.trend.length - 1]?.rate ?? 0}%</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 4 }}>วันล่าสุด</div>
            </div>
          </div>
          <AreaChart data={smStats.trend} valueKey="rate" color="#1A56DB" height={130} title={`กราฟอัตราการเข้าเรียนตลอดภาคเรียน ${smStats.semester?.name ?? ''}`} />
        </div>
      )}

      {/* ── Drill-down section ── */}
      <div style={{ marginBottom: 20 }}>

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
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            drillStudent(s)
                          }
                        }}
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
                      <AreaChart data={studentDetail.trend} valueKey="rate" color={trendColor} height={120} title={`แนวโน้มการเข้าเรียนของ ${studentDetail.student.full_name}`} />
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
                          <tr key={i}
                            onClick={() => openLogModal(r)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--fc-muted)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-2)' }}>
                              {new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{r.subject_name}</div>
                              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{r.subject_code}</div>
                            </td>
                            <td style={{ color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Chip status={r.status} reason={r.reason} />
                                <IcChevronRight color="var(--fc-border)" size={13} />
                              </div>
                            </td>
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

      {/* Log detail modal */}
      {logModal && (
        <div className="modal-overlay" onClick={closeLogModal}>
          <div className="modal" style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Scan image */}
            <div style={{ background: '#111', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {logModal.has_scan_image ? (
                logModalLoading ? (
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                ) : logModalUrl ? (
                  <img src={logModalUrl} alt="รูปสแกน"
                    style={{ width: '100%', maxHeight: 300, objectFit: 'contain', display: 'block' }} />
                ) : (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>โหลดรูปไม่สำเร็จ</span>
                )
              ) : (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>ไม่มีรูปสแกน</span>
              )}
              <button onClick={closeLogModal} style={{
                position: 'absolute', top: 10, right: 10,
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: '30px', textAlign: 'center', padding: 0,
              }}>✕</button>
            </div>

            {/* Info */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fc-text)', marginBottom: 4 }}>{logModal.subject_name}</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-text-4)', marginBottom: 16 }}>{logModal.subject_code}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>วันที่</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    {new Date(logModal.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>เวลา</div>
                  <div style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{logModal.time} น.</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>สถานะ</div>
                  <Chip status={logModal.status} reason={logModal.reason} />
                </div>
                {logModal.status === 'excused' && logModal.reason && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>เหตุผล</div>
                    <div style={{ fontSize: 13, color: '#7c3aed', fontStyle: 'italic' }}>{logModal.reason}</div>
                  </div>
                )}
              </div>

              {/* Admin actions */}
              {user?.role === 'admin' && logModal.log_id && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-4)', marginBottom: 8 }}>เปลี่ยนสถานะ</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {[
                      { v: 'present', l: 'มาเรียน', c: 'var(--fc-success)' },
                      { v: 'late',    l: 'มาสาย',   c: 'var(--fc-warning)' },
                      { v: 'absent',  l: 'ขาดเรียน',c: 'var(--fc-danger)'  },
                      { v: 'excused', l: 'ลา',      c: '#7c3aed'           },
                    ].map(({ v, l, c }) => (
                      <button key={v}
                        className="btn btn-sm"
                        onClick={() => {
                          if (v === 'excused') {
                            const r = window.prompt('ระบุเหตุผลการลา (เว้นว่างได้):', '')
                            if (r === null) return
                            updateLogModalStatus(logModal.log_id, v, r)
                          } else {
                            updateLogModalStatus(logModal.log_id, v)
                          }
                        }}
                        style={{
                          background: logModal.status === v ? c : 'var(--fc-muted)',
                          color: logModal.status === v ? '#fff' : 'var(--fc-text-3)',
                          border: `1px solid ${logModal.status === v ? c : 'var(--fc-border)'}`,
                          fontWeight: logModal.status === v ? 600 : 400,
                        }}
                      >{l}</button>
                    ))}
                  </div>
                  <button className="btn btn-danger btn-full btn-sm"
                    onClick={() => deleteLogModal(logModal.log_id)}>
                    ยกเลิกการเช็คชื่อ
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
