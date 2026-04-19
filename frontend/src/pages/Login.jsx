import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!email || !password) return
    setError(''); setLoading(true)
    try { await login(email, password); navigate('/') }
    catch (e) { setError(e.response?.data?.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง') }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F4F6F9',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#1A56DB', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, marginBottom: 12,
          }}>FC</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>FaceCheck</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>ระบบตรวจสอบการเข้าเรียน</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>เข้าสู่ระบบ</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 22 }}>สำหรับครูและผู้ดูแลระบบ</p>

          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="teacher@school.ac.th"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button onClick={() => setShowPw(p => !p)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9CA3AF', fontSize: 14, lineHeight: 1, padding: 0,
              }}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>

          {error && (
            <div className="toast toast-error" style={{ marginBottom: 14 }}>{error}</div>
          )}

          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={submit}
            disabled={loading || !email || !password}
          >
            {loading
              ? <><span className="spinner" style={{ width:16,height:16,borderWidth:2 }} /> กำลังเข้าสู่ระบบ...</>
              : 'เข้าสู่ระบบ'
            }
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>
          ติดต่อผู้ดูแลระบบเพื่อขอบัญชีผู้ใช้
        </p>
      </div>
    </div>
  )
}