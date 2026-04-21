import { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

const IcCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)

const API = 'http://127.0.0.1:8000/api/v1'

export default function Enrollment() {
  const cam = useRef(null)
  const [form, setForm] = useState({student_id:'',first_name:'',last_name:'',grade_level:'',room_number:''})
  const [state, setState]   = useState('idle') // idle | loading | success | error
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(null)

  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const capture = () => {
    const img = cam.current?.getScreenshot()
    if (img) setPreview(img)
  }

  const submit = async () => {
    if (!form.student_id || !form.first_name || !form.last_name) {
      setState('error'); setMessage('กรุณากรอกรหัสนักเรียน ชื่อ และนามสกุล'); return
    }
    const img = preview || cam.current?.getScreenshot()
    if (!img) { setState('error'); setMessage('กรุณาถ่ายภาพก่อน'); return }

    setState('loading'); setMessage('')
    try {
      const blob = await fetch(img).then(r=>r.blob())
      const fd   = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k, v))
      fd.append('file', blob, `${form.student_id}.jpg`)
      const res = await axios.post(`${API}/enroll/register`, fd)
      setState('success'); setMessage(res.data.message)
      setForm({student_id:'',first_name:'',last_name:'',grade_level:'',room_number:''})
      setPreview(null)
    } catch (e) {
      setState('error'); setMessage(e.response?.data?.detail || 'ลงทะเบียนไม่สำเร็จ')
    }
  }

  return (
    <main id="main-content" className="page" style={{maxWidth:860}}>
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Enrollment</h1>
        <p className="page-sub">ลงทะเบียนนักเรียนและบันทึก Face Biometric</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:20}}>

        {/* Form */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:'var(--fc-text)',marginBottom:18}}>ข้อมูลนักเรียน</div>

          <div className="form-group">
            <label htmlFor="enroll-student-id" className="form-label">รหัสนักเรียน *</label>
            <input id="enroll-student-id" placeholder="6408052218" value={form.student_id} onChange={e=>set('student_id',e.target.value)} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="form-group">
              <label htmlFor="enroll-first-name" className="form-label">ชื่อ *</label>
              <input id="enroll-first-name" placeholder="สมชาย" value={form.first_name} onChange={e=>set('first_name',e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="enroll-last-name" className="form-label">นามสกุล *</label>
              <input id="enroll-last-name" placeholder="ใจดี" value={form.last_name} onChange={e=>set('last_name',e.target.value)} />
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div className="form-group">
              <label htmlFor="enroll-grade" className="form-label">ระดับชั้น</label>
              <input id="enroll-grade" placeholder="ม.5" value={form.grade_level} onChange={e=>set('grade_level',e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="enroll-room" className="form-label">ห้อง</label>
              <input id="enroll-room" placeholder="1" value={form.room_number} onChange={e=>set('room_number',e.target.value)} />
            </div>
          </div>

          {message && (
            <div className={`toast ${state==='success'?'toast-success':'toast-error'}`} style={{marginBottom:14}}>{message}</div>
          )}

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={submit}
            disabled={state==='loading'}
          >
            {state==='loading'
              ? <><span className="spinner" style={{width:16,height:16,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}}/> กำลังประมวลผล...</>
              : 'ลงทะเบียน'
            }
          </button>
        </div>

        {/* Camera */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:'var(--fc-text)',marginBottom:16}}>ถ่ายภาพใบหน้า</div>

          <div style={{position:'relative',borderRadius:10,overflow:'hidden',background:'var(--fc-muted)',aspectRatio:'4/3',marginBottom:12}}>
            {preview
              ? <img src={preview} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} alt="preview"/>
              : <Webcam ref={cam} audio={false} screenshotFormat="image/jpeg" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}/>
            }
            {preview && (
              <button onClick={()=>setPreview(null)} style={{
                position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.5)',color:'#fff',
                border:'none',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer',
              }}>ถ่ายใหม่</button>
            )}
          </div>

          {!preview && (
            <button className="btn btn-ghost btn-full" onClick={capture} style={{marginBottom:12}}>
              <IcCamera /> ถ่ายภาพ
            </button>
          )}

          <div style={{background:'var(--fc-muted)',borderRadius:8,padding:'12px 14px'}}>
            <p style={{fontSize:12,fontWeight:600,color:'var(--fc-text-2)',marginBottom:6}}>คำแนะนำ</p>
            {['มองตรงเข้าหากล้อง','แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า','ถอดแว่นและหน้ากากออก','ใบหน้าอยู่กึ่งกลางภาพ'].map(t=>(
              <p key={t} style={{fontSize:12,color:'var(--fc-text-3)',lineHeight:1.8}}>· {t}</p>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}