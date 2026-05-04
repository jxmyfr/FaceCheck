import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useDialog } from '../hooks/useDialog'

const API = import.meta.env.VITE_API_URL

const IcCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const IcDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IcTable = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
  </svg>
)

// ── Shared: photo upload grid ────────────────────────────────────
function PhotoGrid({ items, onRemove }) {
  const validCount   = items.filter(p => p.status === 'valid').length
  const invalidCount = items.filter(p => p.status === 'invalid').length
  const pendingCount = items.filter(p => p.status === 'validating').length
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 10 }}>
        {items.map(item => (
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
              {item.status === 'validating' && <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />}
              {item.status === 'valid'      && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {item.status === 'invalid'    && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </div>
            {item.status === 'invalid' && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.72)', padding: '3px 4px', fontSize: 8, color: '#fff', lineHeight: 1.3, textAlign: 'center' }}>
                {item.reason}
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); onRemove(item.id) }} style={{
              position: 'absolute', top: 3, right: 3,
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 10, lineHeight: '18px', textAlign: 'center', padding: 0,
            }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--fc-text-3)', marginBottom: 8 }}>
        <span style={{ color: 'var(--fc-success-dark)', fontWeight: 600 }}>✓ {validCount} รูปผ่าน</span>
        {invalidCount > 0 && <span style={{ color: 'var(--fc-danger)', marginLeft: 10 }}>✗ {invalidCount} ไม่ผ่าน</span>}
        {pendingCount > 0 && <span style={{ color: 'var(--fc-text-4)', marginLeft: 10 }}>⏳ {pendingCount} กำลังตรวจ</span>}
        {validCount > 1  && <span style={{ color: 'var(--fc-primary)', marginLeft: 10 }}>· จะ average {validCount} รูป</span>}
      </div>
    </>
  )
}

const ANGLE_STEPS = [
  { label: 'มุมตรง',  hint: 'มองตรงเข้าหากล้อง' },
  { label: 'หันซ้าย', hint: 'หันหน้าไปทางซ้ายเล็กน้อย (~15°)' },
  { label: 'หันขวา',  hint: 'หันหน้าไปทางขวาเล็กน้อย (~15°)' },
]

const GRADE_LEVELS = ['ม.1','ม.2','ม.3','ม.4','ม.5','ม.6']
const ROOMS = Array.from({ length: 15 }, (_, i) => String(i + 1))

// ── Single enrollment tab ────────────────────────────────────────
function SingleTab() {
  const cam      = useRef(null)
  const multiRef = useRef(null)
  const [form, setForm]       = useState({ student_id: '', title: '', first_name: '', last_name: '', grade_level: '', room_number: '' })
  const [state, setState]     = useState('idle')
  const [message, setMessage] = useState('')
  const [faceTab, setFaceTab] = useState('camera')
  const [shots, setShots]     = useState([])      // array of base64 per angle step
  const [step, setStep]       = useState(0)       // current angle index
  const [photoItems, setPhotoItems] = useState([])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const switchFaceTab = (t) => { setFaceTab(t); setShots([]); setStep(0); setPhotoItems([]); setState('idle'); setMessage('') }

  const capture = () => {
    const img = cam.current?.getScreenshot()
    if (!img) return
    setShots(prev => {
      const next = [...prev]
      next[step] = img
      return next
    })
    if (step < ANGLE_STEPS.length - 1) setStep(s => s + 1)
  }

  const retake = (i) => { setShots(prev => { const n = [...prev]; n[i] = null; return n }); setStep(i) }

  const validateOne = async (item) => {
    const fd = new FormData()
    fd.append('file', item.file, item.file.name)
    try {
      const res = await axios.post(`${API}/enroll/validate-photo`, fd)
      setPhotoItems(prev => prev.map(p => p.id === item.id ? { ...p, status: res.data.valid ? 'valid' : 'invalid', reason: res.data.reason } : p))
    } catch {
      setPhotoItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'invalid', reason: 'ตรวจสอบไม่ได้' } : p))
    }
  }

  const addPhotos = (files) => {
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const id   = `${Date.now()}-${Math.random()}`
      const item = { id, file, previewUrl: URL.createObjectURL(file), status: 'validating', reason: '' }
      setPhotoItems(prev => [...prev, item])
      validateOne(item)
    })
  }

  const removePhoto = (id) => {
    setPhotoItems(prev => { const f = prev.find(p => p.id === id); if (f) URL.revokeObjectURL(f.previewUrl); return prev.filter(p => p.id !== id) })
  }

  const submit = async () => {
    if (!infoComplete) {
      setState('error'); setMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง (รหัส ชื่อ นามสกุล ระดับชั้น ห้อง)'); return
    }
    setState('loading'); setMessage('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      let res
      if (faceTab === 'camera') {
        const captured = shots.filter(Boolean)
        if (!captured.length) { setState('error'); setMessage('กรุณาถ่ายภาพอย่างน้อย 1 มุม'); return }
        await Promise.all(captured.map(async (img, i) => {
          const blob = await fetch(img).then(r => r.blob())
          fd.append('files', blob, `${form.student_id}_angle${i}.jpg`)
        }))
        res = await axios.post(`${API}/enroll/register-multi`, fd)
      } else {
        const valid = photoItems.filter(p => p.status === 'valid')
        if (!valid.length) { setState('error'); setMessage('กรุณาอัปโหลดรูปที่ผ่านการตรวจสอบอย่างน้อย 1 รูป'); return }
        valid.forEach(p => fd.append('files', p.file, p.file.name))
        res = await axios.post(`${API}/enroll/register-multi`, fd)
      }
      setState('success'); setMessage(res.data.message)
      setForm({ student_id: '', title: '', first_name: '', last_name: '', grade_level: '', room_number: '' })
      setShots([]); setStep(0); setPhotoItems([])
    } catch (e) {
      setState('error'); setMessage(e.response?.data?.detail || 'ลงทะเบียนไม่สำเร็จ')
    }
  }

  const validCount   = photoItems.filter(p => p.status === 'valid').length
  const shotCount    = shots.filter(Boolean).length
  const infoComplete = !!(form.student_id.trim() && form.first_name.trim() && form.last_name.trim() && form.grade_level && form.room_number)
  const canSubmit    = infoComplete && state !== 'loading' && (faceTab === 'camera' ? shotCount > 0 : validCount > 0)
  const allCaptured  = shotCount === ANGLE_STEPS.length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 480px) minmax(300px, 640px)', gap: 20 }}>
      {/* Left: form */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 18 }}>ข้อมูลนักเรียน</div>
        <div className="form-group">
          <label htmlFor="enroll-student-id" className="form-label">รหัสนักเรียน *</label>
          <input id="enroll-student-id" placeholder="6408052218" value={form.student_id} onChange={e => set('student_id', e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="enroll-title" className="form-label">คำนำหน้า</label>
          <select id="enroll-title" value={form.title} onChange={e => set('title', e.target.value)}>
            <option value="">-- ไม่ระบุ --</option>
            <option value="เด็กชาย">เด็กชาย</option>
            <option value="เด็กหญิง">เด็กหญิง</option>
            <option value="นาย">นาย</option>
            <option value="นางสาว">นางสาว</option>
            <option value="นาง">นาง</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label htmlFor="enroll-first-name" className="form-label">ชื่อ *</label>
            <input id="enroll-first-name" placeholder="สมชาย" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="enroll-last-name" className="form-label">นามสกุล *</label>
            <input id="enroll-last-name" placeholder="ใจดี" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label htmlFor="enroll-grade" className="form-label">ระดับชั้น</label>
            <select id="enroll-grade" value={form.grade_level} onChange={e => set('grade_level', e.target.value)}>
              <option value="">-- เลือกชั้น --</option>
              {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="enroll-room" className="form-label">ห้อง</label>
            <select id="enroll-room" value={form.room_number} onChange={e => set('room_number', e.target.value)}>
              <option value="">-- เลือกห้อง --</option>
              {ROOMS.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
            </select>
          </div>
        </div>
        {message && <div className={`toast ${state === 'success' ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 14 }}>{message}</div>}
        <button className="btn btn-primary btn-lg btn-full" onClick={submit} disabled={!canSubmit}>
          {state === 'loading'
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังประมวลผล...</>
            : faceTab === 'camera' && shotCount > 0 ? `ลงทะเบียน (${shotCount} มุม)`
            : faceTab === 'upload' && validCount > 0 ? `ลงทะเบียน (${validCount} รูป)`
            : 'ลงทะเบียน'
          }
        </button>
      </div>

      {/* Right: face capture */}
      <div className="card" style={{ position: 'relative' }}>
        {!infoComplete && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, borderRadius: 'inherit',
            background: 'rgba(var(--fc-surface-rgb, 255,255,255), 0.82)',
            backdropFilter: 'blur(3px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--fc-text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-3)' }}>กรอกข้อมูลนักเรียนให้ครบก่อน</div>
            <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>รหัสนักเรียน · ชื่อ · นามสกุล · ระดับชั้น · ห้อง</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: 4 }}>
          {[{ key: 'camera', label: 'กล้อง', icon: <IcCamera /> }, { key: 'upload', label: 'อัปโหลดรูปภาพ', icon: <IcUpload /> }].map(t => (
            <button key={t.key} onClick={() => switchFaceTab(t.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: faceTab === t.key ? 600 : 400,
              background: faceTab === t.key ? 'var(--fc-surface)' : 'transparent',
              color: faceTab === t.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
              boxShadow: faceTab === t.key ? 'var(--fc-shadow-sm)' : 'none',
              transition: 'all 0.15s',
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {faceTab === 'camera' && (
          <>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              {ANGLE_STEPS.map((s, i) => {
                const done = !!shots[i]
                const active = i === step && !allCaptured
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                      background: done ? 'var(--fc-success)' : active ? 'var(--fc-primary)' : 'var(--fc-muted)',
                      color: done || active ? '#fff' : 'var(--fc-text-4)',
                    }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <span style={{ fontSize: 11, color: done ? 'var(--fc-success)' : active ? 'var(--fc-primary)' : 'var(--fc-text-4)', fontWeight: active ? 600 : 400 }}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Webcam / preview */}
            {!allCaptured ? (
              <>
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 8 }}>
                  <Webcam ref={cam} audio={false} screenshotFormat="image/jpeg" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center' }}>
                    <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 6 }}>
                      {ANGLE_STEPS[step]?.hint}
                    </span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-full" onClick={capture} style={{ marginBottom: 12 }}>
                  <IcCamera /> ถ่าย{ANGLE_STEPS[step]?.label}
                </button>
              </>
            ) : (
              <div style={{ background: 'var(--fc-success-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-success-dark)' }}>ถ่ายครบ 3 มุมแล้ว — กดลงทะเบียนได้เลย</span>
              </div>
            )}

            {/* Shot thumbnails */}
            {shotCount > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {ANGLE_STEPS.map((s, i) => (
                  <div key={i} style={{ flex: 1, position: 'relative' }}>
                    {shots[i]
                      ? <>
                          <img src={shots[i]} alt={s.label} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, display: 'block' }} />
                          <button onClick={() => retake(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>ถ่ายใหม่</button>
                          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--fc-success-dark)', marginTop: 3, fontWeight: 600 }}>{s.label} ✓</div>
                        </>
                      : <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: 'var(--fc-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: 'var(--fc-text-4)' }}>{s.label}</span>
                        </div>
                    }
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px' }}>
              {['แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า', 'ถอดแว่นและหน้ากากออก', 'ยิ่งหลายมุมยิ่งสแกนได้แม่นขึ้น'].map(t => (
                <p key={t} style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· {t}</p>
              ))}
            </div>
          </>
        )}

        {faceTab === 'upload' && (
          <>
            <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }} onClick={() => multiRef.current?.click()}
              style={{ borderRadius: 10, border: `2px dashed ${photoItems.length ? 'var(--fc-primary)' : 'var(--fc-border)'}`, background: 'var(--fc-muted)', padding: '24px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', minHeight: 100 }}>
              <IcUpload />
              <div style={{ fontSize: 13, color: 'var(--fc-text-3)', textAlign: 'center' }}>คลิกหรือลากรูปมาวางที่นี่ (เลือกได้หลายรูป)</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>JPG, PNG · ยิ่งหลายรูปยิ่งแม่นยำ</div>
              <input ref={multiRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addPhotos(e.target.files)} />
            </div>
            {photoItems.length > 0 && <PhotoGrid items={photoItems} onRemove={removePhoto} />}
            <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
              <p style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· ใส่รูปหลายมุม/แสงจะช่วยให้สแกนแม่นขึ้น</p>
              <p style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· รูปที่ไม่ผ่านจะถูกข้ามโดยอัตโนมัติ</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Import + Face tab (combined) ────────────────────────────────
function ImportTab() {
  // shared student pool — passed down to FacePanel
  const [students, setStudents]   = useState([])
  const [fetching, setFetching]   = useState(true)

  useEffect(() => {
    axios.get(`${API}/enroll/students`)
      .then(r => setStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [])

  const refreshStudents = () => {
    axios.get(`${API}/enroll/students`)
      .then(r => setStudents(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 400px) 1fr', gap: 20, alignItems: 'start' }}>
      <ExcelPanel onImported={refreshStudents} />
      <FacePanel students={students} fetching={fetching} onFaceSaved={(id) => {
        setStudents(prev => prev.map(s => s.student_id === id ? { ...s, has_face: true } : s))
      }} />
    </div>
  )
}

// ── Excel import panel ───────────────────────────────────────────
function ExcelPanel({ onImported }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')

  const isZip = file?.name.toLowerCase().endsWith('.zip')

  const pickFile = (f) => {
    if (!f) return
    const ok = f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.zip')
    if (!ok) { setError('รองรับเฉพาะไฟล์ .xlsx หรือ .zip เท่านั้น'); return }
    setFile(f); setResult(null); setError('')
  }

  const doImport = async () => {
    if (!file) return
    setLoading(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const endpoint = isZip ? `${API}/enroll/import-zip` : `${API}/enroll/import-excel`
      const res = await axios.post(endpoint, fd)
      setResult({ ...res.data, isZip }); setFile(null)
      onImported()
    } catch (e) {
      setError(e.response?.data?.detail || 'นำเข้าไม่สำเร็จ')
    } finally { setLoading(false) }
  }

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/enroll/template`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'student_template.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { await alert('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Step label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--fc-primary)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>นำเข้ารายชื่อจาก Excel</div>
          <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>เพิ่มรายชื่อนักเรียนเข้าระบบก่อน</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcTable />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text)' }}>รูปแบบไฟล์</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--fc-text-4)', textAlign: 'right', lineHeight: 1.5 }}>
            ZIP: ใส่ students.xlsx<br/>+ รูป {'{รหัส}'}.jpg ใน folder เดียวกัน
          </div>
          <button onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fc-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
            <IcDownload /> Template
          </button>
        </div>
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['รหัส *', 'คำนำหน้า', 'ชื่อ *', 'นามสกุล *', 'ชั้น', 'ห้อง'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', background: 'var(--fc-muted)', color: 'var(--fc-text-3)', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[['640805…', 'นาย', 'สมชาย', 'ใจดี', 'ม.5', '1']].map((row, i) => (
                <tr key={i}>
                  {row.map((v, j) => (
                    <td key={j} style={{ padding: '5px 8px', borderBottom: '1px solid var(--fc-border)', color: 'var(--fc-text-4)', fontSize: 11 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]) }} onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? 'var(--fc-primary)' : file ? 'var(--fc-success-dark)' : 'var(--fc-border)'}`, borderRadius: 10, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'var(--fc-primary-light)' : file ? 'var(--fc-success-light)' : 'var(--fc-muted)', transition: 'all 0.15s', marginBottom: 12 }}>
          <input ref={fileRef} type="file" accept=".xlsx,.zip" style={{ display: 'none' }} onChange={e => pickFile(e.target.files[0])} />
          {file ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-success-dark)' }}>{file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>{(file.size / 1024).toFixed(1)} KB — คลิกเพื่อเปลี่ยนไฟล์</div>
              {isZip && <div style={{ fontSize: 11, color: 'var(--fc-primary)', marginTop: 4, fontWeight: 600 }}>ZIP: จะ import รายชื่อ + ใบหน้าพร้อมกัน</div>}
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--fc-text-2)' }}>วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 3 }}>.xlsx — รายชื่ออย่างเดียว &nbsp;·&nbsp; .zip — รายชื่อ + รูปใบหน้า</div>
            </>
          )}
        </div>
        {error && <div className="toast toast-error" style={{ marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary btn-full" onClick={doImport} disabled={!file || loading}>
          {loading ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังนำเข้า...</> : <><IcUpload /> นำเข้าข้อมูล</>}
        </button>
      </div>

      {result && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 12 }}>ผลการนำเข้า</div>

          {/* รายชื่อ */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-text-3)', marginBottom: 6 }}>รายชื่อนักเรียน</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'เพิ่มสำเร็จ', value: result.created,   color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
              { label: 'ซ้ำ (ข้าม)', value: result.duplicates, color: 'var(--fc-warning)',      bg: 'var(--fc-warning-light)' },
              { label: 'ผิดพลาด',    value: result.errors,     color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)'  },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ใบหน้า (ZIP เท่านั้น) */}
          {result.isZip && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-text-3)', marginBottom: 6, marginTop: 4 }}>ใบหน้านักเรียน</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'บันทึกใบหน้าสำเร็จ', value: result.faces_ok,   color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
                  { label: 'บันทึกไม่สำเร็จ',    value: result.faces_fail, color: 'var(--fc-danger)',       bg: 'var(--fc-danger-light)'  },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {result.faces_fail_list?.length > 0 && (
                <details style={{ marginBottom: 8 }}>
                  <summary style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-danger)', cursor: 'pointer' }}>ใบหน้าที่บันทึกไม่ได้ ({result.faces_fail_list.length})</summary>
                  <div style={{ maxHeight: 100, overflowY: 'auto', fontSize: 11, color: 'var(--fc-text-3)', marginTop: 4 }}>
                    {result.faces_fail_list.map(f => <div key={f.student_id} style={{ padding: '2px 8px' }}>· {f.student_id}: {f.reason}</div>)}
                  </div>
                </details>
              )}
            </>
          )}

          {result.created > 0 && !result.isZip && (
            <div style={{ fontSize: 11, color: 'var(--fc-success-dark)', background: 'var(--fc-success-light)', borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
              เพิ่มรายชื่อสำเร็จ — ไปเพิ่มใบหน้าได้ที่แผงขวามือ →
            </div>
          )}
          {result.created_list?.length > 0 && (
            <details style={{ marginBottom: 6 }}>
              <summary style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-success-dark)', cursor: 'pointer' }}>ดูรายชื่อที่เพิ่ม ({result.created_list.length})</summary>
              <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 11, color: 'var(--fc-text-3)', marginTop: 4 }}>
                {result.created_list.map(s => <div key={s.student_id} style={{ padding: '2px 8px' }}>· {s.student_id} — {s.name}</div>)}
              </div>
            </details>
          )}
          {result.error_list?.length > 0 && (
            <details>
              <summary style={{ fontSize: 11, fontWeight: 600, color: 'var(--fc-danger)', cursor: 'pointer' }}>ข้อผิดพลาด ({result.error_list.length} แถว)</summary>
              <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: 11, color: 'var(--fc-text-3)', marginTop: 4 }}>
                {result.error_list.map(e => <div key={e.row} style={{ padding: '2px 8px' }}>· แถว {e.row}: {e.reason}</div>)}
              </div>
            </details>
          )}
          <button className="btn btn-ghost btn-full" style={{ marginTop: 10, fontSize: 12 }} onClick={() => setResult(null)}>นำเข้าไฟล์ใหม่</button>
        </div>
      )}
    </div>
  )
}

// ── Face enrollment panel (receives students from parent) ────────
function FacePanel({ students, fetching, onFaceSaved }) {
  const cam      = useRef(null)
  const multiRef = useRef(null)
  const [onlyNoFace, setOnlyNoFace] = useState(true)
  const [selGrade, setSelGrade]   = useState('')
  const [selRoom, setSelRoom]     = useState('')
  const [selStudent, setSelStudent] = useState(null)
  const [faceMode, setFaceMode]   = useState('camera')
  const [preview, setPreview]     = useState(null)
  const [photoItems, setPhotoItems] = useState([])
  const [state, setState]         = useState('idle')
  const [message, setMessage]     = useState('')

  const pool   = onlyNoFace ? students.filter(s => !s.has_face) : students
  const grades = [...new Set(pool.map(s => s.grade_level).filter(Boolean))].sort((a, b) => {
    const na = parseInt(String(a).replace(/\D/g, '')) || 0
    const nb = parseInt(String(b).replace(/\D/g, '')) || 0
    return na - nb
  })
  const rooms = [...new Set(
    pool.filter(s => !selGrade || s.grade_level === selGrade).map(s => s.room_number).filter(Boolean)
  )].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
  const studentsInFilter = pool.filter(s =>
    (!selGrade || s.grade_level === selGrade) &&
    (!selRoom  || s.room_number === selRoom)
  )

  const resetFace = () => { setPreview(null); setPhotoItems([]); setState('idle'); setMessage('') }
  const pickGrade   = (g) => { setSelGrade(g); setSelRoom(''); setSelStudent(null); resetFace() }
  const pickRoom    = (r) => { setSelRoom(r);  setSelStudent(null); resetFace() }
  const pickStudent = (s) => { setSelStudent(s); resetFace() }

  const validateOne = async (item) => {
    const fd = new FormData()
    fd.append('file', item.file, item.file.name)
    try {
      const res = await axios.post(`${API}/enroll/validate-photo`, fd)
      setPhotoItems(prev => prev.map(p => p.id === item.id ? { ...p, status: res.data.valid ? 'valid' : 'invalid', reason: res.data.reason } : p))
    } catch {
      setPhotoItems(prev => prev.map(p => p.id === item.id ? { ...p, status: 'invalid', reason: 'ตรวจสอบไม่ได้' } : p))
    }
  }

  const addPhotos = (files) => {
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(file => {
      const id   = `${Date.now()}-${Math.random()}`
      const item = { id, file, previewUrl: URL.createObjectURL(file), status: 'validating', reason: '' }
      setPhotoItems(prev => [...prev, item])
      validateOne(item)
    })
  }

  const removePhoto = (id) => {
    setPhotoItems(prev => { const f = prev.find(p => p.id === id); if (f) URL.revokeObjectURL(f.previewUrl); return prev.filter(p => p.id !== id) })
  }

  const submit = async () => {
    if (!selStudent) return
    setState('loading'); setMessage('')
    try {
      const fd = new FormData()
      if (faceMode === 'camera') {
        const img = preview || cam.current?.getScreenshot()
        if (!img) { setState('error'); setMessage('กรุณาถ่ายภาพก่อน'); return }
        const blob = await fetch(img).then(r => r.blob())
        fd.append('file', blob, `${selStudent.student_id}.jpg`)
        await axios.put(`${API}/enroll/update-face/${selStudent.student_id}`, fd)
      } else {
        const valid = photoItems.filter(p => p.status === 'valid')
        if (!valid.length) { setState('error'); setMessage('กรุณาอัปโหลดรูปที่ผ่านการตรวจสอบ'); return }
        valid.forEach(p => fd.append('files', p.file, p.file.name))
        await axios.put(`${API}/enroll/update-face-multi/${selStudent.student_id}`, fd)
      }
      const name = `${selStudent.title ? selStudent.title + ' ' : ''}${selStudent.first_name} ${selStudent.last_name}`
      setState('success')
      setMessage(`บันทึกใบหน้าของ ${name} สำเร็จ`)
      onFaceSaved?.(selStudent.student_id)
      setSelStudent(null); setPreview(null); setPhotoItems([])
    } catch (e) {
      setState('error'); setMessage(e.response?.data?.detail || 'บันทึกใบหน้าไม่สำเร็จ')
    }
  }

  const validCount = photoItems.filter(p => p.status === 'valid').length
  const canSubmit  = !!selStudent && state !== 'loading' && (faceMode === 'camera' ? !!preview : validCount > 0)
  const noFaceCount = students.filter(s => !s.has_face).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Step label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: students.length === 0 ? 'var(--fc-neutral)' : 'var(--fc-success)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: students.length === 0 ? 'var(--fc-text-3)' : 'var(--fc-text)' }}>เพิ่มใบหน้านักเรียน</div>
          <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>
            {students.length === 0 ? 'นำเข้ารายชื่อก่อน แล้วค่อยเพิ่มใบหน้า' : `${students.length} คนในระบบ · ${students.filter(s => !s.has_face).length} คนยังไม่มีใบหน้า`}
          </div>
        </div>
      </div>

      {/* Selector + face capture stacked vertically */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 16, alignItems: 'start' }}>

      {/* Left: student selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)', marginBottom: 14 }}>เลือกนักเรียน</div>

          {/* Toggle: only without face */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '10px 12px', background: 'var(--fc-muted)', borderRadius: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--fc-text-2)' }}>เฉพาะที่ยังไม่มีใบหน้า</div>
              {noFaceCount > 0 && (
                <div style={{ fontSize: 11, color: 'var(--fc-warning)', marginTop: 2 }}>{noFaceCount} คนรอเพิ่มใบหน้า</div>
              )}
            </div>
            <button
              onClick={() => { setOnlyNoFace(v => !v); setSelGrade(''); setSelRoom(''); setSelStudent(null) }}
              aria-label={onlyNoFace ? 'ปิดฟิลเตอร์' : 'เปิดฟิลเตอร์'}
              style={{ width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', background: onlyNoFace ? 'var(--fc-primary)' : 'var(--fc-neutral)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
            >
              <div style={{ position: 'absolute', top: 3, left: onlyNoFace ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
          </div>

          {fetching ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><div className="spinner" /></div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>
              ยังไม่มีนักเรียนในระบบ — นำเข้ารายชื่อจาก Excel ก่อน
            </div>
          ) : pool.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>
              นักเรียนทุกคนมีใบหน้าในระบบแล้ว 🎉
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ระดับชั้น</label>
                <select value={selGrade} onChange={e => pickGrade(e.target.value)}>
                  <option value="">-- ทุกระดับชั้น --</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ห้อง</label>
                <select value={selRoom} onChange={e => pickRoom(e.target.value)}>
                  <option value="">-- ทุกห้อง --</option>
                  {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  ชื่อนักเรียน
                  <span style={{ color: 'var(--fc-text-4)', fontWeight: 400, marginLeft: 4 }}>({studentsInFilter.length} คน)</span>
                </label>
                <select
                  value={selStudent?.student_id ?? ''}
                  onChange={e => pickStudent(studentsInFilter.find(s => s.student_id === e.target.value) ?? null)}
                >
                  <option value="">-- เลือกนักเรียน --</option>
                  {studentsInFilter.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.title ? s.title + ' ' : ''}{s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Selected student card */}
        {selStudent && (
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: selStudent.has_face ? 10 : 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: 'var(--fc-primary-light)', color: 'var(--fc-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                {selStudent.first_name?.[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fc-text)', lineHeight: 1.3 }}>
                  {selStudent.title ? selStudent.title + ' ' : ''}{selStudent.first_name} {selStudent.last_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fc-text-4)', marginTop: 2, fontFamily: 'var(--fc-font-mono)' }}>{selStudent.student_id}</div>
                {(selStudent.grade_level || selStudent.room_number) && (
                  <div style={{ fontSize: 11, color: 'var(--fc-text-3)', marginTop: 2 }}>
                    {selStudent.grade_level && `ชั้น ${selStudent.grade_level}`}
                    {selStudent.grade_level && selStudent.room_number && ' · '}
                    {selStudent.room_number && `ห้อง ${selStudent.room_number}`}
                  </div>
                )}
              </div>
            </div>
            {selStudent.has_face && (
              <div style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--fc-warning-light)', color: 'var(--fc-warning)', fontSize: 11, fontWeight: 600 }}>
                มีใบหน้าในระบบแล้ว — การบันทึกใหม่จะแทนที่ข้อมูลเดิม
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`toast ${state === 'success' ? 'toast-success' : 'toast-error'}`}>{message}</div>
        )}
      </div>

      {/* Right: face capture */}
      <div className="card" style={{ transition: 'opacity 0.2s', opacity: selStudent ? 1 : 0.45, pointerEvents: selStudent ? 'auto' : 'none' }}>
        {!selStudent ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10, color: 'var(--fc-text-4)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <div style={{ fontSize: 13 }}>เลือกนักเรียนก่อนเพื่อเพิ่มใบหน้า</div>
          </div>
        ) : (
          <>
            {/* Face mode toggle */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--fc-muted)', borderRadius: 8, padding: 4 }}>
              {[{ key: 'camera', label: 'กล้อง', icon: <IcCamera /> }, { key: 'upload', label: 'อัปโหลดรูปภาพ', icon: <IcUpload /> }].map(t => (
                <button key={t.key} onClick={() => { setFaceMode(t.key); resetFace() }} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  fontWeight: faceMode === t.key ? 600 : 400,
                  background: faceMode === t.key ? 'var(--fc-surface)' : 'transparent',
                  color: faceMode === t.key ? 'var(--fc-text)' : 'var(--fc-text-3)',
                  boxShadow: faceMode === t.key ? 'var(--fc-shadow-sm)' : 'none',
                  transition: 'all 0.15s',
                }}>{t.icon} {t.label}</button>
              ))}
            </div>

            {/* Camera */}
            {faceMode === 'camera' && (
              <>
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: 'var(--fc-muted)', aspectRatio: '4/3', marginBottom: 12 }}>
                  {preview
                    ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="preview" />
                    : <Webcam ref={cam} audio={false} screenshotFormat="image/jpeg" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  }
                  {preview && (
                    <button onClick={() => setPreview(null)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>ถ่ายใหม่</button>
                  )}
                </div>
                {!preview && (
                  <button className="btn btn-ghost btn-full" onClick={() => { const img = cam.current?.getScreenshot(); if (img) setPreview(img) }} style={{ marginBottom: 12 }}>
                    <IcCamera /> ถ่ายภาพ
                  </button>
                )}
                <div style={{ background: 'var(--fc-muted)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  {['มองตรงเข้าหากล้อง', 'แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า', 'ถอดแว่นและหน้ากากออก'].map(t => (
                    <p key={t} style={{ fontSize: 11, color: 'var(--fc-text-3)', lineHeight: 1.8, margin: 0 }}>· {t}</p>
                  ))}
                </div>
              </>
            )}

            {/* Upload */}
            {faceMode === 'upload' && (
              <>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); addPhotos(e.dataTransfer.files) }}
                  onClick={() => multiRef.current?.click()}
                  style={{ borderRadius: 10, border: `2px dashed ${photoItems.length ? 'var(--fc-primary)' : 'var(--fc-border)'}`, background: 'var(--fc-muted)', padding: '24px 16px', marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minHeight: 100 }}
                >
                  <IcUpload />
                  <div style={{ fontSize: 13, color: 'var(--fc-text-3)', textAlign: 'center' }}>คลิกหรือลากรูปมาวาง (เลือกได้หลายรูป)</div>
                  <div style={{ fontSize: 11, color: 'var(--fc-text-4)' }}>JPG, PNG · ยิ่งหลายรูปยิ่งแม่นยำ</div>
                  <input ref={multiRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addPhotos(e.target.files)} />
                </div>
                {photoItems.length > 0 && <PhotoGrid items={photoItems} onRemove={removePhoto} />}
              </>
            )}

            <button className="btn btn-primary btn-lg btn-full" onClick={submit} disabled={!canSubmit}>
              {state === 'loading'
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> กำลังบันทึก...</>
                : faceMode === 'upload' && validCount > 0 ? `บันทึกใบหน้า (${validCount} รูป)` : 'บันทึกใบหน้า'
              }
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────
export default function Enrollment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { dialog, alert } = useDialog()
  const [tab, setTab] = useState('single')

  if (user && user.role !== 'admin') {
    navigate('/', { replace: true })
    return null
  }

  return (
    <main id="main-content" className="page">
      {dialog}
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title">Enrollment</h1>
          <p className="page-sub">ลงทะเบียนนักเรียนและบันทึก Face Biometric</p>
        </div>

        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <button className={`tab-item ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>
            ลงทะเบียนทีละคน
          </button>
          <button className={`tab-item ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>
            นำเข้านักเรียน
          </button>
        </div>

        {tab === 'single' && <SingleTab />}
        {tab === 'import' && <ImportTab />}
      </div>
    </main>
  )
}
