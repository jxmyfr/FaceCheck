import { useState, useEffect } from 'react'
import axios from 'axios'
import { useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL

export default function QRCheckin() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [studentId, setStudentId] = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)  // { status, message, student_name, subject_name, scan_status }
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!token) setError('ไม่พบ QR Token — กรุณาสแกน QR Code ใหม่')
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!studentId.trim() || !token) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await axios.post(
        `${API}/attendance/qr-checkin?token=${encodeURIComponent(token)}&student_id=${encodeURIComponent(studentId.trim())}`
      )
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'เช็คชื่อไม่สำเร็จ กรุณาลองใหม่')
    } finally { setLoading(false) }
  }

  const STATUS_CFG = {
    success:         { label: 'เช็คชื่อสำเร็จ',  color: '#16A34A', bg: '#F0FDF4' },
    late:            { label: 'มาสาย',            color: '#D97706', bg: '#FFFBEB' },
    already_checked: { label: 'เช็คชื่อแล้ว',    color: '#D97706', bg: '#FFFBEB' },
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: '#fff', borderRadius: 18,
        boxShadow: '0 4px 32px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 28px 0', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#EFF6FF', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>เช็คชื่อเข้าเรียน</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 0 }}>
            กรอกรหัสนักเรียนเพื่อบันทึกการเข้าเรียน
          </p>
        </div>

        <div style={{ padding: 28 }}>
          {!token ? (
            <div style={{ textAlign: 'center', color: '#DC2626', fontSize: 14, padding: '20px 0' }}>
              QR Code ไม่ถูกต้องหรือหมดอายุ
            </div>
          ) : result ? (
            /* Success / already checked */
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                background: result.status === 'success' ? '#F0FDF4' : '#FFFBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {result.status === 'success' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                {result.message}
              </div>
              <div style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                {result.student_name}
              </div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>
                {result.subject_name}
              </div>
              {result.scan_status === 'late' && (
                <div style={{ marginTop: 12, padding: '8px 16px', borderRadius: 8, background: '#FFFBEB', fontSize: 13, color: '#D97706', fontWeight: 600 }}>
                  บันทึกสถานะ "มาสาย"
                </div>
              )}
              <button
                onClick={() => { setResult(null); setStudentId('') }}
                style={{
                  marginTop: 24, width: '100%', padding: '12px',
                  borderRadius: 10, border: '1px solid #E5E7EB',
                  background: '#F9FAFB', fontSize: 14, color: '#374151',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                เช็คชื่อคนต่อไป
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 8,
                }}>
                  รหัสนักเรียน
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="เช่น 6408052201"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', padding: '12px 14px',
                    borderRadius: 10, border: '1.5px solid #D1D5DB',
                    fontSize: 16, color: '#111827', outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1A56DB'}
                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                />
              </div>

              {error && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px',
                  borderRadius: 8, background: '#FEF2F2',
                  fontSize: 13, color: '#DC2626',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!studentId.trim() || loading}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 10, border: 'none',
                  background: (!studentId.trim() || loading) ? '#93C5FD' : '#1A56DB',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: (!studentId.trim() || loading) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    กำลังบันทึก...
                  </>
                ) : 'เช็คชื่อเข้าเรียน'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
