import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API = 'http://127.0.0.1:8000/api/v1/enroll'

export default function Students() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [deleting, setDeleting] = useState(null)
  const [confirm, setConfirm]   = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/students`)
      setStudents(res.data)
      setError(null)
    } catch {
      setError('เชื่อมต่อ API ไม่ได้')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (studentId) => {
    setDeleting(studentId)
    try {
      await axios.delete(`${API}/students/${studentId}`)
      setStudents(prev => prev.filter(s => s.student_id !== studentId))
    } catch {
      alert('ลบไม่สำเร็จ')
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    return (
      s.student_id.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    )
  })

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="page-title">รายชื่อนักเรียน</div>
          <div className="page-sub">นักเรียนทั้งหมดในระบบ {students.length} คน</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={load}>
          รีเฟรช
        </button>
      </div>

      {/* Search */}
      <div style={{ maxWidth: 320, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="ค้นหารหัส / ชื่อ / นามสกุล…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {error ? (
        <div className="card" style={{ color: '#DC2626', textAlign: 'center', padding: '40px 0' }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#9CA3AF', padding: '48px 0' }}>
          {search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีนักเรียนในระบบ'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ</th>
                <th>นามสกุล</th>
                <th>ระดับชั้น</th>
                <th>ห้อง</th>
                <th>ใบหน้า</th>
                {user?.role === 'admin' && <th />}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.student_id}>
                  <td style={{ fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>
                    {s.student_id}
                  </td>
                  <td>{s.first_name}</td>
                  <td>{s.last_name}</td>
                  <td>{s.grade_level ?? '—'}</td>
                  <td>{s.room_number ?? '—'}</td>
                  <td>
                    {s.has_face
                      ? <span className="chip" style={{ background: 'rgba(22,163,74,0.1)', color: '#15803D' }}>มีแล้ว</span>
                      : <span className="chip" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>ยังไม่มี</span>
                    }
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={deleting === s.student_id}
                        onClick={() => setConfirm(s)}
                      >
                        {deleting === s.student_id ? '…' : 'ลบ'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">ยืนยันการลบ</div>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
              ลบ <strong>{confirm.first_name} {confirm.last_name}</strong> ({confirm.student_id}) ออกจากระบบ?
              <br />
              <span style={{ color: '#DC2626', fontSize: 12 }}>ข้อมูลและใบหน้าจะถูกลบถาวร</span>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                style={{ background: '#DC2626' }}
                disabled={deleting === confirm.student_id}
                onClick={() => handleDelete(confirm.student_id)}
              >
                {deleting === confirm.student_id ? 'กำลังลบ…' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
