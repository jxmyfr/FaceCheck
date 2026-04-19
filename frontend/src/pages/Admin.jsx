import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const API = 'http://127.0.0.1:8000/api/v1'

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 className="modal-title" style={{margin:0}}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{fontSize:16}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers]         = useState([])
  const [subjects, setSubjects]   = useState([])
  const [tab, setTab]             = useState('users')
  const [loading, setLoading]     = useState(true)
  const [toast, setToast]         = useState(null)

  const [semester, setSemester]     = useState({ name: '', term_start: '', term_end: '' })
  const [semSaving, setSemSaving]   = useState(false)

  const [showUser, setShowUser]     = useState(false)
  const [newUser, setNewUser]       = useState({email:'',password:'',full_name:'',role:'teacher'})
  const [showSubject, setShowSubject] = useState(false)
  const [newSub, setNewSub]         = useState({subject_code:'',subject_name:''})
  const [assignModal, setAssignModal] = useState(null)
  const [teacherSubs, setTeacherSubs] = useState([])
  const [assignId, setAssignId]     = useState('')

  const flash = (text, type='success') => {
    setToast({text,type})
    setTimeout(()=>setToast(null), 3000)
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [u, s, sem] = await Promise.all([
        axios.get(`${API}/auth/users`).then(r=>r.data),
        axios.get(`${API}/attendance/subjects`).then(r=>r.data),
        axios.get(`${API}/settings/semester`).then(r=>r.data).catch(()=>null),
      ])
      setUsers(u); setSubjects(s)
      if (sem) setSemester({ name: sem.name||'', term_start: sem.term_start||'', term_end: sem.term_end||'' })
    } finally { setLoading(false) }
  }

  const saveSemester = async () => {
    setSemSaving(true)
    try {
      await axios.put(`${API}/settings/semester`, {
        name:       semester.name       || undefined,
        term_start: semester.term_start || undefined,
        term_end:   semester.term_end   || undefined,
      })
      flash('บันทึกข้อมูลภาคเรียนสำเร็จ')
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
    finally { setSemSaving(false) }
  }

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return }
    loadAll()
  }, [])

  const createUser = async () => {
    try {
      await axios.post(`${API}/auth/register`, newUser)
      flash('สร้างบัญชีสำเร็จ')
      setShowUser(false)
      setNewUser({email:'',password:'',full_name:'',role:'teacher'})
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const toggleUser = async (id) => {
    await axios.patch(`${API}/auth/users/${id}/toggle`)
    loadAll()
  }

  const openAssign = async (teacher) => {
    try {
      const res = await axios.get(`${API}/auth/users/${teacher.id}/subjects`)
      setTeacherSubs(res.data.map(s=>s.id))
    } catch { setTeacherSubs([]) }
    const avail = subjects.filter(s => !teacherSubs.includes(s.id))
    setAssignId(avail[0]?.id ? String(avail[0].id) : '')
    setAssignModal(teacher)
  }

  const assign = async () => {
    try {
      await axios.post(`${API}/auth/users/${assignModal.id}/assign-subject/${assignId}`)
      flash('มอบหมายวิชาสำเร็จ')
      setTeacherSubs(p=>[...p,Number(assignId)])
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const unassign = async (subId) => {
    await axios.delete(`${API}/auth/users/${assignModal.id}/assign-subject/${subId}`)
    setTeacherSubs(p=>p.filter(x=>x!==subId))
    flash('ถอนวิชาสำเร็จ')
  }

  const createSub = async () => {
    try {
      await axios.post(`${API}/attendance/subjects?subject_code=${newSub.subject_code}&subject_name=${encodeURIComponent(newSub.subject_name)}`)
      flash('เพิ่มวิชาสำเร็จ')
      setShowSubject(false)
      setNewSub({subject_code:'',subject_name:''})
      loadAll()
    } catch (e) { flash(e.response?.data?.detail||'เกิดข้อผิดพลาด','error') }
  }

  const deleteSub = async (id) => {
    if (!confirm('ลบวิชาจะลบประวัติเช็คชื่อที่เกี่ยวข้องด้วย ยืนยัน?')) return
    await axios.delete(`${API}/attendance/subjects/${id}`)
    flash('ลบวิชาสำเร็จ'); loadAll()
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:320,flexDirection:'column',gap:12}}>
      <div className="spinner"/>
      <p style={{fontSize:13,color:'#9CA3AF'}}>กำลังโหลด...</p>
    </div>
  )

  const availSubs = subjects.filter(s => !teacherSubs.includes(s.id))

  return (
    <div className="page">

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-sub">จัดการบัญชีครูและรายวิชา</p>
        </div>
        {toast && (
          <div className={`toast ${toast.type==='success'?'toast-success':'toast-error'}`}>{toast.text}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{maxWidth:440,marginBottom:20}}>
        <button className={`tab-item ${tab==='users'?'active':''}`} onClick={()=>setTab('users')}>
          ครูและผู้ดูแล ({users.length})
        </button>
        <button className={`tab-item ${tab==='subjects'?'active':''}`} onClick={()=>setTab('subjects')}>
          รายวิชา ({subjects.length})
        </button>
        <button className={`tab-item ${tab==='semester'?'active':''}`} onClick={()=>setTab('semester')}>
          ภาคเรียน
        </button>
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
            <span style={{fontSize:14,fontWeight:600,color:'#111827'}}>บัญชีผู้ใช้ทั้งหมด</span>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowUser(true)}>+ เพิ่มบัญชี</button>
          </div>
          <table className="tbl">
            <thead><tr>
              <th>ชื่อ</th><th>Email</th><th>Role</th><th>สถานะ</th><th>การจัดการ</th>
            </tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:30,height:30,borderRadius:'50%',background:'#EEF2FF',color:'#1A56DB',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>
                        {u.full_name?.[0]}
                      </div>
                      <span style={{fontWeight:500,color:'#111827'}}>{u.full_name}</span>
                    </div>
                  </td>
                  <td style={{color:'#6B7280'}}>{u.email}</td>
                  <td>
                    <span className="chip" style={u.role==='admin'
                      ? {background:'rgba(124,58,237,0.1)',color:'#7C3AED'}
                      : {background:'rgba(26,86,219,0.1)',color:'#1A56DB'}
                    }>{u.role}</span>
                  </td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span className={u.is_active?'dot-on':'dot-off'}/>
                      <span style={{fontSize:12,color:'#6B7280'}}>{u.is_active?'ใช้งาน':'ระงับ'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      {u.role==='teacher' && (
                        <button className="btn btn-ghost btn-sm" onClick={()=>openAssign(u)}>มอบหมายวิชา</button>
                      )}
                      <button
                        className={`btn btn-sm ${u.is_active?'btn-danger':'btn-ghost'}`}
                        onClick={()=>toggleUser(u.id)}
                      >
                        {u.is_active?'ระงับ':'เปิดใช้'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subjects tab */}
      {tab === 'subjects' && (
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px'}}>
            <span style={{fontSize:14,fontWeight:600,color:'#111827'}}>รายวิชาทั้งหมด</span>
            <button className="btn btn-primary btn-sm" onClick={()=>setShowSubject(true)}>+ เพิ่มวิชา</button>
          </div>
          <table className="tbl">
            <thead><tr><th>รหัสวิชา</th><th>ชื่อวิชา</th><th></th></tr></thead>
            <tbody>
              {subjects.map(s=>(
                <tr key={s.id}>
                  <td><span style={{fontFamily:'monospace',fontSize:12,background:'#F0F2F5',padding:'2px 8px',borderRadius:4}}>{s.subject_code}</span></td>
                  <td style={{fontWeight:500,color:'#111827'}}>{s.subject_name}</td>
                  <td><button className="btn btn-danger btn-sm" onClick={()=>deleteSub(s.id)}>ลบ</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Semester tab */}
      {tab === 'semester' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {/* Settings form */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 20 }}>ตั้งค่าภาคเรียน</div>
            <div className="form-group">
              <label className="form-label">ชื่อภาคเรียน</label>
              <input
                placeholder="เช่น ภาคเรียนที่ 1/2568"
                value={semester.name}
                onChange={e => setSemester(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">วันเปิดเทอม</label>
              <input
                type="date"
                value={semester.term_start}
                onChange={e => setSemester(p => ({ ...p, term_start: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">วันปิดเทอม</label>
              <input
                type="date"
                value={semester.term_end}
                onChange={e => setSemester(p => ({ ...p, term_end: e.target.value }))}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 8, minWidth: 100 }}
              disabled={semSaving}
              onClick={saveSemester}
            >
              {semSaving ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>

          {/* Info card */}
          <div className="card" style={{ padding: '24px 28px', background: '#F8FAFF', border: '1px solid rgba(26,86,219,0.1)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1A56DB', marginBottom: 12 }}>วิธีการนับสถิติการเข้าเรียน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: '1', text: 'เริ่มนับตั้งแต่วันแรกที่นักเรียนเช็คชื่อในระบบ' },
                { n: '2', text: 'ทุกวันตั้งแต่วันนั้นถึงวันปัจจุบันนับเป็น 1 วัน' },
                { n: '3', text: 'หากวันใดมีการเช็คชื่อ = ถือว่ามาเรียน' },
                { n: '4', text: 'อัตรา = (วันที่มา ÷ วันทั้งหมด) × 100%' },
              ].map(item => (
                <div key={item.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#1A56DB',
                    color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{item.n}</div>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
            <div className="divider" style={{ margin: '16px 0' }} />
            <div style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
              ข้อมูลภาคเรียนจะถูกใช้ใน Dashboard หลักเพื่อแสดงกราฟ<br/>อัตราการเข้าเรียนตลอดภาคเรียน
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create user */}
      {showUser && (
        <Modal title="เพิ่มบัญชีใหม่" onClose={()=>setShowUser(false)}>
          {[
            {key:'full_name',label:'ชื่อ-นามสกุล',type:'text',ph:'สมชาย ใจดี'},
            {key:'email',label:'Email',type:'email',ph:'teacher@school.ac.th'},
            {key:'password',label:'Password',type:'password',ph:'••••••••'},
          ].map(f=>(
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input type={f.type} placeholder={f.ph}
                value={newUser[f.key]}
                onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
              />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Role</label>
            <select value={newUser.role} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button className="btn btn-ghost btn-full" onClick={()=>setShowUser(false)}>ยกเลิก</button>
            <button className="btn btn-primary btn-full" onClick={createUser}>สร้างบัญชี</button>
          </div>
        </Modal>
      )}

      {/* Modal: Assign subject */}
      {assignModal && (
        <Modal title={`มอบหมายวิชา — ${assignModal.full_name}`} onClose={()=>setAssignModal(null)}>
          {teacherSubs.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:'#6B7280',marginBottom:8}}>วิชาที่รับผิดชอบอยู่</div>
              {subjects.filter(s=>teacherSubs.includes(s.id)).map(s=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',background:'#F0F2F5',borderRadius:8,marginBottom:6}}>
                  <span style={{fontSize:13,color:'#374151'}}>{s.subject_code} — {s.subject_name}</span>
                  <button className="btn btn-danger btn-sm" onClick={()=>unassign(s.id)}>ถอน</button>
                </div>
              ))}
              <div className="divider"/>
            </div>
          )}
          {availSubs.length > 0
            ? <>
                <div className="form-group">
                  <label className="form-label">เพิ่มวิชา</label>
                  <select value={assignId} onChange={e=>setAssignId(e.target.value)}>
                    {availSubs.map(s=><option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <button className="btn btn-ghost btn-full" onClick={()=>setAssignModal(null)}>ปิด</button>
                  <button className="btn btn-primary btn-full" onClick={assign}>มอบหมาย</button>
                </div>
              </>
            : <div style={{textAlign:'center',padding:'8px 0'}}>
                <p style={{fontSize:13,color:'#9CA3AF',marginBottom:12}}>ได้รับมอบหมายวิชาครบแล้ว</p>
                <button className="btn btn-ghost btn-full" onClick={()=>setAssignModal(null)}>ปิด</button>
              </div>
          }
        </Modal>
      )}

      {/* Modal: Create subject */}
      {showSubject && (
        <Modal title="เพิ่มรายวิชา" onClose={()=>setShowSubject(false)}>
          {[
            {key:'subject_code',label:'รหัสวิชา',ph:'CS101'},
            {key:'subject_name',label:'ชื่อวิชา',ph:'Introduction to Computer Science'},
          ].map(f=>(
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              <input placeholder={f.ph}
                value={newSub[f.key]}
                onChange={e=>setNewSub(s=>({...s,[f.key]:e.target.value}))}
              />
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:4}}>
            <button className="btn btn-ghost btn-full" onClick={()=>setShowSubject(false)}>ยกเลิก</button>
            <button className="btn btn-primary btn-full" onClick={createSub}>เพิ่มวิชา</button>
          </div>
        </Modal>
      )}
    </div>
  )
}