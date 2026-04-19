import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const links = [
    { to: '/',         label: 'Dashboard' },
    { to: '/scan',     label: 'Scanner' },
    { to: '/enroll',   label: 'Enrollment' },
    { to: '/students', label: 'Students' },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header style={{
      height: 56, background: '#fff',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: 32,
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: '#1A56DB', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 11, fontWeight: 700,
        }}>FC</div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>FaceCheck</span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
        {links.map(({ to, label }) => {
          const active = pathname === to
          return (
            <Link key={to} to={to} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#1A56DB' : '#6B7280',
              background: active ? 'rgba(26,86,219,0.08)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.12s',
            }}>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: '#EEF2FF', color: '#1A56DB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
          }}>
            {user.full_name?.[0] ?? 'U'}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{user.full_name}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'capitalize' }}>{user.role}</div>
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