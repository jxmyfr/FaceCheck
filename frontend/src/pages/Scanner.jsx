import { useRef, useState, useEffect, useCallback } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'
import { QRCodeCanvas } from 'qrcode.react'
import { useDialog } from '../hooks/useDialog'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL

// ── Icons ────────────────────────────────────────────────────────
const IcCamera = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcZap = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)
const IcHand = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
  </svg>
)
const IcSearch = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

// ── Status config ────────────────────────────────────────────────
const STATUS_CFG = {
  success:        { label: 'เช็คชื่อสำเร็จ', color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)', accent: '#16A34A' },
  success_late:   { label: 'มาสาย',           color: '#92400E',                bg: '#FEF3C7',                 accent: '#D97706' },
  already_checked:{ label: 'เช็คชื่อแล้ว',   color: 'var(--fc-warning)',      bg: 'var(--fc-warning-light)', accent: '#D97706' },
  error:          { label: 'ระบุตัวตนไม่ได้', color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)',  accent: '#DC2626' },
  wrong_room:     { label: 'ไม่ใช่ห้องนี้',   color: '#92400E',                bg: '#FEF3C7',                 accent: '#D97706' },
  // DB statuses (from polling)
  present:        { label: 'มาเรียน',         color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)', accent: '#16A34A' },
  late:           { label: 'มาสาย',           color: '#92400E',                bg: '#FEF3C7',                 accent: '#D97706' },
  absent:         { label: 'ขาดเรียน',        color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)',  accent: '#DC2626' },
  excused:        { label: 'ลา',              color: '#1D4ED8',                bg: '#DBEAFE',                 accent: '#2563EB' },
}

const getDisplayStatus = (result) => {
  if (result.status === 'success' && result.scan_status === 'late') return 'success_late'
  return result.status
}

// ── Result card ──────────────────────────────────────────────────
function ResultCard({ result, onDismiss, onCancel }) {
  const [cancelling, setCancelling] = useState(false)
  const { dialog, alert } = useDialog()
  if (!result) return null
  const cfg = STATUS_CFG[getDisplayStatus(result)] ?? STATUS_CFG.error

  const handleCancel = async () => {
    if (!result.log_id || cancelling) return
    setCancelling(true)
    try {
      await axios.delete(`${API}/attendance/logs/${result.log_id}`)
      onCancel(result.log_id)
    } catch (e) {
      await alert(e.response?.data?.detail || 'ยกเลิกไม่สำเร็จ')
      setCancelling(false)
    }
  }

  return (
    <>
      {dialog}
    <div style={{
      background: 'var(--fc-surface)', borderRadius: 14,
      border: `1px solid var(--fc-border)`,
      boxShadow: 'var(--fc-shadow-lg)',
      overflow: 'hidden',
      animation: 'slideIn 0.25s ease-out',
    }}>
      {/* Color bar */}
      <div style={{ height: 4, background: cfg.accent }} />

      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          {/* Captured photo */}
          {result.photo && (
            <div style={{
              width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
              flexShrink: 0, background: 'var(--fc-muted)',
            }}>
              <img src={result.photo} alt="scanned"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ background: cfg.bg, color: cfg.color, fontWeight: 600 }}>
                {cfg.label}
              </span>
            </div>

            {result.name ? (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)', lineHeight: 1.3 }}>
                  {result.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)', marginTop: 2 }}>
                  {result.student_id}
                  {result.grade_level && ` · ชั้น ${result.grade_level}`}
                  {result.room_number && ` ห้อง ${result.room_number}`}
                </div>

                {result.status === 'wrong_room' && result.message && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '6px 10px' }}>
                    {result.message}
                  </div>
                )}

                {result.status !== 'wrong_room' && <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>
                    <span style={{ color: 'var(--fc-text-4)' }}>วิชา</span>{' '}
                    <strong style={{ color: 'var(--fc-text-2)' }}>{result.subject}</strong>
                    {result.subject_code && (
                      <span style={{ fontFamily: 'var(--fc-font-mono)', marginLeft: 4, color: 'var(--fc-text-4)' }}>
                        {result.subject_code}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fc-text-3)' }}>
                    <span style={{ color: 'var(--fc-text-4)' }}>เวลา</span>{' '}
                    <strong style={{ color: 'var(--fc-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                      {result.scan_time || result.timestamp}
                    </strong>
                    {result.status === 'already_checked' && (
                      <span style={{ color: 'var(--fc-warning)', marginLeft: 6 }}>
                        (เช็คไปตั้งแต่ {result.checked_at})
                      </span>
                    )}
                  </div>
                  {result.confidence != null && (
                    <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>
                      ความแม่นยำ {Math.round(result.confidence * 100)}%
                    </div>
                  )}
                </div>}
              </>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--fc-danger)', marginTop: 4 }}>
                {result.message}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {result.log_id && result.status !== 'error' && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                flex: 1, padding: '7px', borderRadius: 8,
                border: '1px solid var(--fc-danger)',
                background: cancelling ? 'var(--fc-danger-light)' : 'transparent',
                fontSize: 12, color: 'var(--fc-danger)', cursor: 'pointer',
              }}
            >
              {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการเช็คชื่อ'}
            </button>
          )}
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: '7px', borderRadius: 8,
              border: '1px solid var(--fc-border)', background: 'transparent',
              fontSize: 12, color: 'var(--fc-text-4)', cursor: 'pointer',
            }}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ── Log thumbnail (fetches from backend if no in-memory photo) ───
function LogThumb({ photo, logId, status, studentId }) {
  const [src, setSrc] = useState(photo || null)
  useEffect(() => {
    if (src) return
    if (status === 'already_checked' && studentId) {
      // already_checked shares the original log_id — use registered face instead
      axios.get(`${API}/enroll/students/${studentId}/face`, { responseType: 'blob' })
        .then(r => setSrc(URL.createObjectURL(r.data)))
        .catch(() => {})
    } else if (logId) {
      axios.get(`${API}/attendance/logs/${logId}/image`, { responseType: 'blob' })
        .then(r => setSrc(URL.createObjectURL(r.data)))
        .catch(() => {})
    }
  }, [logId, studentId])
  if (!src) return null
  return (
    <div style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--fc-muted)' }}>
      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────
const IcLock = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)
const IcUnlock = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
  </svg>
)

// ── Camera settings panel (admin only) ──────────────────────────
const IcSliders = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
)

const DEFAULT_CFG = { face_threshold: 0.65, min_det_score: 0.65, min_face_ratio: 0.08, min_blur_score: 40.0 }

function CameraSettings() {
  const { alert } = useDialog()
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [cfg, setCfg] = useState(null)
  const [cfgLoaded, setCfgLoaded] = useState(false)

  // Load lazily when panel first opens to avoid auth race condition
  useEffect(() => {
    if (!open || cfgLoaded) return
    setCfgLoaded(true)
    axios.get(`${API}/settings/semester`)
      .then(r => setCfg({ ...DEFAULT_CFG, ...r.data }))
      .catch(() => setCfg({ ...DEFAULT_CFG }))
  }, [open, cfgLoaded])

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      const res = await axios.put(`${API}/settings/semester`, {
        face_threshold: cfg.face_threshold,
        min_det_score:  cfg.min_det_score,
        min_face_ratio: cfg.min_face_ratio,
        min_blur_score: cfg.min_blur_score,
      })
      setCfg(res.data)
    } catch {
      await alert('บันทึกไม่สำเร็จ')
    } finally { setSaving(false) }
  }

  const reset = async () => {
    setSaving(true)
    try {
      const res = await axios.put(`${API}/settings/semester`, {
        face_threshold: 0.65, min_det_score: 0.65,
        min_face_ratio: 0.08, min_blur_score: 40,
      })
      setCfg(res.data)
    } catch {} finally { setSaving(false) }
  }

  const field = (key, label, min, max, step, hint) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-2)' }}>{label}</label>
        <span style={{ fontSize: 12, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-primary)', fontWeight: 600 }}>
          {cfg?.[key]?.toFixed(2) ?? '—'}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step}
        value={cfg?.[key] ?? (min + max) / 2}
        onChange={e => setCfg(p => ({ ...p, [key]: parseFloat(e.target.value) }))}
        style={{ width: '100%', accentColor: 'var(--fc-primary)', cursor: 'pointer' }}
      />
      <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>{hint}</div>
    </div>
  )

  return (
    <div style={{ marginTop: 8 }}>
      <div
        role="button" tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontSize: 12, color: 'var(--fc-text-3)', userSelect: 'none',
          padding: '6px 0',
        }}
      >
        <IcSliders />
        ตั้งค่าการตรวจจับใบหน้า
        <span style={{
          marginLeft: 'auto', fontSize: 10,
          transition: 'transform 0.15s',
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
        }}>▾</span>
      </div>

      {open && (
        <div style={{
          background: 'var(--fc-muted)', borderRadius: 10,
          padding: '14px 16px', marginTop: 4,
          border: '1px solid var(--fc-border)',
        }}>
          {!cfg ? (
            <div style={{ fontSize: 12, color: 'var(--fc-text-4)', textAlign: 'center', padding: '8px 0' }}>
              กำลังโหลด…
            </div>
          ) : (
            <>
              {field('face_threshold', 'ระยะห่าง Face Match', 0.3, 1.5, 0.05,
                'ค่าน้อย = เข้มงวด (ต้องคล้ายมาก) · ค่ามาก = หลวม · แนะนำ 0.55–0.75')}
              {field('min_det_score', 'ความมั่นใจในการตรวจจับ', 0.3, 0.95, 0.05,
                'กล้องความละเอียดต่ำให้ลดลง เช่น 0.45–0.55 · ค่าสูง = ต้องมั่นใจมาก')}
              {field('min_face_ratio', 'สัดส่วนใบหน้าต่อภาพ', 0.01, 0.25, 0.01,
                'ลดลงหากกล้องมุมกว้างหรืออยู่ไกล · ค่าปกติ 0.08 (8% ของภาพ)')}
              {field('min_blur_score', 'เกณฑ์ความคมชัด (Blur)', 0, 100, 5,
                'กล้องความละเอียดต่ำให้ลดลง เช่น 10–20 · ค่าสูง = ต้องชัดมาก')}

              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={save} disabled={saving}>
                  {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
                  ค่าเริ่มต้น
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Scanner() {
  const { dialog, alert, confirm } = useDialog()
  const { user } = useAuth()
  const cam = useRef(null)
  const [subjects, setSubjects]   = useState([])
  const [subjectId, setSubjectId] = useState(() => localStorage.getItem('scanner-subject-id') || '')
  const [camReady, setCamReady]   = useState(false)
  const [mode, setMode]           = useState(() => localStorage.getItem('scanner-mode') || 'auto')

  // Period-lock state
  const [schedMatches, setSchedMatches] = useState(null) // null=loading, []=none, [...]
  const [lockedSched, setLockedSched]   = useState(null) // { schedule_id, subject_id, ... }
  const [override, setOverride]         = useState(false) // ครูเลือกเอง

  // Auto state
  const [autoActive, setAutoActive] = useState(false)
  const [scanning, setScanning]     = useState(false)
  const [cooldown, setCooldown]     = useState(false)
  const cooldownRef = useRef(false)
  const scanningRef = useRef(false)

  // Manual photo state
  const [manualLoading, setManualLoading] = useState(false)

  // Lookup (manual by student ID) state
  const [lookupId, setLookupId]         = useState('')
  const [lookupStatus, setLookupStatus] = useState('present')
  const [lookupLoading, setLookupLoading] = useState(false)

  // Shared result state
  const [result, setResult]     = useState(null)
  const [errMsg, setErrMsg]     = useState('')
  const [logs, setLogs]         = useState([])
  const [logDetail, setLogDetail] = useState(null)
  const recentPhotosRef = useRef({})

  useEffect(() => {
    if (subjectId) localStorage.setItem('scanner-subject-id', subjectId)
  }, [subjectId])

  useEffect(() => {
    localStorage.setItem('scanner-mode', mode)
  }, [mode])

  // ── Poll attendance logs every 3s for cross-device real-time sync ──
  useEffect(() => {
    if (!subjectId) { setLogs([]); return }
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${API}/attendance/logs`, { params: { subject_id: subjectId } })
        const serverLogs = res.data.map(l => ({
          log_id:       l.log_id,
          logId:        l.log_id,
          student_id:   l.student_id,
          name:         l.name,
          grade_level:  l.grade_level,
          room_number:  l.room_number,
          subject:      l.subject_name,
          subject_code: l.subject_code,
          status:       l.status,
          reason:       l.reason,
          check_method: l.check_method,
          scan_time:    l.timestamp.slice(0, 5),
          scanDate:     l.date,
          subject_id:   Number(subjectId),
          photo:        recentPhotosRef.current[l.log_id] ?? null,
        }))
        setLogs(prev => {
          const seen = new Set(serverLogs.map(l => l.student_id))
          const alreadyChecked = prev
            .filter(l => l.status === 'already_checked' && !seen.has(l.student_id))
            .reduce((acc, l) => {
              if (!acc.some(x => x.student_id === l.student_id)) acc.push(l)
              return acc
            }, [])
          return [...alreadyChecked, ...serverLogs]
        })
      } catch {}
    }
    fetchLogs()
    const timer = setInterval(fetchLogs, 3000)
    return () => clearInterval(timer)
  }, [subjectId])

  useEffect(() => {
    // Load subjects + detect current schedule in parallel
    Promise.all([
      axios.get(`${API}/attendance/subjects`).then(r => r.data).catch(() => []),
      axios.get(`${API}/attendance/current-schedule`).then(r => r.data).catch(() => null),
    ]).then(([subjectList, schedData]) => {
      setSubjects(subjectList)
      if (!subjectList.length) return

      const matches = schedData?.matches ?? []
      setSchedMatches(matches)

      if (matches.length === 1) {
        // ล็อคอัตโนมัติ
        setLockedSched(matches[0])
        setSubjectId(String(matches[0].subject_id))
      } else if (matches.length === 0) {
        // ไม่มีคาบ — fallback เลือกตามวันปัจจุบัน
        const DAY_MAP = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
        const todayDay = DAY_MAP[new Date().getDay()]
        const todayMatch = subjectList.find(s => s.days?.includes(todayDay))
        setSubjectId(String((todayMatch ?? subjectList[0]).id))
      }
      // matches.length > 1: ให้ครูเลือกเอง (schedMatches จะถูก render ให้เลือก)
    })
  }, [])

  // ── Scan logic (shared) ────────────────────────────────────────
  const doScan = useCallback(async (isAuto = false) => {
    if (!subjectId) return
    const img = cam.current?.getScreenshot()
    if (!img) return

    // ใช้ schedule_id เมื่อล็อคอยู่และไม่ได้ override
    const activeSchedId = (!override && lockedSched) ? lockedSched.schedule_id : null
    const scanUrl = `${API}/attendance/scan?subject_id=${subjectId}${activeSchedId ? `&schedule_id=${activeSchedId}` : ''}`

    try {
      const blob = await new Promise(resolve => {
        const el = new Image()
        el.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 480; canvas.height = Math.round(480 * el.height / el.width)
          canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(resolve, 'image/jpeg', 0.75)
        }
        el.src = img
      })
      const fd   = new FormData()
      fd.append('file', blob, 'scan.jpg')
      const res = await axios.post(scanUrl, fd)
      const _now = new Date()
      const scanTime = _now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      const selSubj = subjects.find(s => s.id === Number(subjectId))
      const scanDate = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`
      const entry = { ...res.data, photo: img, logId: Date.now(), scanDate, scan_time: scanTime, subject_id: Number(subjectId), teacher_name: selSubj?.teacher_name || null }
      if (entry.log_id && img) recentPhotosRef.current[entry.log_id] = img
      setResult(entry)
      setErrMsg('')
      setLogs(prev => [entry, ...prev])

      if (isAuto) {
        // cooldown after successful/already-checked: 8s
        cooldownRef.current = true
        setCooldown(true)
        setTimeout(() => { cooldownRef.current = false; setCooldown(false) }, 8000)
      }
    } catch (e) {
      const detail = e.response?.data?.detail
      const isWrongRoom = e.response?.status === 403 && typeof detail === 'object' && detail?.error_code === 'wrong_room'
      if (isWrongRoom) {
        // Face recognized but wrong class — show warning + cooldown (both auto & manual)
        const wr = detail
        setErrMsg('')
        setResult({ status: 'wrong_room', name: wr.name, student_id: wr.student_id, grade_level: wr.grade_level, room_number: wr.room_number, message: wr.message, photo: img })
        if (isAuto) {
          cooldownRef.current = true
          setCooldown(true)
          setTimeout(() => { cooldownRef.current = false; setCooldown(false) }, 8000)
        }
      } else if (!isAuto) {
        // Manual mode: show generic error
        const msg = typeof detail === 'string' ? detail : 'ระบุตัวตนไม่สำเร็จ'
        setErrMsg(msg)
        setResult({ status: 'error', name: null, message: msg, photo: img })
      }
      // Auto mode non-wrong_room: silently ignore (no face / quality fail / no match)
    }
  }, [subjectId, subjects])

  // ── Auto scan interval ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'auto' || !autoActive || !camReady || !subjectId) return

    const interval = setInterval(async () => {
      if (scanningRef.current || cooldownRef.current) return
      scanningRef.current = true
      setScanning(true)
      await doScan(true)
      scanningRef.current = false
      setScanning(false)
    }, 2000)

    return () => clearInterval(interval)
  }, [mode, autoActive, camReady, subjectId, doScan])

  // ── Manual scan ────────────────────────────────────────────────
  const handleManualScan = async () => {
    if (manualLoading) return
    setManualLoading(true)
    setResult(null)
    setErrMsg('')
    await doScan(false)
    setManualLoading(false)
  }

  const dismissResult = () => {
    setResult(null)
    setErrMsg('')
  }

  const handleCancel = (logId) => {
    setResult(null)
    setErrMsg('')
    setLogs(prev => prev.filter(l => l.logId !== logId && l.log_id !== logId))
  }

  // QR Code state
  const [qrData, setQrData]       = useState(null)   // { token, subject_name, expires_at }
  const [qrLoading, setQrLoading] = useState(false)
  const [showQr, setShowQr]       = useState(false)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0)

  const handleGenerateQr = async () => {
    if (!subjectId || qrLoading) return
    setQrLoading(true)
    try {
      const activeSchedId = (!override && lockedSched) ? lockedSched.schedule_id : null
      const url = `${API}/attendance/subjects/${subjectId}/qr-session${activeSchedId ? `?schedule_id=${activeSchedId}` : ''}`
      const res = await axios.post(url)
      setQrData(res.data)
      setQrSecondsLeft(30 * 60)
      setShowQr(true)
    } catch (e) {
      await alert(e.response?.data?.detail || 'สร้าง QR Code ไม่สำเร็จ')
    } finally { setQrLoading(false) }
  }

  // QR countdown timer
  useEffect(() => {
    if (!showQr || qrSecondsLeft <= 0) return
    const t = setInterval(() => setQrSecondsLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [showQr, qrSecondsLeft])

  // Mark absent
  const [markingAbsent, setMarkingAbsent] = useState(false)
  const [absentResult, setAbsentResult]   = useState(null) // { marked_absent, total_students }

  const handleMarkAbsent = async () => {
    if (!subjectId || markingAbsent) return
    const ok = await confirm('บันทึกขาดเรียนให้นักเรียนทุกคนที่ยังไม่ได้เช็คชื่อวันนี้ใช่หรือไม่?', {
      title: 'ปิดคาบ — บันทึกขาดเรียน',
      danger: true,
    })
    if (!ok) return
    const activeSchedId = (!override && lockedSched) ? lockedSched.schedule_id : null
    const url = `${API}/attendance/subjects/${subjectId}/mark-absent${activeSchedId ? `?schedule_id=${activeSchedId}` : ''}`
    setMarkingAbsent(true)
    setAbsentResult(null)
    try {
      const res = await axios.post(url)
      setAbsentResult(res.data)
    } catch (e) {
      await alert(e.response?.data?.detail || 'ปิดคาบไม่สำเร็จ')
    } finally { setMarkingAbsent(false) }
  }

  // Lookup submit
  const handleLookup = async () => {
    if (!lookupId.trim() || !subjectId || lookupLoading) return
    setLookupLoading(true)
    setResult(null)
    setErrMsg('')
    try {
      const res = await axios.post(
        `${API}/attendance/manual?subject_id=${subjectId}&student_id=${encodeURIComponent(lookupId.trim())}&status=${lookupStatus}`
      )
      const _now = new Date()
      const scanTime = _now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      const selSubj = subjects.find(s => s.id === Number(subjectId))
      const scanDate = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`
      const entry = { ...res.data, photo: null, logId: Date.now(), scanDate, scan_time: scanTime, subject_id: Number(subjectId), teacher_name: selSubj?.teacher_name || null }
      setResult(entry)
      setLogs(prev => [entry, ...prev])
      setLookupId('')
    } catch (e) {
      const detail = e.response?.data?.detail || 'ไม่พบนักเรียน'
      setErrMsg(detail)
      setResult({ status: 'error', name: null, message: detail, photo: null })
    } finally { setLookupLoading(false) }
  }

  // Switch mode: reset transient states only, keep log history
  const switchMode = (m) => {
    setMode(m)
    setAutoActive(false)
    setResult(null)
    setErrMsg('')
    setCooldown(false)
    cooldownRef.current = false
    setLookupId('')
  }

  const canScan = camReady && !!subjectId
  const isAdmin = user?.role === 'admin'
  const subjectIdSet = new Set(subjects.map(s => s.id))
  const displayedLogs = isAdmin ? logs : logs.filter(l => l.subject_id && subjectIdSet.has(l.subject_id))

  return (
    <main id="main-content" className="page">
      {dialog}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Face Scanner</h1>
        <p className="page-sub">สแกนใบหน้าเพื่อเช็คชื่อเข้าเรียน</p>
      </div>

      {/* Subject + Mode */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        {/* Period-lock banner (1 match, not overriding) */}
        {lockedSched && !override ? (
          <div style={{
            flex: '1 1 260px', background: 'var(--fc-primary-light)',
            borderRadius: 10, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ color: 'var(--fc-primary)', flexShrink: 0 }}><IcLock /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fc-primary)', lineHeight: 1.3 }}>
                {lockedSched.subject_code} {lockedSched.subject_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--fc-primary)', opacity: 0.75, marginTop: 2 }}>
                ล็อคคาบ {lockedSched.time_start}–{lockedSched.time_end}
                {lockedSched.grade_level && ` · ชั้น ${lockedSched.grade_level}`}
                {lockedSched.room_number && ` ห้อง ${lockedSched.room_number}`}
              </div>
            </div>
            <button onClick={() => setOverride(true)} style={{
              fontSize: 11, color: 'var(--fc-primary)', background: 'rgba(255,255,255,0.6)',
              border: '1px solid var(--fc-primary)', borderRadius: 7,
              padding: '5px 10px', cursor: 'pointer', flexShrink: 0, fontWeight: 600,
            }}>
              เลือกเอง
            </button>
          </div>

        /* Multiple matches → let teacher pick */
        ) : schedMatches?.length > 1 && !override ? (
          <div style={{ flex: '1 1 260px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IcLock /> พบหลายคาบ — เลือกคาบที่กำลังสอน
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {schedMatches.map(sc => (
                <button key={sc.schedule_id} onClick={() => {
                  setLockedSched(sc)
                  setSubjectId(String(sc.subject_id))
                }} style={{
                  textAlign: 'left', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid var(--fc-border)', background: 'var(--fc-surface)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--fc-text)',
                  transition: 'border-color 0.15s',
                }}>
                  <strong>{sc.subject_code}</strong> {sc.subject_name}
                  <span style={{ fontSize: 11, color: 'var(--fc-text-4)', marginLeft: 8 }}>
                    {sc.time_start}–{sc.time_end}
                    {sc.grade_level && ` · ชั้น ${sc.grade_level}`}
                    {sc.room_number && ` ห้อง ${sc.room_number}`}
                  </span>
                </button>
              ))}
              <button onClick={() => setOverride(true)} style={{
                fontSize: 11, color: 'var(--fc-text-4)', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left',
              }}>
                หรือเลือกวิชาเอง →
              </button>
            </div>
          </div>

        /* Free select (no match / override) */
        ) : (
          <div style={{ flex: '1 1 260px', maxWidth: 480 }}>
            <label htmlFor="scanner-subject" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {override && <><IcUnlock /><span style={{ color: 'var(--fc-text-3)', fontWeight: 400 }}>เลือกวิชาเอง</span></>}
              {!override && 'รายวิชา'}
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select id="scanner-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} style={{ flex: 1 }}>
                {subjects.length === 0
                  ? <option value="">ไม่มีรายวิชา</option>
                  : (() => {
                      const DAY_MAP = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
                      const todayDay = DAY_MAP[new Date().getDay()]
                      return subjects.map(s => {
                        const isToday = s.days?.includes(todayDay)
                        return (
                          <option key={s.id} value={s.id}>
                            {isToday ? '★ ' : ''}{s.subject_code}  {s.subject_name}
                          </option>
                        )
                      })
                    })()
                }
              </select>
              {override && (
                <button onClick={() => setOverride(false)} style={{
                  fontSize: 11, color: 'var(--fc-text-4)', background: 'var(--fc-muted)',
                  border: '1px solid var(--fc-border)', borderRadius: 7,
                  padding: '6px 10px', cursor: 'pointer', flexShrink: 0,
                }}>
                  ยกเลิก
                </button>
              )}
            </div>
            {schedMatches !== null && schedMatches.length === 0 && (
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 4 }}>
                ไม่พบคาบเรียนที่ตรงกับเวลานี้
              </div>
            )}
          </div>
        )}

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--fc-muted)', borderRadius: 10, padding: 4, gap: 4, flexShrink: 0 }}>
          {[
            { key: 'auto',   label: 'อัตโนมัติ', icon: <IcZap /> },
            { key: 'manual', label: 'เมนวล',     icon: <IcHand /> },
            { key: 'lookup', label: 'เช็คชื่อ ID', icon: <IcSearch /> },
          ].map(m => (
            <button key={m.key} onClick={() => switchMode(m.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
              borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: mode === m.key ? 600 : 400,
              background: mode === m.key ? 'var(--fc-surface)' : 'transparent',
              color: mode === m.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
              boxShadow: mode === m.key ? 'var(--fc-shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="scanner-grid">

        {/* Lookup panel (replaces camera when in lookup mode) */}
        {mode === 'lookup' ? (
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 4 }}>เช็คชื่อด้วยรหัสนักเรียน</div>
            <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginBottom: 20 }}>ใช้เมื่อใบหน้าสแกนไม่ผ่านหรือต้องการเช็คชื่อแทนนักเรียน</div>

            <div className="form-group">
              <label htmlFor="lookup-id" className="form-label">รหัสนักเรียน</label>
              <input
                id="lookup-id"
                placeholder="เช่น 6408052201"
                value={lookupId}
                onChange={e => setLookupId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="lookup-status" className="form-label">สถานะ</label>
              <select id="lookup-status" value={lookupStatus} onChange={e => setLookupStatus(e.target.value)}>
                <option value="present">มาเรียน</option>
                <option value="late">มาสาย</option>
                <option value="absent">ขาดเรียน</option>
              </select>
            </div>

            {errMsg && (
              <div className="toast toast-error" style={{ marginBottom: 14 }}>{errMsg}</div>
            )}

            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleLookup}
              disabled={!lookupId.trim() || !subjectId || lookupLoading}
            >
              {lookupLoading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังบันทึก...</>
                : <><IcSearch /> บันทึกการเข้าเรียน</>
              }
            </button>

            <div style={{ marginTop: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', lineHeight: 1.8 }}>
                · ป้อนรหัสนักเรียนแล้วกด Enter หรือปุ่มบันทึก<br />
                · ระบบจะตรวจสอบว่าเช็คชื่อซ้ำในวันนี้หรือไม่<br />
                · ใช้โหมดนี้เมื่อจำเป็นเท่านั้น เพราะไม่มีการยืนยันใบหน้า
              </div>
            </div>
          </div>

        ) : (
        /* Camera card */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Camera feed */}
          <div style={{ position: 'relative', aspectRatio: '4/3', background: '#000' }}>
            <Webcam
              ref={cam} audio={false} screenshotFormat="image/jpeg" screenshotQuality={0.85}
              videoConstraints={{ facingMode: { ideal: 'environment' }, width: 640, height: 480 }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onUserMedia={() => setCamReady(true)}
            />

            {/* Face guide oval */}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div style={{
                width: 160, height: 200, borderRadius: '50%',
                border: `2px dashed ${
                  mode === 'auto' && autoActive && !cooldown
                    ? 'rgba(255,255,255,0.7)'
                    : 'rgba(255,255,255,0.35)'
                }`,
                transition: 'border-color 0.3s',
              }} />
            </div>

            {/* Auto scanning pulse indicator */}
            {mode === 'auto' && autoActive && !cooldown && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.5)', borderRadius: 20,
                padding: '5px 10px',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: scanning ? '#FBBF24' : '#4ADE80',
                  animation: 'pulse 1.2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>
                  {scanning ? 'กำลังสแกน...' : 'กำลังรอใบหน้า'}
                </span>
              </div>
            )}

            {/* Cooldown overlay */}
            {mode === 'auto' && cooldown && (
              <div style={{
                position: 'absolute', top: 12, left: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.5)', borderRadius: 20,
                padding: '5px 10px',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA' }} />
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>รอก่อน...</span>
              </div>
            )}

            {/* Manual loading overlay */}
            {mode === 'manual' && manualLoading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              </div>
            )}
          </div>

          {/* Controls under camera */}
          <div style={{ padding: '14px 16px' }}>
            {mode === 'auto' ? (
              <button
                className={`btn btn-lg btn-full ${autoActive ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  setAutoActive(v => !v)
                  if (autoActive) { setCooldown(false); cooldownRef.current = false }
                  setResult(null)
                }}
                disabled={!canScan}
              >
                {autoActive ? 'หยุดสแกน' : <><IcZap /> เริ่มสแกนอัตโนมัติ</>}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleManualScan}
                disabled={!canScan || manualLoading}
              >
                {manualLoading
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> ประมวลผล...</>
                  : <><IcCamera /> ถ่ายภาพและเช็คชื่อ</>
                }
              </button>
            )}
            <p style={{ fontSize: 11, color: 'var(--fc-text-4)', textAlign: 'center', marginTop: 8 }}>
              {mode === 'auto'
                ? 'สแกนอัตโนมัติทุก 2 วินาที · หยุด 8 วินาทีหลังพบใบหน้า'
                : 'จัดใบหน้าให้อยู่กลางวงรี แล้วกดถ่ายภาพ'}
            </p>
            {user?.role === 'admin' && <CameraSettings />}

            {/* Mark Absent button */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fc-border)' }}>
              <button
                onClick={handleMarkAbsent}
                disabled={!subjectId || markingAbsent}
                style={{
                  width: '100%', padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--fc-danger)',
                  background: 'transparent', color: 'var(--fc-danger)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: (!subjectId || markingAbsent) ? 0.5 : 1,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (subjectId && !markingAbsent) e.currentTarget.style.background = 'var(--fc-danger-light)' }}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {markingAbsent
                  ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(239,68,68,0.3)', borderTopColor: 'var(--fc-danger)' }} /> กำลังบันทึก...</>
                  : <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        <line x1="9" y1="16" x2="15" y2="16"/>
                      </svg>
                      ปิดคาบ — บันทึกขาดเรียน
                    </>
                }
              </button>
              {absentResult && (
                <div style={{
                  marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12,
                  background: absentResult.marked_absent > 0 ? 'var(--fc-danger-light)' : 'var(--fc-success-light)',
                  color: absentResult.marked_absent > 0 ? 'var(--fc-danger)' : 'var(--fc-success-dark)',
                  fontWeight: 600, textAlign: 'center',
                }}>
                  {absentResult.marked_absent > 0
                    ? `บันทึกขาดเรียน ${absentResult.marked_absent} คน (จากทั้งหมด ${absentResult.total_students} คน)`
                    : `นักเรียนทุกคนเช็คชื่อครบแล้ว (${absentResult.total_students} คน)`
                  }
                </div>
              )}

              {/* QR Code button */}
              <button
                onClick={handleGenerateQr}
                disabled={!subjectId || qrLoading}
                style={{
                  marginTop: 8,
                  width: '100%', padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--fc-primary)',
                  background: 'transparent', color: 'var(--fc-primary)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  opacity: (!subjectId || qrLoading) ? 0.5 : 1,
                }}
              >
                {qrLoading
                  ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(26,86,219,0.3)', borderTopColor: 'var(--fc-primary)' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
                    </svg>
                }
                QR Code สำรอง
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Result panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Latest result */}
          {result ? (
            <ResultCard result={result} onDismiss={dismissResult} onCancel={handleCancel} />
          ) : (
            <div className="card" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', minHeight: 160, gap: 10,
              color: 'var(--fc-text-4)',
            }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>
                {mode === 'auto' ? '⚡' : '📷'}
              </div>
              <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {mode === 'auto'
                  ? autoActive ? 'รอรับใบหน้า...\nผลจะแสดงที่นี่' : 'กด "เริ่มสแกนอัตโนมัติ"\nแล้วให้นักเรียนเดินเข้ากรอบ'
                  : 'กด "ถ่ายภาพและเช็คชื่อ"\nผลการสแกนจะแสดงที่นี่'
                }
              </div>
            </div>
          )}

          {/* Session log */}
          {displayedLogs.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '1px solid var(--fc-border)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-2)' }}>
                  ประวัติการเช็คชื่อ ({displayedLogs.length} คน)
                </div>
                <button
                  onClick={() => { setLogs([]); setResult(null) }}
                  style={{ fontSize: 11, color: 'var(--fc-text-4)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                >
                  ล้าง
                </button>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {(() => {
                  const todayStr = new Date().toISOString().slice(0, 10)
                  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                  const fmtDate = (d) => {
                    if (!d) return null
                    if (d === todayStr) return 'วันนี้'
                    if (d === yesterdayStr) return 'เมื่อวาน'
                    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                  }
                  // Build flat list with date separators injected
                  const items = []
                  let lastDate = null
                  displayedLogs.forEach((log, i) => {
                    const d = log.scanDate || null
                    if (d && d !== lastDate) {
                      items.push({ type: 'header', date: d })
                      lastDate = d
                    }
                    items.push({ type: 'log', log, i })
                  })
                  const logItems = items.filter(x => x.type === 'log')

                  return items.map((item, idx) => {
                    if (item.type === 'header') {
                      return (
                        <div key={`hdr-${item.date}`} style={{
                          padding: '6px 16px',
                          fontSize: 11, fontWeight: 600,
                          color: 'var(--fc-text-4)',
                          background: 'var(--fc-muted)',
                          borderBottom: '1px solid var(--fc-border)',
                          letterSpacing: '0.03em',
                        }}>
                          {fmtDate(item.date)}
                        </div>
                      )
                    }
                    const { log, i } = item
                    const cfg = STATUS_CFG[log.status] ?? STATUS_CFG.error
                    const isLast = idx === items.length - 1
                    return (
                      <div key={log.logId} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 16px',
                        borderBottom: isLast ? 'none' : '1px solid var(--fc-border)',
                        animation: i === 0 ? 'slideIn 0.2s ease-out' : 'none',
                        cursor: 'pointer',
                      }} onClick={() => setLogDetail(log)}>
                        <LogThumb photo={log.photo} logId={log.log_id} status={log.status} studentId={log.student_id} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fc-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.name ?? '—'}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--fc-text-4)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                            {log.student_id}
                            {log.grade_level && ` · ชั้น ${log.grade_level}`}
                            {log.room_number && ` ห้อง ${log.room_number}`}
                          </div>
                          {isAdmin && (log.subject_code || log.subject) && (
                            <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {log.subject_code && <span style={{ fontFamily: 'var(--fc-font-mono)' }}>{log.subject_code}</span>}
                              {log.subject && <span>{log.subject}</span>}
                              {log.teacher_name && <span>· {log.teacher_name}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                          <span className="chip" style={{ background: cfg.bg, color: cfg.color, fontSize: 12 }}>
                            {cfg.label}
                          </span>
                          <div style={{ fontSize: 13, color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>
                            {log.scan_time || (log.status === 'already_checked' ? log.checked_at : log.timestamp)}
                          </div>
                          {log.log_id && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  await axios.delete(`${API}/attendance/logs/${log.log_id}`)
                                  setLogs(prev => prev.filter(l => l.logId !== log.logId))
                                  if (result?.log_id === log.log_id) { setResult(null) }
                                  if (logDetail?.logId === log.logId) { setLogDetail(null) }
                                } catch { await alert('ยกเลิกไม่สำเร็จ') }
                              }}
                              style={{ fontSize: 12, color: 'var(--fc-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              ยกเลิก
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {/* Tips (collapsed when logs exist) */}
          {displayedLogs.length === 0 && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text-3)', marginBottom: 8 }}>คำแนะนำ</div>
              {[
                'มองตรงเข้าหากล้อง ไม่ก้มหรือเงย',
                'แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า',
                'ถอดแว่นและหน้ากากออก',
                mode === 'auto' ? 'ยืนนิ่งประมาณ 2 วินาที' : 'กดปุ่มขณะใบหน้าอยู่กึ่งกลาง',
              ].map(t => (
                <div key={t} style={{ fontSize: 12, color: 'var(--fc-text-4)', lineHeight: 2 }}>· {t}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* QR Code modal */}
      {showQr && qrData && (() => {
        const appOrigin = import.meta.env.VITE_APP_URL ?? window.location.origin
        const qrUrl = `${appOrigin}/checkin?token=${qrData.token}`
        const mins = Math.floor(qrSecondsLeft / 60)
        const secs = qrSecondsLeft % 60
        const expired = qrSecondsLeft <= 0
        return (
          <div className="modal-overlay" onClick={() => setShowQr(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
              <div className="modal-title">QR Code สำหรับเช็คชื่อ</div>
              <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 4 }}>{qrData.subject_name}</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: expired ? 'var(--fc-danger)' : qrSecondsLeft < 120 ? 'var(--fc-warning)' : 'var(--fc-success-dark)',
                marginBottom: 20,
              }}>
                {expired ? 'หมดอายุแล้ว' : `หมดอายุใน ${mins}:${String(secs).padStart(2, '0')}`}
              </div>
              {!expired ? (
                <>
                  <div style={{
                    display: 'inline-block', padding: 16,
                    background: '#fff', borderRadius: 12,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                    marginBottom: 16,
                  }}>
                    <QRCodeCanvas value={qrUrl} size={200} />
                  </div>
                  <div style={{
                    fontSize: 12, color: '#92400E', background: '#FEF3C7',
                    borderRadius: 8, padding: '8px 12px', marginBottom: 16,
                    fontWeight: 500,
                  }}>
                    ⚠️ QR นี้ใช้ได้ <strong>1 ครั้ง / 1 คน</strong> — หลังนักเรียนสแกนแล้วให้กด "สร้าง QR ใหม่"
                  </div>
                </>
              ) : (
                <div style={{ padding: '32px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>
                  QR Code หมดอายุแล้ว กรุณาสร้างใหม่
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {expired && (
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => { setShowQr(false); handleGenerateQr() }}>
                    สร้าง QR ใหม่
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setShowQr(false)}>ปิด</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Log detail modal */}
      {logDetail && (() => {
        const cfg = STATUS_CFG[logDetail.status] ?? STATUS_CFG.error
        return (
          <LogDetailModal
            log={logDetail}
            cfg={cfg}
            onClose={() => setLogDetail(null)}
            onCancel={async () => {
              try {
                await axios.delete(`${API}/attendance/logs/${logDetail.log_id}`)
                setLogs(prev => prev.filter(l => l.logId !== logDetail.logId))
                if (result?.log_id === logDetail.log_id) setResult(null)
                setLogDetail(null)
              } catch { await alert('ยกเลิกไม่สำเร็จ') }
            }}
          />
        )
      })()}

    </main>
  )
}

// ── Log detail modal ─────────────────────────────────────────────
function LogDetailModal({ log, cfg, onClose, onCancel }) {
  const [photo, setPhoto] = useState(log.photo || null)

  useEffect(() => {
    if (photo || !log.log_id) return
    axios.get(`${API}/attendance/logs/${log.log_id}/image`, { responseType: 'blob' })
      .then(r => setPhoto(URL.createObjectURL(r.data)))
      .catch(() => {})
  }, [log.log_id])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-title">รายละเอียดการเช็คชื่อ</div>

        {photo && (
          <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, aspectRatio: '4/3', background: 'var(--fc-muted)' }}>
            <img src={photo} alt="scan" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>สถานะ</span>
            <span className="chip" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>ชื่อ-นามสกุล</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>{log.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>รหัสนักเรียน</span>
            <span style={{ fontSize: 13, color: 'var(--fc-text-2)', fontFamily: 'var(--fc-font-mono)' }}>{log.student_id}</span>
          </div>
          {log.grade_level && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>ชั้น/ห้อง</span>
              <span style={{ fontSize: 13, color: 'var(--fc-text-2)' }}>ชั้น {log.grade_level} ห้อง {log.room_number}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>เวลา</span>
            <span style={{ fontSize: 13, color: 'var(--fc-text-2)', fontVariantNumeric: 'tabular-nums' }}>
              {log.scan_time || (log.status === 'already_checked' ? log.checked_at : log.timestamp)}
            </span>
          </div>
          {log.subject && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>วิชา</span>
              <span style={{ fontSize: 13, color: 'var(--fc-text-2)' }}>{log.subject}</span>
            </div>
          )}
          {log.confidence != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--fc-text-4)' }}>ความแม่นยำ</span>
              <span style={{ fontSize: 13, color: 'var(--fc-text-2)' }}>{Math.round(log.confidence * 100)}%</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {log.log_id && (
            <button
              className="btn btn-sm"
              style={{ flex: 1, background: 'transparent', border: '1px solid var(--fc-danger)', color: 'var(--fc-danger)' }}
              onClick={onCancel}
            >ยกเลิกการเช็คชื่อ</button>
          )}
          <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  )
}
