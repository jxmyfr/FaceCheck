import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const IcEye = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IcEyeOff = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

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
      minHeight: '100vh', background: 'var(--fc-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--fc-primary)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, marginBottom: 12,
          }}>FC</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fc-text)' }}>FaceCheck</div>
          <div style={{ fontSize: 13, color: 'var(--fc-text-4)', marginTop: 4 }}>ระบบตรวจสอบการเข้าเรียน</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fc-text)', marginBottom: 4 }}>เข้าสู่ระบบ</h1>
          <p style={{ fontSize: 13, color: 'var(--fc-text-3)', marginBottom: 22 }}>สำหรับครูและผู้ดูแลระบบ</p>

          <div className="form-group">
            <label htmlFor="login-email" className="form-label">อีเมล</label>
            <input
              id="login-email"
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="teacher@school.ac.th"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">รหัสผ่าน</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="••••••••"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                aria-label={showPw ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--fc-text-4)', lineHeight: 1, padding: 4,
                  display: 'flex', alignItems: 'center', borderRadius: 4,
                }}
              >{showPw ? <IcEyeOff /> : <IcEye />}</button>
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

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--fc-text-4)', marginTop: 16 }}>
          ติดต่อผู้ดูแลระบบเพื่อขอบัญชีผู้ใช้
        </p>
      </div>
    </div>
  )
}