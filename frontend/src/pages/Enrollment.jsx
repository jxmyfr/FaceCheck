import { useState, useRef } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

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
    <div className="page" style={{maxWidth:860}}>
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Enrollment</h1>
        <p className="page-sub">ลงทะเบียนนักเรียนและบันทึก Face Biometric</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>

        {/* Form */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:'#111827',marginBottom:18}}>ข้อมูลนักเรียน</div>

          {[
            {key:'student_id', label:'รหัสนักเรียน *',  ph:'6408052218', half:false},
            {key:'first_name', label:'ชื่อ *',           ph:'สมชาย',       half:true},
            {key:'last_name',  label:'นามสกุล *',        ph:'ใจดี',        half:true},
            {key:'grade_level',label:'ระดับชั้น',         ph:'ม.5',         half:true},
            {key:'room_number',label:'ห้อง',              ph:'1',           half:true},
          ].reduce((acc, f, i, arr) => {
            if (!f.half) {
              acc.push(
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input placeholder={f.ph} value={form[f.key]} onChange={e=>set(f.key,e.target.value)} />
                </div>
              )
            } else {
              const next = arr[i+1]
              if (next?.half && i % 2 === (arr.findIndex(x=>x.half)) % 2) {
                acc.push(
                  <div key={f.key+next?.key} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div className="form-group">
                      <label className="form-label">{f.label}</label>
                      <input placeholder={f.ph} value={form[f.key]} onChange={e=>set(f.key,e.target.value)} />
                    </div>
                    {next && <div className="form-group">
                      <label className="form-label">{next.label}</label>
                      <input placeholder={next.ph} value={form[next.key]} onChange={e=>set(next.key,e.target.value)} />
                    </div>}
                  </div>
                )
              }
            }
            return acc
          }, [])}

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
              : '✓  ลงทะเบียน'
            }
          </button>
        </div>

        {/* Camera */}
        <div className="card">
          <div style={{fontSize:14,fontWeight:600,color:'#111827',marginBottom:16}}>ถ่ายภาพใบหน้า</div>

          <div style={{position:'relative',borderRadius:10,overflow:'hidden',background:'#F0F2F5',aspectRatio:'4/3',marginBottom:12}}>
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
              📷  ถ่ายภาพ
            </button>
          )}

          <div style={{background:'#F0F2F5',borderRadius:8,padding:'12px 14px'}}>
            <p style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>คำแนะนำ</p>
            {['มองตรงเข้าหากล้อง','แสงสว่างเพียงพอ ไม่มีเงาบนใบหน้า','ถอดแว่นและหน้ากากออก','ใบหน้าอยู่กึ่งกลางภาพ'].map(t=>(
              <p key={t} style={{fontSize:12,color:'#6B7280',lineHeight:1.8}}>· {t}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}