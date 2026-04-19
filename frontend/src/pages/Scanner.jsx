import { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import axios from 'axios'

const API = 'http://127.0.0.1:8000/api/v1'

const STATUS = {
  idle:    { label: 'พร้อมสแกน',          color: '#9CA3AF', bg: 'transparent' },
  loading: { label: 'กำลังประมวลผล...',   color: '#1A56DB', bg: 'rgba(26,86,219,0.06)' },
  success: { label: '',                    color: '#15803D', bg: 'rgba(22,163,74,0.08)' },
  warning: { label: '',                    color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
  error:   { label: '',                    color: '#DC2626', bg: 'rgba(220,38,38,0.08)' },
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
        setState('success'); setMessage(`✓  ${res.data.name}`)
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
    <div className="page-sm" style={{paddingTop:40}}>

      {/* Header */}
      <div style={{marginBottom:24}}>
        <h1 className="page-title">Face Scanner</h1>
        <p className="page-sub">สแกนใบหน้าเพื่อเช็คชื่อเข้าเรียน</p>
      </div>

      <div className="card">

        {/* Subject selector */}
        <div className="form-group" style={{marginBottom:20}}>
          <label className="form-label">เลือกรายวิชา</label>
          <select value={subjectId} onChange={e=>setSubjectId(e.target.value)}>
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
          background: '#F0F2F5', aspectRatio: '4/3',
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
              border: `2px dashed ${state==='loading' ? '#1A56DB' : 'rgba(255,255,255,0.5)'}`,
              transition: 'border-color 0.3s',
            }}/>
          </div>
          {state === 'loading' && (
            <div style={{
              position:'absolute', inset:0, background:'rgba(26,86,219,0.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <div className="spinner" style={{width:32,height:32,borderWidth:3}}/>
            </div>
          )}
        </div>

        {/* Status feedback */}
        {(message || state !== 'idle') && (
          <div style={{
            padding:'10px 14px', borderRadius:8, marginBottom:14,
            background: s.bg, color: s.color,
            fontSize: 13, fontWeight: 500, textAlign:'center',
            transition:'all 0.2s',
          }}>
            {message || s.label}
          </div>
        )}

        {/* Scan button */}
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={scan}
          disabled={state === 'loading' || !camReady || !subjectId}
        >
          {state === 'loading'
            ? <><span className="spinner" style={{width:16,height:16,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'#fff'}} /> ประมวลผล...</>
            : '📷  ถ่ายภาพและเช็คชื่อ'
          }
        </button>

        <p style={{fontSize:11,color:'#9CA3AF',textAlign:'center',marginTop:12}}>
          มองตรงเข้าหากล้อง · แสงสว่างเพียงพอ · ถอดหน้ากากและแว่น
        </p>
      </div>
    </div>
  )
}