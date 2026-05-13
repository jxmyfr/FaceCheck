import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Dashboard from './Dashboard'
import Scanner from './Scanner'
import Enrollment from './Enrollment'
import Login from './Login'
import Admin from './Admin'
import Students from './Students'
import StudentDetail from './StudentDetail'
import Reports from './Reports'
import QRCheckin from './QRCheckin'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fc-bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/enroll" element={<ProtectedRoute><Enrollment /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="/students/:studentId" element={<ProtectedRoute><StudentDetail /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/checkin" element={<QRCheckin />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
    </AuthProvider>
  )
}