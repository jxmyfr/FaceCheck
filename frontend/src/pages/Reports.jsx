import { useEffect, useState } from 'react'
import axios from 'axios'
import { useDialog } from '../hooks/useDialog'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL

const STATUS_CFG = {
  present: { label: 'มาเรียน', color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
  late:    { label: 'มาสาย',   color: 'var(--fc-warning)',       bg: 'var(--fc-warning-light)' },
  absent:  { label: 'ขาดเรียน',color: 'var(--fc-danger)',        bg: 'var(--fc-danger-light)'  },
  excused: { label: 'ลา',      color: '#7c3aed',                 bg: 'rgba(124,58,237,0.1)'    },
}

const IcDownload = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

export default function Reports() {
  const { dialog, alert } = useDialog()
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const today = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })()
  const [filters, setFilters] = useState({
    date_from: today,
    date_to:   today,
    subject_id: '',
    grade_level: '',
    room_number: '',
  })
  const [subjects, setSubjects] = useState([])
  const [grades, setGrades]     = useState([])
  const [gradeRooms, setGradeRooms] = useState({})
  const [logs, setLogs]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [exporting, setExporting] = useState(false)
  const [searched, setSearched] = useState(false)
  const [semesters, setSemesters] = useState([])

  useEffect(() => {
    const subjectUrl = isTeacher ? `${API}/auth/me/subjects` : `${API}/attendance/subjects`
    axios.get(subjectUrl).then(r => setSubjects(r.data)).catch(() => {})
    axios.get(`${API}/settings/semesters`).then(r => setSemesters(r.data)).catch(() => {})
    axios.get(`${API}/enroll/students`).then(r => {
      const gr = {}
      r.data.forEach(s => {
        if (!s.grade_level) return
        if (!gr[s.grade_level]) gr[s.grade_level] = new Set()
        if (s.room_number) gr[s.grade_level].add(s.room_number)
      })
      const grMap = Object.fromEntries(
        Object.entries(gr).map(([g, rs]) => [g, [...rs].sort((a, b) => Number(a) - Number(b))])
      )
      setGradeRooms(grMap)
      setGrades(Object.keys(grMap).sort())
    }).catch(() => {})
  }, [])

  const setFilter = (key, val) => {
    setFilters(f => {
      const next = { ...f, [key]: val }
      if (key === 'grade_level') next.room_number = ''
      return next
    })
  }

  const search = async () => {
    setLoading(true)
    setSearched(true)
    setGbData(null)
    try {
      const q = new URLSearchParams()
      if (filters.date_from)   q.append('date_from',   filters.date_from)
      if (filters.date_to)     q.append('date_to',     filters.date_to)
      if (filters.subject_id)  q.append('subject_id',  filters.subject_id)
      if (filters.grade_level) q.append('grade_level', filters.grade_level)
      if (filters.room_number) q.append('room_number', filters.room_number)
      const res = await axios.get(`${API}/attendance/logs?${q}`)
      setLogs(res.data)
    } catch { setLogs([]) }
    finally { setLoading(false) }
    if (filters.subject_id) {
      setGbLoading(true)
      try {
        const q2 = new URLSearchParams({ subject_id: filters.subject_id })
        if (filters.date_from) q2.append('date_from', filters.date_from)
        if (filters.date_to)   q2.append('date_to',   filters.date_to)
        const r2 = await axios.get(`${API}/stats/subject-attendance?${q2}`)
        setGbData(r2.data)
      } catch { setGbData(null) }
      finally { setGbLoading(false) }
    }
  }

  const exportExcel = async () => {
    setExporting(true)
    try {
      const q = new URLSearchParams()
      if (filters.date_from)   q.append('date_from', filters.date_from)
      if (filters.date_to)     q.append('date_to',   filters.date_to)
      if (filters.subject_id)  q.append('subject_id', filters.subject_id)
      if (filters.grade_level) q.append('grade_level', filters.grade_level)
      if (filters.room_number) q.append('room_number', filters.room_number)
      const res = await axios.get(`${API}/reports/export?${q}`, { responseType: 'blob' })
      const url  = URL.createObjectURL(res.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `attendance_${filters.date_from}_${filters.date_to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { await alert('Export ไม่สำเร็จ กรุณาลองใหม่') }
    finally { setExporting(false) }
  }

  const [view, setView] = useState('detail') // 'detail' | 'summary' | 'gradebook'
  const [gbData, setGbData]     = useState(null)
  const [gbLoading, setGbLoading] = useState(false)

  const rooms = filters.grade_level
    ? (gradeRooms[filters.grade_level] || [])
    : [...new Set(Object.values(gradeRooms).flat())].sort((a, b) => Number(a) - Number(b))

  const totals = {
    present:         logs.filter(l => l.status === 'present').length,
    late:            logs.filter(l => l.status === 'late').length,
    absent:          logs.filter(l => l.status === 'absent').length,
    excused:         logs.filter(l => l.status === 'excused').length,
    already_checked: logs.filter(l => l.status === 'already_checked').length,
  }

  const summaryRows = (() => {
    const map = {}
    logs.forEach(l => {
      const key = `${l.grade_level || '—'}__${l.room_number || '—'}`
      if (!map[key]) map[key] = { grade_level: l.grade_level || '—', room_number: l.room_number || '—', present: 0, late: 0, absent: 0, excused: 0 }
      if (l.status === 'present') map[key].present++
      else if (l.status === 'late') map[key].late++
      else if (l.status === 'absent') map[key].absent++
      else if (l.status === 'excused') map[key].excused++
    })
    return Object.values(map).sort((a, b) => {
      const ga = a.grade_level, gb = b.grade_level
      if (ga !== gb) return ga < gb ? -1 : 1
      return Number(a.room_number) - Number(b.room_number)
    })
  })()

  const printTitle = (() => {
    const parts = []
    if (filters.date_from === filters.date_to) parts.push(`วันที่ ${filters.date_from}`)
    else parts.push(`${filters.date_from} ถึง ${filters.date_to}`)
    const sub = subjects.find(s => String(s.id) === String(filters.subject_id))
    if (sub) parts.push(sub.subject_name)
    if (filters.grade_level) parts.push(`ชั้น ${filters.grade_level}`)
    if (filters.room_number) parts.push(`ห้อง ${filters.room_number}`)
    return parts.join(' · ')
  })()

  return (
    <main id="main-content" className="page">
      {dialog}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; inset: 0; padding: 24px 32px; }
          .print-hide { display: none !important; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }} className="print-hide">
        <h1 className="page-title">รายงาน</h1>
        <p className="page-sub">ออกรายงานการเช็คอินและ Export Excel</p>
      </div>

      {/* Filter card */}
      <div className="card print-hide" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>เงื่อนไขการค้นหา</div>
          {semesters.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>ดูตามภาคเรียน:</label>
              <select
                style={{ fontSize: 12, padding: '4px 10px' }}
                defaultValue=""
                onChange={e => {
                  const s = semesters.find(x => String(x.id) === e.target.value)
                  if (s && s.term_start && s.term_end) {
                    setFilters(f => ({ ...f, date_from: s.term_start, date_to: s.term_end }))
                  }
                }}
              >
                <option value="">— เลือกภาคเรียน —</option>
                {semesters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || `ภาคเรียนที่ ${s.semester_number}`}
                    {s.academic_year ? ` /${s.academic_year}` : ''}
                    {s.is_active ? ' (ปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">วันที่เริ่มต้น</label>
            <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">วันที่สิ้นสุด</label>
            <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">รายวิชา</label>
            <select value={filters.subject_id} onChange={e => setFilter('subject_id', e.target.value)}>
              <option value="">ทุกวิชา</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ชั้น</label>
            <select value={filters.grade_level} onChange={e => setFilter('grade_level', e.target.value)}>
              <option value="">ทุกชั้น</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ห้อง</label>
            <select value={filters.room_number} onChange={e => setFilter('room_number', e.target.value)}>
              <option value="">ทุกห้อง</option>
              {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={search} disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'ค้นหา'}
          </button>
          {searched && logs.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={exportExcel}
              disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <IcDownload />
              {exporting ? 'กำลัง Export...' : `Export Excel (${logs.length} รายการ)`}
            </button>
          )}
          {searched && logs.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🖨 พิมพ์
            </button>
          )}
        </div>
      </div>

      <div className="print-area">
      {/* Print header (only visible when printing) */}
      {searched && logs.length > 0 && (
        <div style={{ display: 'none' }} className="print-header">
          <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>บันทึกการเช็คอิน</h2>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: 13 }}>{printTitle}</p>
        </div>
      )}
      <style>{`.print-header { display: none; } @media print { .print-header { display: block !important; } }`}</style>

      {/* Summary chips + view toggle */}
      {searched && !loading && logs.length > 0 && (
        <div className="print-hide" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: `มาเรียน ${totals.present}`, color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
            { label: `มาสาย ${totals.late}`,      color: 'var(--fc-warning)',       bg: 'var(--fc-warning-light)' },
            { label: `ขาดเรียน ${totals.absent}`, color: 'var(--fc-danger)',        bg: 'var(--fc-danger-light)'  },
            ...(totals.excused > 0 ? [{ label: `ลา ${totals.excused}`, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' }] : []),
            ...(totals.already_checked > 0 ? [{ label: `สแกนซ้ำ ${totals.already_checked}`, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' }] : []),
            { label: `ทั้งหมด ${logs.filter(l=>l.status!=='already_checked').length}`, color: 'var(--fc-primary)', bg: 'var(--fc-primary-light)' },
          ].map(s => (
            <span key={s.label} className="chip" style={{ background: s.bg, color: s.color, fontSize: 13, padding: '5px 12px' }}>
              {s.label}
            </span>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', background: 'var(--fc-muted)', borderRadius: 8, padding: 3, gap: 3 }}>
            {[
              { key: 'summary', label: 'สรุปห้อง' },
              { key: 'detail',  label: 'รายการ' },
              ...(filters.subject_id ? [{ key: 'gradebook', label: 'กราดบุ๊ก' }] : []),
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                fontWeight: view === v.key ? 600 : 400,
                background: view === v.key ? 'var(--fc-surface)' : 'transparent',
                color: view === v.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
                boxShadow: view === v.key ? 'var(--fc-shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}>{v.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : searched && logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '48px 0', fontSize: 13 }}>
          ไม่พบบันทึกการเช็คอินในช่วงเวลานี้
        </div>
      ) : logs.length > 0 && view === 'summary' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>ชั้น</th>
                  <th>ห้อง</th>
                  <th style={{ color: 'var(--fc-success-dark)' }}>มาเรียน</th>
                  <th style={{ color: 'var(--fc-warning)' }}>มาสาย</th>
                  <th style={{ color: 'var(--fc-danger)' }}>ขาดเรียน</th>
                  <th style={{ color: '#7c3aed' }}>ลา</th>
                  <th>รวม</th>
                  <th>อัตรามา</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(row => {
                  const total = row.present + row.late + row.absent + row.excused
                  const rate  = total > 0 ? Math.round(((row.present + row.late) / total) * 100) : 0
                  return (
                    <tr key={`${row.grade_level}-${row.room_number}`}>
                      <td style={{ fontWeight: 600 }}>{row.grade_level}</td>
                      <td style={{ color: 'var(--fc-text-3)' }}>{row.room_number !== '—' ? `ห้อง ${row.room_number}` : '—'}</td>
                      <td>
                        <span className="chip" style={{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)' }}>
                          {row.present}
                        </span>
                      </td>
                      <td>
                        {row.late > 0
                          ? <span className="chip" style={{ background: 'var(--fc-warning-light)', color: 'var(--fc-warning)' }}>{row.late}</span>
                          : <span style={{ color: 'var(--fc-text-4)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td>
                        {row.absent > 0
                          ? <span className="chip" style={{ background: 'var(--fc-danger-light)', color: 'var(--fc-danger)' }}>{row.absent}</span>
                          : <span style={{ color: 'var(--fc-text-4)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td>
                        {row.excused > 0
                          ? <span className="chip" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>{row.excused}</span>
                          : <span style={{ color: 'var(--fc-text-4)', fontSize: 12 }}>—</span>
                        }
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-3)' }}>{total}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--fc-muted)', borderRadius: 3, minWidth: 60 }}>
                            <div style={{ height: '100%', borderRadius: 3, width: `${rate}%`, background: rate >= 80 ? 'var(--fc-success-dark)' : rate >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)' }} />
                          </div>
                          <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', minWidth: 34, textAlign: 'right', color: rate >= 80 ? 'var(--fc-success-dark)' : rate >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)', fontWeight: 600 }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : logs.length > 0 && view === 'gradebook' ? (
        gbLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner"/></div>
        ) : gbData ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--fc-border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fc-text)' }}>{gbData.subject?.subject_name}</span>
              <span style={{ fontSize: 12, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-text-4)' }}>{gbData.subject?.subject_code}</span>
              <span style={{ fontSize: 12, color: 'var(--fc-text-4)', marginLeft: 'auto' }}>{gbData.session_dates?.length || 0} วัน · {gbData.students?.length || 0} คน</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ minWidth: Math.max(600, 220 + (gbData.session_dates?.length || 0) * 80) }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 80 }}>รหัส</th>
                    <th style={{ minWidth: 140 }}>ชื่อ-นามสกุล</th>
                    {(gbData.session_dates || []).map(d => (
                      <th key={d} style={{ fontSize: 11, whiteSpace: 'nowrap', textAlign: 'center', minWidth: 72 }}>
                        {new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                      </th>
                    ))}
                    <th style={{ textAlign: 'center', color: 'var(--fc-success-dark)' }}>มา</th>
                    <th style={{ textAlign: 'center', color: 'var(--fc-warning)' }}>สาย</th>
                    <th style={{ textAlign: 'center', color: 'var(--fc-danger)' }}>ขาด</th>
                    <th style={{ textAlign: 'center' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {(gbData.students || []).map(st => {
                    const rate = (st.present + st.late + st.absent) > 0
                      ? Math.round(((st.present + st.late) / (st.present + st.late + st.absent)) * 100)
                      : 0
                    return (
                      <tr key={st.student_id}>
                        <td style={{ fontFamily: 'var(--fc-font-mono)', fontSize: 11, color: 'var(--fc-text-4)' }}>{st.student_id}</td>
                        <td style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {st.name}
                          {st.grade_level && <span style={{ fontSize: 11, color: 'var(--fc-text-4)', marginLeft: 6 }}>ชั้น {st.grade_level}/{st.room_number}</span>}
                        </td>
                        {(gbData.session_dates || []).map(d => {
                          const s = st.date_status?.[d]
                          const cfg = STATUS_CFG[s]
                          return (
                            <td key={d} style={{ textAlign: 'center', padding: '6px 4px' }}>
                              {cfg
                                ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: cfg.bg, color: cfg.color }}>
                                    {s === 'present' ? 'ม' : s === 'late' ? 'ส' : s === 'excused' ? 'ล' : 'ข'}
                                  </span>
                                : <span style={{ fontSize: 11, color: 'var(--fc-border)' }}>—</span>
                              }
                            </td>
                          )
                        })}
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--fc-success-dark)' }}>{st.present}</td>
                        <td style={{ textAlign: 'center', color: 'var(--fc-warning)' }}>{st.late || '—'}</td>
                        <td style={{ textAlign: 'center', color: 'var(--fc-danger)' }}>{st.absent || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, color: rate >= 80 ? 'var(--fc-success-dark)' : rate >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)' }}>
                          {rate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '48px 0', fontSize: 13 }}>
            ไม่สามารถโหลดข้อมูลกราดบุ๊กได้
          </div>
        )
      ) : logs.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลา</th>
                  <th>รหัสนักเรียน</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ชั้น/ห้อง</th>
                  <th>วิชา</th>
                  <th>วิธีเช็คอิน</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const cfg = STATUS_CFG[log.status] ?? { label: log.status, color: 'var(--fc-text-3)', bg: 'var(--fc-muted)' }
                  return (
                    <tr key={log.log_id}>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-3)', whiteSpace: 'nowrap' }}>
                        {new Date(log.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-4)' }}>{log.timestamp}</td>
                      <td style={{ fontFamily: 'var(--fc-font-mono)', fontSize: 12 }}>{log.student_id}</td>
                      <td style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{log.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>
                        {log.grade_level ? `ชั้น ${log.grade_level}` : '—'}
                        {log.room_number ? ` ห้อง ${log.room_number}` : ''}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontFamily: 'var(--fc-font-mono)', background: 'var(--fc-muted)', padding: '2px 6px', borderRadius: 4 }}>
                          {log.subject_code}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--fc-text-3)', marginLeft: 6 }}>{log.subject_name}</span>
                      </td>
                      <td>
                        {log.check_method === 'face' && <span className="chip" style={{ background: '#EFF6FF', color: '#1A56DB', fontSize: 11 }}>สแกนใบหน้า</span>}
                        {log.check_method === 'qr' && <span className="chip" style={{ background: '#F5F3FF', color: '#7C3AED', fontSize: 11 }}>QR Code</span>}
                        {log.check_method === 'manual' && <span className="chip" style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11 }}>กรอกมือ</span>}
                        {!log.check_method && <span style={{ color: 'var(--fc-text-4)', fontSize: 12 }}>—</span>}
                      </td>
                      <td>
                        <span className="chip" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        {log.status === 'excused' && log.reason && (
                          <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 6, fontStyle: 'italic' }}>{log.reason}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      </div>
    </main>
  )
}
