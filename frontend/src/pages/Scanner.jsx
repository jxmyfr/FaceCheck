import { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

const IcCamera = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const API = 'http://127.0.0.1:8000/api/v1'

const STATUS = {
  idle:    { label: 'พร้อมสแกน',        color: 'var(--fc-text-4)',   bg: 'transparent' },
  loading: { label: 'กำลังประมวลผล...', color: 'var(--fc-primary)',  bg: 'var(--fc-primary-light)' },
  success: { label: '',                  color: 'var(--fc-success-dark)', bg: 'var(--fc-success-light)' },
  warning: { label: '',                  color: 'var(--fc-warning)',  bg: 'var(--fc-warning-light)' },
  error:   { label: '',                  color: 'var(--fc-danger)',   bg: 'var(--fc-danger-light)' },
}

export default function Scanner() {
  const cam = useRef(null)
  const [subjects, setSubjects]   = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [state, setState]         = useState('idle')
  const [message, setMessage]     = useState('')
  const [camReady, setCamReady]   = useState(false)

  useEffect(() => {
    axios.get(`${API}/attendance/subjects`).then(r => {
      setSubjects(r.data)
      if (r.data.length) setSubjectId(String(r.data[0].id))
    }).catch(()=>{})
  }, [])

  const scan = async () => {
    if (!subjectId) { setState('error'); setMessage('กรุณาเลือกรายวิชาก่อน'); return }
    const img = cam.current?.getScreenshot()
    if (!img) { setState('error'); setMessage('กล้องไม่พร้อม'); return }

    setState('loading'); setMessage('')
    try {
      const blob = await fetch(img).then(r=>r.blob())
      const fd   = new FormData(); fd.append('file', blob, 'scan.jpg')
      const res  = await axios.post(`${API}/attendance/scan?subject_id=${subjectId}`, fd)
      if (res.data.status === 'success') {
        setState('success'); setMessage(res.data.name)
      } else {
        setState('warning'); setMessage(res.data.message)
      }
      setTimeout(() => { setState('idle'); setMessage('') }, 4000)
    } catch (e) {
      setState('error'); setMessage(e.response?.data?.detail || 'ระบุตัวตนไม่สำเร็จ')
      setTimeout(() => { setState('idle'); setMessage('') }, 4000)
    }
  }

  const s = STATUS[state]

  return (
    <main id="main-content" className="page-sm" style={{paddingTop:40}}>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Face Scanner</h1>
        <p className="page-sub">สแกนใบหน้าเพื่อเช็คชื่อเข้าเรียน</p>
      </div>

      <div className="card">

        {/* Subject selector */}
        <div className="form-group" style={{marginBottom:20}}>
          <label htmlFor="scanner-subject" className="form-label">เลือกรายวิชา</label>
          <select id="scanner-subject" value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
            {subjects.length === 0
              ? <option value="">ไม่มีรายวิชา — ติดต่อ Admin</option>
              : subjects.map(s=>(
                  <option key={s.id} value={s.id}>{s.subject_code}  {s.subject_name}</option>
                ))
            }
          </select>
        </div>

        {/* Camera */}
        <div style={{
          position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: 'var(--fc-muted)', aspectRatio: '4/3',
          marginBottom: 16,
        }}>
          <Webcam
            ref={cam} audio={false}
            screenshotFormat="image/jpeg"
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onUserMedia={() => setCamReady(true)}
          />
          {/* face guide overlay */}
          <div style={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            pointerEvents:'none',
          }}>
            <div style={{
              width: 180, height: 220, borderRadius: '50%',
              border: `2px dashed ${state==='loading' ? 'var(--fc-primary)' : 'rgba(255,255,255,0.5)'}`,
              transition: 'border-color 0.3s',
            }}/>
          </div>
          {state === 'loading' && (
            <div style={{
              position:'absolute', inset:0, background:'var(--fc-primary-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div className="spinner" style={{width:32,height:32,borderWidth:3}}/>
            </div>
          )}
        </div>

        {/* Status feedback */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            padding:'10px 14px', borderRadius:8, marginBottom:14,
            background: s.bg, color: s.color,
            fontSize: 13, fontWeight: 500, textAlign:'center',
            transition: 'background 0.2s, color 0.2s',
            minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {(message || state !== 'idle') ? (message || s.label) : ''}
        </div>

        {/* Scan button */}
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={scan}
          disabled={state === 'loading' || !camReady || !subjectId}
        >
          {state === 'loading'
            ? <><span className="spinner" style={{width:16,height:16,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> ประมวลผล...</>
            : <><IcCamera /> ถ่ายภาพและเช็คชื่อ</>
          }
        </button>

        <p style={{fontSize:11,color:'var(--fc-text-4)',textAlign:'center',marginTop:12}}>
          มองตรงเข้าหากล้อง · แสงสว่างเพียงพอ · ถอดหน้ากากและแว่น
        </p>
      </div>
    </main>
  )
}