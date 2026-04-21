import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const links = [
    { to: '/',         label: 'Dashboard' },
    { to: '/scan',     label: 'Scanner' },
    { to: '/students', label: 'Students' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header style={{
      height: 56, background: 'var(--fc-surface)',
      borderBottom: '1px solid var(--fc-border)',
      display: 'flex', alignItems: 'center',
      padding: '0 clamp(12px, 3vw, 32px)', gap: 'clamp(12px, 2vw, 32px)',
      position: 'sticky', top: 0, zIndex: 50,
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
          <button className="btn btn-ghost btn-sm"
            onClick={() => { logout(); navigate('/login') }}
            style={{ marginLeft: 4 }}
          >
            ออก
          </button>
        </div>
      )}
    </header>
  )
}