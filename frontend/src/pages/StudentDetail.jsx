import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API_ENROLL = `${import.meta.env.VITE_API_URL}/enroll`
const API_STATS  = `${import.meta.env.VITE_API_URL}/stats`
const API_ATTEND = `${import.meta.env.VITE_API_URL}/attendance`

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
const IcTrash = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)
const IcPlus = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IcScan = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcSwitchCamera = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 7h-3a2 2 0 0 1-2-2V2"/><path d="M9 2H5a2 2 0 0 0-2 2v4"/><path d="M4 17v3a2 2 0 0 0 2 2h3"/>
    <path d="M15 22h3a2 2 0 0 0 2-2v-3"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

// ── Status chip ─────────────────────────────────────────────────
const STATUS_MAP = {
  present:         { label: 'มาเรียน',  color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
  late:            { label: 'มาสาย',    color: 'var(--fc-warning)',      bg: 'var(--fc-warning-light)' },
  absent:          { label: 'ขาดเรียน', color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)'  },
  excused:         { label: 'ลา',       color: '#7c3aed',                bg: 'rgba(124,58,237,0.1)'    },
  already_checked: { label: 'เช็คซ้ำ',  color: 'var(--fc-text-3)',       bg: 'var(--fc-muted)'         },
}
function StatusChip({ status, reason }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'var(--fc-text-3)', bg: 'var(--fc-muted)' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span className="chip" style={{ background: s.bg, color: s.color }}>{s.label}</span>
      {status === 'excused' && reason && (
        <span style={{ fontSize: 10, color: '#7c3aed', fontStyle: 'italic' }}>{reason}</span>
      )}
    </span>
  )
}

const METHOD_CFG = {
  face:   { label: 'สแกนใบหน้า', color: '#1A56DB', bg: '#EFF6FF' },
  qr:     { label: 'QR Code',    color: '#7C3AED', bg: '#F5F3FF' },
  manual: { label: 'กรอกมือ',   color: '#6B7280', bg: '#F3F4F6' },
}
function MethodChip({ method }) {
  if (!method) return null
  const m = METHOD_CFG[method] ?? { label: method, color: '#6B7280', bg: '#F3F4F6' }
  return <span className="chip" style={{ background: m.bg, color: m.color, fontSize: 11 }}>{m.label}</span>
}

// ── Face slot thumbnail (lazy image fetch) ───────────────────────
function FaceSlotThumb({ studentId, embId, hasImage }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!hasImage) return
    let objectUrl = null
    axios.get(
      `${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings/${embId}/image`,
      { responseType: 'blob' }
    ).then(r => {
      objectUrl = URL.createObjectURL(r.data)
      setUrl(objectUrl)
    }).catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [embId, hasImage, studentId])

  if (!hasImage) return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fc-text-4)' }}>
      <IcImage />
    </div>
  )
  if (!url) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /></div>
  return <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
}

// ── Scan thumbnail (lazy fetch, owns objectURL lifecycle) ────────
function ScanThumb({ logId, onView, size = 44 }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let objectUrl = null
    axios.get(`${API_ATTEND}/logs/${logId}/image`, { responseType: 'blob' })
      .then(r => { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl) })
      .catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [logId])

  if (!url) return (
    <div style={{ width: size, height: size, borderRadius: 10, background: 'var(--fc-muted)', border: '1px solid var(--fc-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
    </div>
  )
  return (
    <img src={url} alt="รูปสแกน" title="คลิกดูรูปขนาดใหญ่" onClick={() => onView(url)}
      style={{ width: size, height: size, borderRadius: 10, objectFit: 'cover', display: 'block', cursor: 'pointer', flexShrink: 0, border: '1px solid var(--fc-border)' }} />
  )
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

// ── Student avatar (lazy loads primary face photo) ───────────────
function StudentAvatar({ studentId, firstName, hasFace = true, size = 80, onClick }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!hasFace) return
    let objectUrl = null
    axios.get(`${API_ENROLL}/students/${encodeURIComponent(studentId)}/face`, { responseType: 'blob' })
      .then(r => { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl) })
      .catch(() => {})
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [studentId, hasFace])

  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
    border: '2px solid var(--fc-border)', cursor: onClick ? 'pointer' : 'default',
    transition: 'opacity 0.15s',
  }
  if (url) return (
    <div style={base} onClick={onClick}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.85' }}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      title={onClick ? 'คลิกดูรูปใบหน้าทั้งหมด' : undefined}>
      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
  return (
    <div style={{ ...base, background: 'var(--fc-primary-light)', color: 'var(--fc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700 }} onClick={onClick}>
      {(firstName ?? '?')[0]}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export default function StudentDetail() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const camRef = useRef(null)
  const fileRef = useRef(null)
  const slotCamRef = useRef(null)
  const [facingMode, setFacingMode] = useState('environment')

  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // face slots
  const [slots, setSlots]             = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [addSlotOpen, setAddSlotOpen] = useState(false)
  const [slotTab, setSlotTab]         = useState('camera') // 'camera' | 'upload'
  const [slotCamReady, setSlotCamReady] = useState(false)
  const [slotCapture, setSlotCapture] = useState(null)
  const [slotPhotoItems, setSlotPhotoItems] = useState([]) // [{ id, file, previewUrl, status, reason }]
  const slotFileRef                   = useRef(null)
  const [slotBusy, setSlotBusy]       = useState(false)
  const [slotMsg, setSlotMsg]         = useState(null)

  // face view modal
  const [faceOpen, setFaceOpen]     = useState(false)
  const [faceUrl, setFaceUrl]       = useState(null)
  const [faceLoading, setFaceLoading] = useState(false)
  const [faceError, setFaceError]   = useState(false)

  // update face modal
  const [updateOpen, setUpdateOpen]     = useState(false)
  const [updateTab, setUpdateTab]       = useState('camera')
  const [camCapture, setCamCapture]     = useState(null)
  const [camReady, setCamReady]         = useState(false)
  const [photoItems, setPhotoItems]     = useState([])
  const multiFileRef                    = useRef(null)
  const [updating, setUpdating]         = useState(false)
  const [updateMsg, setUpdateMsg]       = useState(null)

  // edit info modal
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ title: '', first_name: '', last_name: '', grade_level: '', room_number: '' })
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // face gallery modal
  const [galleryOpen, setGalleryOpen] = useState(false)
  // face lightbox
  const [lightbox, setLightbox] = useState(null) // { embId, url | null }
  // scan image view
  const [scanView, setScanView] = useState(null)  // { url }
  // attendance log detail modal
  const [attendLog, setAttendLog]           = useState(null)
  const [attendLogUrl, setAttendLogUrl]     = useState(null)
  const [attendLogLoading, setAttendLogLoading] = useState(false)
  const [statusFilter, setStatusFilter]     = useState('all')

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

  const loadSlots = async () => {
    setSlotsLoading(true)
    try {
      const res = await axios.get(`${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings`)
      setSlots(res.data)
    } catch {
      // fail silently — not critical
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => { load(); loadSlots() }, [studentId])

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
    setCamCapture(null)
    setPhotoItems([])
    setUpdateMsg(null)
    setCamReady(false)
  }

  const closeUpdate = () => {
    setUpdateOpen(false)
    setCamCapture(null)
    setPhotoItems([])
  }

  const captureFromCam = () => {
    const img = camRef.current?.getScreenshot()
    if (img) setCamCapture(img)
  }

  // ── Add face slot ─────────────────────────────────────────────
  const openAddSlot = () => {
    setAddSlotOpen(true)
    setSlotTab('camera')
    setSlotCapture(null)
    setSlotCamReady(false)
    setSlotPhotoItems([])
    setSlotMsg(null)
  }

  const closeAddSlot = () => {
    slotPhotoItems.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setAddSlotOpen(false)
    setSlotCapture(null)
    setSlotPhotoItems([])
    setSlotMsg(null)
  }

  const switchSlotTab = (tab) => {
    setSlotTab(tab)
    setSlotCapture(null)
    slotPhotoItems.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setSlotPhotoItems([])
    setSlotMsg(null)
  }

  const validateSlotPhoto = async (item) => {
    const fd = new FormData()
    fd.append('file', item.file, item.file.name)
    try {
      const res = await axios.post(`${API_ENROLL}/validate-photo`, fd)
      setSlotPhotoItems(prev => prev.map(p =>
        p.id === item.id ? { ...p, status: res.data.valid ? 'valid' : 'invalid', reason: res.data.reason } : p
      ))
    } catch {
      setSlotPhotoItems(prev => prev.map(p =>
        p.id === item.id ? { ...p, status: 'invalid', reason: 'ตรวจสอบไม่ได้' } : p
      ))
    }
  }

  const addSlotPhotos = (files) => {
    const remaining = MAX_SLOTS - slots.length
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining)
    imgs.forEach(file => {
      const item = { id: `${Date.now()}-${Math.random()}`, file, previewUrl: URL.createObjectURL(file), status: 'validating', reason: '' }
      setSlotPhotoItems(prev => [...prev, item])
      validateSlotPhoto(item)
    })
  }

  const removeSlotPhoto = (id) => {
    setSlotPhotoItems(prev => {
      const found = prev.find(p => p.id === id)
      if (found) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  const submitAddSlot = async () => {
    setSlotBusy(true); setSlotMsg(null)
    try {
      const fd = new FormData()
      if (slotTab === 'camera') {
        if (!slotCapture) return
        const blob = await fetch(slotCapture).then(r => r.blob())
        fd.append('file', blob, `${studentId}_slot.jpg`)
        await axios.post(`${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings`, fd)
        setSlotMsg({ ok: true, text: 'เพิ่มมุมใบหน้าสำเร็จ' })
      } else {
        const validItems = slotPhotoItems.filter(p => p.status === 'valid')
        if (!validItems.length) return
        validItems.forEach(p => fd.append('files', p.file, p.file.name))
        const res = await axios.post(`${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings/bulk`, fd)
        setSlotMsg({ ok: true, text: `เพิ่มมุมใบหน้าสำเร็จ ${res.data.added} มุม` })
      }
      await loadSlots()
      setTimeout(() => closeAddSlot(), 900)
    } catch (e) {
      setSlotMsg({ ok: false, text: e.response?.data?.detail || 'เพิ่มไม่สำเร็จ' })
    } finally {
      setSlotBusy(false)
    }
  }

  const deleteSlot = async (embId) => {
    if (!window.confirm('ลบมุมใบหน้านี้ออกจากระบบ?')) return
    try {
      await axios.delete(`${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings/${embId}`)
      await loadSlots()
    } catch (e) {
      alert(e.response?.data?.detail || 'ลบไม่สำเร็จ')
    }
  }

  // ── Multi-photo upload helpers ────────────────────────────────
  const validateOne = async (item) => {
    const fd = new FormData()
    fd.append('file', item.file, item.file.name)
    try {
      const res = await axios.post(`${API_ENROLL}/validate-photo`, fd)
      setPhotoItems(prev => prev.map(p =>
        p.id === item.id ? { ...p, status: res.data.valid ? 'valid' : 'invalid', reason: res.data.reason } : p
      ))
    } catch {
      setPhotoItems(prev => prev.map(p =>
        p.id === item.id ? { ...p, status: 'invalid', reason: 'ตรวจสอบไม่ได้' } : p
      ))
    }
  }

  const addPhotos = (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    imgs.forEach(file => {
      const id = `${Date.now()}-${Math.random()}`
      const previewUrl = URL.createObjectURL(file)
      const item = { id, file, previewUrl, status: 'validating', reason: '' }
      setPhotoItems(prev => [...prev, item])
      validateOne(item)
    })
  }

  const removePhoto = (id) => {
    setPhotoItems(prev => {
      const found = prev.find(p => p.id === id)
      if (found) URL.revokeObjectURL(found.previewUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  // ── Submit: camera tab ────────────────────────────────────────
  const submitCamFace = async () => {
    if (!camCapture) return
    setUpdating(true); setUpdateMsg(null)
    try {
      const blob = await fetch(camCapture).then(r => r.blob())
      const fd = new FormData()
      fd.append('file', blob, `${studentId}.jpg`)
      await axios.put(`${API_ENROLL}/update-face/${encodeURIComponent(studentId)}`, fd)
      setUpdateMsg({ ok: true, text: 'อัปเดตใบหน้าสำเร็จ' })
      setFaceUrl(null); await load()
      setTimeout(() => { closeUpdate(); setFaceOpen(false) }, 1000)
    } catch (e) {
      setUpdateMsg({ ok: false, text: e.response?.data?.detail || 'อัปเดตไม่สำเร็จ' })
    } finally { setUpdating(false) }
  }

  // ── Submit: upload tab (multi) ────────────────────────────────
  const submitMultiFace = async () => {
    const validItems = photoItems.filter(p => p.status === 'valid')
    if (!validItems.length) return
    setUpdating(true); setUpdateMsg(null)
    try {
      const fd = new FormData()
      validItems.forEach(p => fd.append('files', p.file, p.file.name))
      const res = await axios.put(`${API_ENROLL}/update-face-multi/${encodeURIComponent(studentId)}`, fd)
      setUpdateMsg({ ok: true, text: res.data.message })
      setFaceUrl(null); await load()
      setTimeout(() => { closeUpdate(); setFaceOpen(false) }, 1200)
    } catch (e) {
      setUpdateMsg({ ok: false, text: e.response?.data?.detail || 'อัปเดตไม่สำเร็จ' })
    } finally { setUpdating(false) }
  }

  // ── Face lightbox ─────────────────────────────────────────────
  const openLightbox = async (embId) => {
    setLightbox({ embId, url: null })
    try {
      const res = await axios.get(
        `${API_ENROLL}/students/${encodeURIComponent(studentId)}/embeddings/${embId}/image`,
        { responseType: 'blob' }
      )
      setLightbox({ embId, url: URL.createObjectURL(res.data) })
    } catch { setLightbox(null) }
  }
  const closeLightbox = () => {
    if (lightbox?.url) URL.revokeObjectURL(lightbox.url)
    setLightbox(null)
  }

  // ── Scan image view (URL owned by ScanThumb, no revoke here) ─
  const closeScanView = () => setScanView(null)

  const openAttendLog = async (r) => {
    setAttendLog(r)
    setAttendLogUrl(null)
    if (r.has_scan_image && r.log_id) {
      setAttendLogLoading(true)
      try {
        const res = await axios.get(`${API_ATTEND}/logs/${r.log_id}/image`, { responseType: 'blob' })
        setAttendLogUrl(URL.createObjectURL(res.data))
      } catch {}
      finally { setAttendLogLoading(false) }
    }
  }

  const closeAttendLog = () => {
    if (attendLogUrl) URL.revokeObjectURL(attendLogUrl)
    setAttendLog(null)
    setAttendLogUrl(null)
  }

  // ── Edit info ─────────────────────────────────────────────────
  const openEdit = () => {
    if (!detail) return
    const s = detail.student
    setForm({ title: s.title ?? '', first_name: s.first_name ?? '', last_name: s.last_name ?? '', grade_level: s.grade_level ?? '', room_number: s.room_number ?? '' })
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
  const isAdmin = user?.role === 'admin'
  const MAX_SLOTS = 50

  return (
    <main id="main-content" className="page">

      {/* Back + Export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/students')}>
          <IcArrowLeft /> รายชื่อนักเรียน
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => window.open(`${import.meta.env.VITE_API_URL}/reports/export?student_id=${encodeURIComponent(studentId)}`, '_blank')}
        >
          <IcUpload /> ส่งออก Excel
        </button>
      </div>

      {/* Low attendance alert */}
      {lastRate !== null && lastRate < 80 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: lastRate < 60 ? 'var(--fc-danger-light)' : 'var(--fc-warning-light)',
          border: `1px solid ${lastRate < 60 ? 'var(--fc-danger)' : 'var(--fc-warning)'}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ fontSize: 13, color: lastRate < 60 ? 'var(--fc-danger)' : 'var(--fc-warning)', fontWeight: 500 }}>
            อัตราการเข้าเรียนต่ำกว่าเกณฑ์ — <strong>{lastRate}%</strong>
            {lastRate < 60 ? ' (ต่ำกว่า 60% — ต้องดำเนินการ)' : ' (ต่ำกว่า 80%)'}
          </div>
        </div>
      )}

      {/* Hero card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <StudentAvatar
            studentId={studentId}
            firstName={student.first_name ?? student.full_name}
            hasFace={student.has_face}
            size={80}
            onClick={isAdmin ? () => setGalleryOpen(true) : undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--fc-text)', lineHeight: 1.2 }}>
                  {student.full_name ?? [student.title, student.first_name, student.last_name].filter(Boolean).join(' ')}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
              {isAdmin && (
                <button className="btn btn-ghost btn-sm" onClick={openEdit} style={{ flexShrink: 0 }}>
                  <IcEdit /> แก้ไข
                </button>
              )}
            </div>

            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>
                  {slotsLoading ? '…' : `${slots.length} รูปใบหน้า`}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setGalleryOpen(true)} disabled={slotsLoading}>
                  <IcImage /> ดูรูปใบหน้า
                </button>
                {slots.length < MAX_SLOTS && (
                  <button className="btn btn-primary btn-sm" onClick={openAddSlot}>
                    <IcPlus /> เพิ่มรูป
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        {(() => {
          const rate = summary.total > 0 ? Math.round(((summary.present + summary.late) / summary.total) * 100) : null
          const rateColor = rate == null ? 'var(--fc-text-2)' : rate >= 80 ? 'var(--fc-success)' : rate >= 60 ? 'var(--fc-warning)' : 'var(--fc-danger)'
          return (
            <div style={{ marginTop: 20, borderTop: '1px solid var(--fc-border)', paddingTop: 16 }}>
              {/* Attendance rate bar */}
              {rate != null && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--fc-text-4)' }}>อัตราการเข้าเรียน</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: rateColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{rate}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--fc-muted)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: rateColor, borderRadius: 99, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )}
              <div className="stats-4col">
                {[
                  { label: 'มาเรียน',    value: summary.present, color: 'var(--fc-success)'  },
                  { label: 'มาสาย',      value: summary.late,    color: 'var(--fc-warning)'  },
                  { label: 'ขาดเรียน',   value: summary.absent,  color: 'var(--fc-danger)'   },
                  { label: 'รวมทั้งหมด', value: summary.total,   color: 'var(--fc-text-2)'   },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    textAlign: 'center', padding: '4px 8px',
                    borderRight: i < 3 ? '1px solid var(--fc-border)' : 'none',
                  }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Trend chart */}
      {trend?.length >= 2 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>แนวโน้มการเข้าเรียน</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: trendColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{lastRate}%</div>
          </div>
          <AreaChart data={trend} valueKey="rate" color={trendColor} height={100} />
        </div>
      )}

      {/* Attendance feed */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--fc-border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)', flexShrink: 0 }}>ประวัติการเข้าเรียน</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'ทั้งหมด' },
              { key: 'present', label: 'มาเรียน' },
              { key: 'late', label: 'มาสาย' },
              { key: 'absent', label: 'ขาดเรียน' },
              { key: 'excused', label: 'ลา' },
              { key: 'already_checked', label: 'เช็คซ้ำ' },
            ].map(f => {
              const count = f.key === 'all' ? records.length : records.filter(r => r.status === f.key).length
              if (f.key !== 'all' && count === 0) return null
              const active = statusFilter === f.key
              const s = STATUS_MAP[f.key]
              return (
                <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                  background: active ? (s?.bg ?? 'var(--fc-primary-light)') : 'var(--fc-muted)',
                  color: active ? (s?.color ?? 'var(--fc-primary)') : 'var(--fc-text-3)',
                  transition: 'all 0.15s',
                }}>
                  {f.label} {count}
                </button>
              )
            })}
          </div>
        </div>
        {(() => {
          const filtered = statusFilter === 'all' ? records : records.filter(r => r.status === statusFilter)
          if (filtered.length === 0) return (
            <div style={{ textAlign: 'center', color: 'var(--fc-text-4)', padding: '40px 0', fontSize: 13 }}>
              ไม่มีบันทึกสถานะนี้
            </div>
          )
          return (
          <div>
            {filtered.map((r, i) => (
              <div key={i}
                onClick={() => openAttendLog(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--fc-border)' : 'none',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--fc-muted)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flexShrink: 0 }}>
                  {r.has_scan_image && r.log_id ? (
                    <ScanThumb logId={r.log_id} onView={() => {}} size={56} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 10,
                      background: 'var(--fc-muted)', border: '1px solid var(--fc-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--fc-text-4)',
                    }}>
                      <IcScan />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: 'var(--fc-text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.subject_name}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--fc-text-4)', fontFamily: 'var(--fc-font-mono)' }}>{r.subject_code}</span>
                    <span style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>
                      {new Date(r.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--fc-text-4)', fontVariantNumeric: 'tabular-nums' }}>{r.time}</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MethodChip method={r.check_method} />
                  <StatusChip status={r.status} reason={r.reason} />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--fc-text-4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
          )
        })()}
      </div>

      {/* ── Face view modal ─────────────────────────────────────── */}
      {faceOpen && (
        <div className="modal-overlay" onClick={closeFace}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">ใบหน้าที่ลงทะเบียน</div>
            <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 16 }}>
              {student.full_name} · {student.student_id}
            </div>

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
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={() => { closeFace(); openUpdate() }}>
                  อัปเดตใบหน้าใหม่
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeFace}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add face slot modal ─────────────────────────────────── */}
      {addSlotOpen && (
        <div className="modal-overlay" onClick={closeAddSlot}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">เพิ่มรูปใบหน้า</div>
            <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 14 }}>
              {student.full_name} · มีอยู่แล้ว {slots.length} รูป
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: 4 }}>
              {[
                { key: 'camera', label: 'ถ่ายจากกล้อง', icon: <IcCamera /> },
                { key: 'upload', label: 'อัปโหลดรูป',   icon: <IcUpload /> },
              ].map(t => (
                <button key={t.key} onClick={() => switchSlotTab(t.key)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: slotTab === t.key ? 600 : 400,
                  background: slotTab === t.key ? 'var(--fc-surface)' : 'transparent',
                  color: slotTab === t.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
                  boxShadow: slotTab === t.key ? 'var(--fc-shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ── Camera tab ── */}
            {slotTab === 'camera' && (
              <>
                {slotCapture ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12 }}>
                    <img src={slotCapture} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button onClick={() => setSlotCapture(null)} style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.55)', color: '#fff',
                      border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}>ถ่ายใหม่</button>
                  </div>
                ) : (
                  <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12, position: 'relative' }}>
                    <Webcam ref={slotCamRef} audio={false} screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                      onUserMedia={() => setSlotCamReady(true)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: 140, height: 170, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.5)' }} />
                    </div>
                    <button
                      onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(0,0,0,0.45)', color: '#fff',
                        border: 'none', borderRadius: 8, padding: '6px 10px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                      }}
                    >
                      <IcSwitchCamera /> สลับกล้อง
                    </button>
                  </div>
                )}
                {!slotCapture && (
                  <button className="btn btn-ghost btn-full" style={{ marginBottom: 12 }}
                    onClick={() => { const img = slotCamRef.current?.getScreenshot(); if (img) setSlotCapture(img) }}
                    disabled={!slotCamReady}>
                    <IcCamera /> ถ่ายภาพ
                  </button>
                )}
              </>
            )}

            {/* ── Upload tab ── */}
            {slotTab === 'upload' && (
              <>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addSlotPhotos(e.dataTransfer.files) }}
                  onClick={() => slotFileRef.current?.click()}
                  style={{
                    borderRadius: 10, border: `2px dashed ${slotPhotoItems.length ? 'var(--fc-primary)' : 'var(--fc-border)'}`,
                    background: 'var(--fc-muted)', padding: '20px 16px', marginBottom: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 6, cursor: 'pointer', transition: 'all 0.15s', minHeight: 80,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--fc-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = slotPhotoItems.length ? 'var(--fc-primary)' : 'var(--fc-border)'}
                >
                  <IcUpload />
                  <div style={{ fontSize: 13, color: 'var(--fc-text-3)', textAlign: 'center' }}>
                    คลิกหรือลากรูปมาวางที่นี่ (เลือกได้หลายรูป)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>JPG, PNG · แต่ละรูป = 1 มุมใบหน้า</div>
                  <input ref={slotFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => { addSlotPhotos(e.target.files); e.target.value = '' }} />
                </div>

                {slotPhotoItems.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 10 }}>
                    {slotPhotoItems.map(item => (
                      <div key={item.id} style={{
                        position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1/1',
                        border: `2px solid ${item.status === 'valid' ? 'var(--fc-success-dark)' : item.status === 'invalid' ? 'var(--fc-danger)' : 'var(--fc-border)'}`,
                        background: 'var(--fc-muted)',
                      }}>
                        <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: item.status === 'invalid' ? 'rgba(220,38,38,0.55)' : item.status === 'valid' ? 'rgba(22,163,74,0.25)' : 'rgba(0,0,0,0.35)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.status === 'validating' && (
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                          )}
                          {item.status === 'valid' && (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {item.status === 'invalid' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          )}
                        </div>
                        {item.status === 'invalid' && (
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(0,0,0,0.75)', padding: '3px 5px',
                            fontSize: 9, color: '#fff', lineHeight: 1.3, textAlign: 'center',
                          }}>{item.reason}</div>
                        )}
                        <button onClick={e => { e.stopPropagation(); removeSlotPhoto(item.id) }} style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 10, lineHeight: '18px', textAlign: 'center', padding: 0,
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {slotPhotoItems.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--fc-text-3)', marginBottom: 10 }}>
                    {(() => {
                      const valid   = slotPhotoItems.filter(p => p.status === 'valid').length
                      const invalid = slotPhotoItems.filter(p => p.status === 'invalid').length
                      const waiting = slotPhotoItems.filter(p => p.status === 'validating').length
                      return (
                        <>
                          <span style={{ color: 'var(--fc-success-dark)', fontWeight: 600 }}>✓ {valid} รูปผ่าน</span>
                          {invalid > 0 && <span style={{ color: 'var(--fc-danger)', marginLeft: 10 }}>✗ {invalid} รูปไม่ผ่าน</span>}
                          {waiting > 0 && <span style={{ color: 'var(--fc-text-4)', marginLeft: 10 }}>⏳ {waiting} กำลังตรวจ</span>}
                        </>
                      )
                    })()}
                  </div>
                )}
              </>
            )}

            {/* Hint */}
            {!slotCapture && slotPhotoItems.length === 0 && (
              <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                {[
                  'รูปที่แตกต่างกัน (แสง มุม สภาพแวดล้อม) ช่วยให้ระบบแม่นขึ้น',
                  'ระบบจะเพิ่มรูปจากการสแกนเช็คชื่อให้อัตโนมัติด้วย',
                ].map(t => (
                  <p key={t} style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· {t}</p>
                ))}
              </div>
            )}

            {slotMsg && (
              <div className={`toast ${slotMsg.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 12 }}>
                {slotMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeAddSlot}>ยกเลิก</button>
              <button className="btn btn-primary" onClick={submitAddSlot}
                disabled={slotBusy || (slotTab === 'camera' ? !slotCapture : !slotPhotoItems.some(p => p.status === 'valid'))}>
                {slotBusy ? 'กำลังประมวลผล…' : 'บันทึกรูปใบหน้า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update face modal ───────────────────────────────────── */}
      {updateOpen && (
        <div className="modal-overlay" onClick={closeUpdate}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">อัปเดตใบหน้า</div>
            <div style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 16 }}>
              {student.full_name} · {student.student_id}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: 4 }}>
              {[
                { key: 'camera', label: 'ถ่ายจากกล้อง', icon: <IcCamera /> },
                { key: 'upload', label: 'อัปโหลดรูปภาพ', icon: <IcUpload /> },
              ].map(t => (
                <button key={t.key}
                  onClick={() => { setUpdateTab(t.key); setCamCapture(null); setPhotoItems([]); setUpdateMsg(null) }}
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

            {/* ── Camera tab ─────────────────────────────────────── */}
            {updateTab === 'camera' && (
              <>
                {camCapture ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12 }}>
                    <img src={camCapture} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button onClick={() => setCamCapture(null)} style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.55)', color: '#fff',
                      border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}>ถ่ายใหม่</button>
                  </div>
                ) : (
                  <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12, position: 'relative' }}>
                    <Webcam ref={camRef} audio={false} screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                      onUserMedia={() => setCamReady(true)} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <div style={{ width: 140, height: 170, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.5)' }} />
                    </div>
                    <button
                      onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(0,0,0,0.45)', color: '#fff',
                        border: 'none', borderRadius: 8, padding: '6px 10px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                      }}
                    >
                      <IcSwitchCamera /> สลับกล้อง
                    </button>
                  </div>
                )}
                {!camCapture && (
                  <button className="btn btn-ghost btn-full" style={{ marginBottom: 12 }}
                    onClick={captureFromCam} disabled={!camReady}>
                    <IcCamera /> ถ่ายภาพ
                  </button>
                )}
                {!camCapture && (
                  <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                    {['มองตรงเข้าหากล้อง', 'แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า', 'ถอดแว่นและหน้ากากออก'].map(t => (
                      <p key={t} style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· {t}</p>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Upload tab (multi-photo) ────────────────────────── */}
            {updateTab === 'upload' && (
              <>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }}
                  onClick={() => multiFileRef.current?.click()}
                  style={{
                    borderRadius: 10, border: `2px dashed ${photoItems.length ? 'var(--fc-primary)' : 'var(--fc-border)'}`,
                    background: 'var(--fc-muted)', padding: '20px 16px', marginBottom: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 6, cursor: 'pointer', transition: 'all 0.15s', minHeight: 90,
                  }}
                >
                  <IcUpload />
                  <div style={{ fontSize: 13, color: 'var(--fc-text-3)', textAlign: 'center' }}>
                    คลิกหรือลากรูปมาวางที่นี่ (เลือกได้หลายรูป)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>JPG, PNG · ยิ่งหลายรูปยิ่งแม่นยำ</div>
                  <input ref={multiFileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => addPhotos(e.target.files)} />
                </div>

                {photoItems.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 12 }}>
                    {photoItems.map(item => (
                      <div key={item.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1/1',
                        border: `2px solid ${item.status === 'valid' ? 'var(--fc-success-dark)' : item.status === 'invalid' ? 'var(--fc-danger)' : 'var(--fc-border)'}`,
                        background: 'var(--fc-muted)',
                      }}>
                        <img src={item.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: item.status === 'invalid' ? 'rgba(220,38,38,0.55)' : item.status === 'valid' ? 'rgba(22,163,74,0.25)' : 'rgba(0,0,0,0.35)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.status === 'validating' && (
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />
                          )}
                          {item.status === 'valid' && (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {item.status === 'invalid' && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          )}
                        </div>
                        {item.status === 'invalid' && (
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'rgba(0,0,0,0.75)', padding: '3px 5px',
                            fontSize: 9, color: '#fff', lineHeight: 1.3, textAlign: 'center',
                          }}>
                            {item.reason}
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); removePhoto(item.id) }} style={{
                          position: 'absolute', top: 3, right: 3,
                          width: 18, height: 18, borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', color: '#fff',
                          border: 'none', cursor: 'pointer', fontSize: 10, lineHeight: '18px', textAlign: 'center', padding: 0,
                        }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {photoItems.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--fc-text-3)', marginBottom: 12 }}>
                    {(() => {
                      const valid   = photoItems.filter(p => p.status === 'valid').length
                      const invalid = photoItems.filter(p => p.status === 'invalid').length
                      const waiting = photoItems.filter(p => p.status === 'validating').length
                      return (
                        <>
                          <span style={{ color: 'var(--fc-success-dark)', fontWeight: 600 }}>✓ {valid} รูปผ่าน</span>
                          {invalid > 0 && <span style={{ color: 'var(--fc-danger)', marginLeft: 10 }}>✗ {invalid} รูปไม่ผ่าน</span>}
                          {waiting > 0 && <span style={{ color: 'var(--fc-text-4)', marginLeft: 10 }}>⏳ {waiting} กำลังตรวจ</span>}
                          {valid > 1 && <span style={{ color: 'var(--fc-primary)', marginLeft: 10 }}>· จะใช้ {valid} รูปเพิ่มความแม่นยำ</span>}
                        </>
                      )
                    })()}
                  </div>
                )}
              </>
            )}

            {updateMsg && (
              <div className={`toast ${updateMsg.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 12 }}>
                {updateMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={closeUpdate}>ยกเลิก</button>
              {updateTab === 'camera' ? (
                <button className="btn btn-primary" onClick={submitCamFace} disabled={!camCapture || updating}>
                  {updating ? 'กำลังประมวลผล…' : 'บันทึกใบหน้า'}
                </button>
              ) : (
                <button className="btn btn-primary"
                  onClick={submitMultiFace}
                  disabled={!photoItems.some(p => p.status === 'valid') || updating}
                >
                  {updating ? 'กำลังประมวลผล…' : `บันทึกใบหน้า (${photoItems.filter(p => p.status === 'valid').length} รูป)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Face gallery modal ─────────────────────────────────── */}
      {galleryOpen && (() => {
        const manualSlots = slots.filter(s => s.source !== 'scan')
        const scanSlots   = slots.filter(s => s.source === 'scan')
        const totalSlots  = slots.length

        const FaceGrid = ({ group, canDelete }) => (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {group.map(slot => (
              <div key={slot.id}
                onClick={() => openLightbox(slot.id)}
                title={slot.label}
                style={{ position: 'relative', width: 96, flexShrink: 0, cursor: 'pointer' }}>
                <div style={{
                  width: 96, height: 96, borderRadius: 10, overflow: 'hidden',
                  background: 'var(--fc-muted)', border: '1px solid var(--fc-border)',
                  transition: 'opacity 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <FaceSlotThumb studentId={studentId} embId={slot.id} hasImage={slot.has_image} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--fc-text-4)', marginTop: 3, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {slot.label}
                </div>
                {canDelete && totalSlots > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteSlot(slot.id) }}
                    title="ลบรูปนี้"
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}
                  >
                    <IcTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
        )

        return (
          <div className="modal-overlay" onClick={() => setGalleryOpen(false)}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title">รูปใบหน้าทั้งหมด</div>

              {/* ── Manual uploads ── */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>อัพโหลดเอง</div>
                    <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 1 }}>{manualSlots.length} รูป · คลิกดูขนาดใหญ่</div>
                  </div>
                  {totalSlots < MAX_SLOTS && (
                    <button className="btn btn-primary btn-sm" onClick={openAddSlot}>
                      <IcPlus /> เพิ่มรูป
                    </button>
                  )}
                </div>
                {manualSlots.length === 0 ? (
                  <div style={{ padding: '18px 0', color: 'var(--fc-text-4)', fontSize: 13, textAlign: 'center' }}>
                    ยังไม่มีรูปที่อัพโหลด — กดเพิ่มรูปเพื่อเริ่มต้น
                  </div>
                ) : (
                  <FaceGrid group={manualSlots} canDelete={true} />
                )}
              </div>

              {/* divider */}
              <div style={{ borderTop: '1px solid var(--fc-border)', marginBottom: 20 }} />

              {/* ── Scan-learned ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)' }}>จากการสแกนเช็คชื่อ</div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 1 }}>
                    {scanSlots.length} รูป · เพิ่มอัตโนมัติทุกครั้งที่สแกนสำเร็จ · ช่วยให้จดจำใบหน้าแม่นยำขึ้น
                  </div>
                </div>
                {scanSlots.length === 0 ? (
                  <div style={{ padding: '18px 0', color: 'var(--fc-text-4)', fontSize: 13, textAlign: 'center' }}>
                    ยังไม่มีรูปจากการสแกน — จะเพิ่มอัตโนมัติเมื่อสแกนเช็คชื่อครั้งแรก
                  </div>
                ) : (
                  <FaceGrid group={scanSlots} canDelete={true} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setGalleryOpen(false)}>ปิด</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Face lightbox ──────────────────────────────────────── */}
      {lightbox && (
        <div className="modal-overlay" onClick={closeLightbox}>
          <div className="modal" style={{ maxWidth: 380, padding: 0, overflow: 'hidden', background: '#000' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              {lightbox.url ? (
                <img src={lightbox.url} alt="รูปใบหน้า"
                  style={{ width: '100%', display: 'block', maxHeight: '80vh', objectFit: 'contain' }} />
              ) : (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                </div>
              )}
              <button onClick={closeLightbox} style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center', padding: 0,
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scan image view ─────────────────────────────────────── */}
      {scanView && (
        <div className="modal-overlay" onClick={closeScanView}>
          <div className="modal" style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <img src={scanView.url} alt="รูปสแกน"
                style={{ width: '100%', display: 'block', maxHeight: '80vh', objectFit: 'contain', background: '#000' }} />
              <button onClick={closeScanView} style={{
                position: 'absolute', top: 10, right: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: '32px', textAlign: 'center', padding: 0,
              }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance log detail modal ─────────────────────────── */}
      {attendLog && (
        <div className="modal-overlay" onClick={closeAttendLog}>
          <div className="modal" style={{ maxWidth: 400, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {/* Scan image area */}
            <div style={{ background: '#111', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {attendLog.has_scan_image ? (
                attendLogLoading ? (
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                ) : attendLogUrl ? (
                  <img src={attendLogUrl} alt="รูปสแกน"
                    style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
                ) : (
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>โหลดรูปไม่สำเร็จ</span>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)' }}>
                  <IcScan />
                  <span style={{ fontSize: 12 }}>ไม่มีรูปสแกน</span>
                </div>
              )}
              <button onClick={closeAttendLog} style={{
                position: 'absolute', top: 10, right: 10,
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: '30px', textAlign: 'center', padding: 0,
              }}>✕</button>
            </div>

            {/* Info section */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--fc-text)', marginBottom: 4 }}>
                {attendLog.subject_name}
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--fc-font-mono)', color: 'var(--fc-text-4)', marginBottom: 16 }}>
                {attendLog.subject_code}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>วันที่</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fc-text-2)' }}>
                    {new Date(attendLog.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>เวลา</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fc-text-2)', fontVariantNumeric: 'tabular-nums' }}>
                    {attendLog.time} น.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>สถานะ</div>
                  <StatusChip status={attendLog.status} reason={attendLog.reason} />
                </div>
                {attendLog.status === 'excused' && attendLog.reason && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginBottom: 3 }}>เหตุผล</div>
                    <div style={{ fontSize: 13, color: 'var(--fc-text-2)', fontStyle: 'italic' }}>{attendLog.reason}</div>
                  </div>
                )}
              </div>
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
              <label htmlFor="edit-title" className="form-label">คำนำหน้า</label>
              <select id="edit-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}>
                <option value="">-- ไม่ระบุ --</option>
                <option value="เด็กชาย">เด็กชาย</option>
                <option value="เด็กหญิง">เด็กหญิง</option>
                <option value="นาย">นาย</option>
                <option value="นางสาว">นางสาว</option>
                <option value="นาง">นาง</option>
              </select>
            </div>
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
