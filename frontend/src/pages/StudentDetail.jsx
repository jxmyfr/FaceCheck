import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API_ENROLL = 'http://127.0.0.1:8000/api/v1/enroll'
const API_STATS  = 'http://127.0.0.1:8000/api/v1/stats'

// ── Icons ──────────────────────────────────────────────────────
const IcArrowLeft = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
)
const IcEdit = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IcImage = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
)
const IcCamera = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcUpload = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)

// ── Status chip ─────────────────────────────────────────────────
const STATUS_MAP = {
  present: { label: 'มาเรียน', color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
  late:    { label: 'มาสาย',   color: 'var(--fc-warning)',      bg: 'var(--fc-warning-light)' },
  absent:  { label: 'ขาดเรียน',color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)'  },
}
function StatusChip({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'var(--fc-text-3)', bg: 'var(--fc-muted)' }
  return <span className="chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}

// ── Area chart ──────────────────────────────────────────────────
function AreaChart({ data, valueKey = 'rate', color = 'var(--fc-primary)', height = 110 }) {
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
  const gradId = 'sdAreaGrad'
  return (
    <svg viewBox={`0 0 100 ${chartH}`} width="100%" height={chartH}
      preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={t} x1="0" y1={PAD + (1 - t) * (chartH - PAD * 2)}
          x2="100" y2={PAD + (1 - t) * (chartH - PAD * 2)}
          stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      ))}
      <path d={areaPath} fill={`url(#${gradId})`}/>
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

// ── Main component ──────────────────────────────────────────────
export default function StudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const camRef = useRef(null)
  const fileRef = useRef(null)

  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // face view modal
  const [faceOpen, setFaceOpen]     = useState(false)
  const [faceUrl, setFaceUrl]       = useState(null)
  const [faceLoading, setFaceLoading] = useState(false)
  const [faceError, setFaceError]   = useState(false)

  // update face modal
  const [updateOpen, setUpdateOpen]     = useState(false)
  const [updateTab, setUpdateTab]       = useState('camera') // 'camera' | 'upload'
  const [updatePreview, setUpdatePreview] = useState(null)   // data URL
  const [updateFile, setUpdateFile]     = useState(null)     // File object
  const [camReady, setCamReady]         = useState(false)
  const [updating, setUpdating]         = useState(false)
  const [updateMsg, setUpdateMsg]       = useState(null)

  // edit info modal
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ first_name: '', last_name: '', grade_level: '', room_number: '' })
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_STATS}/student-attendance?student_id=${encodeURIComponent(studentId)}`)
      setDetail(res.data)
      setError(null)
    } catch {
      setError('ไม่พบข้อมูลนักเรียน')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [studentId])

  // ── Face view ─────────────────────────────────────────────────
  const openFace = async () => {
    setFaceOpen(true)
    setFaceError(false)
    if (faceUrl) return
    setFaceLoading(true)
    try {
      const res = await axios.get(
        `${API_ENROLL}/students/${encodeURIComponent(studentId)}/face`,
        { responseType: 'blob' }
      )
      setFaceUrl(URL.createObjectURL(res.data))
    } catch {
      setFaceError(true)
    } finally {
      setFaceLoading(false)
    }
  }

  const closeFace = () => setFaceOpen(false)

  // ── Update face ───────────────────────────────────────────────
  const openUpdate = () => {
    setUpdateOpen(true)
    setUpdateTab('camera')
    setUpdatePreview(null)
    setUpdateFile(null)
    setUpdateMsg(null)
    setCamReady(false)
  }

  const closeUpdate = () => {
    setUpdateOpen(false)
    setUpdatePreview(null)
    setUpdateFile(null)
  }

  const captureFromCam = () => {
    const img = camRef.current?.getScreenshot()
    if (img) { setUpdatePreview(img); setUpdateFile(null) }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUpdateFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setUpdatePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUpdateFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setUpdatePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const submitUpdateFace = async () => {
    if (!updatePreview) return
    setUpdating(true)
    setUpdateMsg(null)
    try {
      let blob
      if (updateFile) {
        blob = updateFile
      } else {
        blob = await fetch(updatePreview).then(r => r.blob())
      }
      const fd = new FormData()
      fd.append('file', blob, `${studentId}.jpg`)
      await axios.put(`${API_ENROLL}/update-face/${encodeURIComponent(studentId)}`, fd)
      setUpdateMsg({ ok: true, text: 'อัปเดตใบหน้าสำเร็จ' })
      setFaceUrl(null) // invalidate cached face
      await load()
      setTimeout(() => { closeUpdate(); setFaceOpen(false) }, 1000)
    } catch (e) {
      setUpdateMsg({ ok: false, text: e.response?.data?.detail || 'อัปเดตไม่สำเร็จ' })
    } finally {
      setUpdating(false)
    }
  }

  // ── Edit info ─────────────────────────────────────────────────
  const openEdit = () => {
    if (!detail) return
    const s = detail.student
    setForm({ first_name: s.first_name ?? '', last_name: s.last_name ?? '', grade_level: s.grade_level ?? '', room_number: s.room_number ?? '' })
    setSaveMsg(null)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      await axios.put(`${API_ENROLL}/students/${encodeURIComponent(studentId)}`, fd)
      setSaveMsg({ ok: true, text: 'บันทึกสำเร็จ' })
      await load()
      setTimeout(() => setEditing(false), 800)
    } catch (e) {
      setSaveMsg({ ok: false, text: e.response?.data?.detail || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render guards ─────────────────────────────────────────────
  if (loading) return (
    <main id="main-content" className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" />
    </main>
  )

  if (error || !detail) return (
    <main id="main-content" className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')} style={{ marginBottom: 20 }}>
        <IcArrowLeft /> กลับ
      </button>
      <div className="card" style={{ textAlign: 'center', color: 'var(--fc-danger)', padding: '40px 0' }}>
        {error ?? 'ไม่พบข้อมูล'}
      </div>
    </main>
  )

  const { student, summary, trend, records } = detail
  const lastRate   = trend?.length >= 2 ? trend[trend.length - 1].rate : null
  const trendColor = lastRate == null ? 'var(--fc-primary)'
    : lastRate >= 80 ? 'var(--fc-success)' : lastRate >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)'
  const canEdit = user?.role === 'admin' || user?.role === 'teacher'

  return (
    <main id="main-content" className="page">

      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')}>
          <IcArrowLeft /> รายชื่อนักเรียน
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {student?.has_face && (
            <button className="btn btn-ghost btn-sm" onClick={openFace}>
              <IcImage /> ใบหน้าที่ใช้ลงทะเบียน
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={openEdit}>
              <IcEdit /> แก้ไขข้อมูล
            </button>
          )}
        </div>
      </div>

      {/* Student header card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'var(--fc-primary-light)', color: 'var(--fc-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700,
          }}>
            {(student.first_name ?? student.full_name ?? '?')[0]}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fc-text)' }}>
              {student.full_name ?? `${student.first_name} ${student.last_name}`}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{student.student_id}</span>
              {student.grade_level && <span style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>ชั้น {student.grade_level}</span>}
              {student.room_number && <span style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>ห้อง {student.room_number}</span>}
              <span className="chip" style={{
                background: student.has_face ? 'var(--fc-success-light)' : 'var(--fc-danger-light)',
                color:      student.has_face ? 'var(--fc-success-dark)'  : 'var(--fc-danger)',
              }}>
                {student.has_face ? 'มีใบหน้าแล้ว' : 'ยังไม่มีใบหน้า'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'มาเรียน',    value: summary.present, color: 'var(--fc-success)',  bg: 'var(--fc-success-light)' },
          { label: 'มาสาย',      value: summary.late,    color: 'var(--fc-warning)',  bg: 'var(--fc-warning-light)' },
          { label: 'ขาดเรียน',   value: summary.absent,  color: 'var(--fc-danger)',   bg: 'var(--fc-danger-light)'  },
          { label: 'รวมทั้งหมด', value: summary.total,   color: 'var(--fc-primary)',  bg: 'var(--fc-primary-light)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ background: s.bg, textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 6, opacity: 0.85 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      {trend?.length >= 2 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>แนวโน้มการเข้าเรียน</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>นับตั้งแต่วันแรกที่เช็คชื่อ</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{lastRate}%</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2 }}>วันนี้</div>
            </div>
          </div>
          <AreaChart data={trend} valueKey="rate" color={trendColor} height={120} />
        </div>
      )}

      {/* Attendance records */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--fc-border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>ประวัติการเข้าเรียน</div>
        </div>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '40px 0', fontSize: 13 }}>
            ยังไม่มีบันทึกการเข้าเรียน
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>วันที่</th><th>รายวิชา</th><th>เวลา</th><th>สถานะ</th></tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--fc-text-2)' }}>
                      {new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--fc-text)' }}>{r.subject_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{r.subject_code}</div>
                    </td>
                    <td style={{ color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</td>
                    <td><StatusChip status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Face view modal ─────────────────────────────────────── */}
      {faceOpen && (
        <div className="modal-overlay" onClick={closeFace}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">ใบหน้าที่ลงทะเบียน</div>
            <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 16 }}>
              {student.full_name} · {student.student_id}
            </div>

            {/* Image */}
            <div style={{
              borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)',
              aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              {faceLoading ? (
                <div className="spinner" />
              ) : faceError ? (
                <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>โหลดรูปไม่สำเร็จ</span>
              ) : faceUrl ? (
                <img src={faceUrl} alt={`ใบหน้าของ ${student.full_name}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => { closeFace(); openUpdate() }}>
                  อัปเดตใบหน้าใหม่
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeFace}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update face modal ───────────────────────────────────── */}
      {updateOpen && (
        <div className="modal-overlay" onClick={closeUpdate}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">อัปเดตใบหน้า</div>
            <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 16 }}>
              {student.full_name} · {student.student_id}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: 4 }}>
              {[
                { key: 'camera', label: 'กล้อง', icon: <IcCamera /> },
                { key: 'upload', label: 'อัปโหลดรูป', icon: <IcUpload /> },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => { setUpdateTab(t.key); setUpdatePreview(null); setUpdateFile(null) }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                    fontWeight: updateTab === t.key ? 600 : 400,
                    background: updateTab === t.key ? 'var(--fc-surface)' : 'transparent',
                    color: updateTab === t.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
                    boxShadow: updateTab === t.key ? 'var(--fc-shadow-sm)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Preview or input */}
            {updatePreview ? (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12 }}>
                <img src={updatePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  onClick={() => { setUpdatePreview(null); setUpdateFile(null) }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    border: 'none', borderRadius: 6, padding: '4px 10px',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >เลือกใหม่</button>
              </div>
            ) : updateTab === 'camera' ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12, position: 'relative' }}>
                <Webcam ref={camRef} audio={false} screenshotFormat="image/jpeg"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onUserMedia={() => setCamReady(true)} />
                {/* face guide */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: 140, height: 170, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.5)' }} />
                </div>
              </div>
            ) : (
              /* Upload drop zone */
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  borderRadius: 10, border: '2px dashed var(--fc-border)',
                  background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, cursor: 'pointer', transition: 'border-color 0.15s',
                }}
              >
                <IcUpload />
                <div style={{ fontSize: 13, color: 'var(--fc-text-3)', textAlign: 'center' }}>
                  คลิกหรือลากรูปมาวางที่นี่<br />
                  <span style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>JPG, PNG ขนาดไม่เกิน 10MB</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={handleFileChange} />
              </div>
            )}

            {/* Action button for camera tab */}
            {!updatePreview && updateTab === 'camera' && (
              <button className="btn btn-ghost btn-full" style={{ marginBottom: 12 }}
                onClick={captureFromCam} disabled={!camReady}>
                <IcCamera /> ถ่ายภาพ
              </button>
            )}

            {/* Tips */}
            {!updatePreview && (
              <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                {['มองตรงเข้าหากล้อง', 'แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า', 'ถอดแว่นและหน้ากากออก'].map(t => (
                  <p key={t} style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· {t}</p>
                ))}
              </div>
            )}

            {updateMsg && (
              <div className={`toast ${updateMsg.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 12 }}>
                {updateMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeUpdate}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={submitUpdateFace}
                disabled={!updatePreview || updating}>
                {updating ? 'กำลังประมวลผล…' : 'บันทึกใบหน้า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit info modal ─────────────────────────────────────── */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">แก้ไขข้อมูลนักเรียน</div>
            <div className="form-group">
              <label htmlFor="edit-first-name" className="form-label">ชื่อ *</label>
              <input id="edit-first-name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="edit-last-name" className="form-label">นามสกุล *</label>
              <input id="edit-last-name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label htmlFor="edit-grade" className="form-label">ระดับชั้น</label>
                <input id="edit-grade" placeholder="ม.5" value={form.grade_level} onChange={e => setForm(f => ({ ...f, grade_level: e.target.value }))} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-room" className="form-label">ห้อง</label>
                <input id="edit-room" placeholder="1" value={form.room_number} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} />
              </div>
            </div>
            {saveMsg && (
              <div className={`toast ${saveMsg.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 14 }}>
                {saveMsg.text}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
