import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API = 'http://127.0.0.1:8000/api/v1'

function NavLink({ to, label, active }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '8px 13px', borderRadius: 6, fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--fc-primary)' : hov ? 'var(--fc-text)' : 'var(--fc-text-3)',
        background: active ? 'var(--fc-primary-light)' : hov ? 'rgba(0,0,0,0.04)' : 'transparent',
        textDecoration: 'none',
        transition: 'color 0.12s, background 0.12s',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--fc-primary)' }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {label}
    </Link>
  )
}

function ChangePwModal({ onClose }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async () => {
    if (!form.current || !form.next) { setMsg({ ok: false, text: 'กรุณากรอกให้ครบ' }); return }
    if (form.next !== form.confirm)  { setMsg({ ok: false, text: 'รหัสผ่านใหม่ไม่ตรงกัน' }); return }
    if (form.next.length < 6)        { setMsg({ ok: false, text: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }); return }
    setSaving(true); setMsg(null)
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: form.current,
        new_password: form.next,
      })
      setMsg({ ok: true, text: 'เปลี่ยนรหัสผ่านสำเร็จ' })
      setTimeout(onClose, 1200)
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.detail || 'เกิดข้อผิดพลาด' })
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>เปลี่ยนรหัสผ่าน</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16 }}>✕</button>
        </div>
        {[
          { key: 'current', label: 'รหัสผ่านปัจจุบัน' },
          { key: 'next',    label: 'รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)' },
          { key: 'confirm', label: 'ยืนยันรหัสผ่านใหม่' },
        ].map(f => (
          <div className="form-group" key={f.key}>
            <label className="form-label">{f.label}</label>
            <input
              type="password"
              value={form[f.key]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
        ))}
        {msg && (
          <div className={`toast ${msg.ok ? 'toast-success' : 'toast-error'}`} style={{ marginBottom: 14 }}>
            {msg.text}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-full" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showPwModal, setShowPwModal] = useState(false)
  const [offline, setOffline] = useState(false)

  // Offline detection via axios interceptor
  useEffect(() => {
    const id = axios.interceptors.response.use(
      res => { setOffline(false); return res },
      err => {
        if (!err.response) setOffline(true)
        return Promise.reject(err)
      }
    )
    return () => axios.interceptors.response.eject(id)
  }, [])

  const links = [
    { to: '/',         label: 'Dashboard' },
    { to: '/scan',     label: 'Scanner' },
    { to: '/students', label: 'Students' },
    { to: '/reports',  label: 'Reports' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      {offline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
          background: '#DC2626', color: '#fff',
          fontSize: 13, fontWeight: 600, textAlign: 'center',
          padding: '8px 16px',
        }}>
          เซิร์ฟเวอร์ไม่ตอบสนอง — ตรวจสอบการเชื่อมต่อ Backend
        </div>
      )}

      <header style={{
        height: 56, background: 'var(--fc-surface)',
        borderBottom: '1px solid var(--fc-border)',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(12px, 3vw, 32px)', gap: 'clamp(12px, 2vw, 32px)',
        position: 'sticky', top: offline ? 36 : 0, zIndex: 50,
        overflowX: 'auto',
      }}>
        <a href="#main-content" className="skip-link">ข้ามไปเนื้อหาหลัก</a>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--fc-primary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--fc-font-display)',
            letterSpacing: '0.02em',
          }}>FC</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--fc-text)' }}>FaceCheck</span>
        </div>

        {/* Nav */}
        <nav aria-label="เมนูหลัก" style={{ display: 'flex', gap: 2, flex: 1 }}>
          {links.map(({ to, label }) => (
            <NavLink key={to} to={to} label={label} active={pathname === to} />
          ))}
        </nav>

        {/* User */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--fc-primary-light)', color: 'var(--fc-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {user.full_name?.[0] ?? 'U'}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text)' }}>{user.full_name}</div>
              <div style={{ fontSize: 11, color: 'var(--fc-text-4)', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPwModal(true)}
              title="เปลี่ยนรหัสผ่าน"
              style={{ marginLeft: 2 }}
            >
              🔑
            </button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => { logout(); navigate('/login') }}
            >
              ออก
            </button>
          </div>
        )}
      </header>

      {showPwModal && <ChangePwModal onClose={() => setShowPwModal(false)} />}
    </>
  )
}
