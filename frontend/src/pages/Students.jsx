import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API = 'http://127.0.0.1:8000/api/v1/enroll'

export default function Students() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterRoom, setFilterRoom]   = useState('')
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

  const grades = [...new Set(students.map(s => s.grade_level).filter(Boolean))].sort()
  const rooms  = [...new Set(
    students
      .filter(s => !filterGrade || s.grade_level === filterGrade)
      .map(s => s.room_number)
      .filter(Boolean)
  )].sort((a, b) => Number(a) - Number(b))

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      s.student_id.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    )
    const matchGrade = !filterGrade || s.grade_level === filterGrade
    const matchRoom  = !filterRoom  || s.room_number  === filterRoom
    return matchSearch && matchGrade && matchRoom
  })

  return (
    <main id="main-content" className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">รายชื่อนักเรียน</h1>
          <p className="page-sub">นักเรียนทั้งหมดในระบบ {students.length} คน</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>รีเฟรช</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/enroll')}>+ ลงทะเบียนนักเรียน</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', maxWidth: 320 }}>
          <label htmlFor="students-search" className="sr-only">ค้นหานักเรียน</label>
          <input
            id="students-search"
            type="search"
            placeholder="ค้นหารหัส / ชื่อ / นามสกุล…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="ค้นหานักเรียน"
          />
        </div>
        <div style={{ flex: '0 0 140px' }}>
          <label htmlFor="students-grade" className="sr-only">กรองตามชั้น</label>
          <select
            id="students-grade"
            value={filterGrade}
            onChange={e => { setFilterGrade(e.target.value); setFilterRoom('') }}
            aria-label="กรองตามชั้น"
          >
            <option value="">ทุกชั้น</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 120px' }}>
          <label htmlFor="students-room" className="sr-only">กรองตามห้อง</label>
          <select
            id="students-room"
            value={filterRoom}
            onChange={e => setFilterRoom(e.target.value)}
            disabled={!filterGrade}
            aria-label="กรองตามห้อง"
          >
            <option value="">ทุกห้อง</option>
            {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
          </select>
        </div>
        {(filterGrade || filterRoom || search) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterGrade(''); setFilterRoom(''); setSearch('') }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Content */}
      {error ? (
        <div className="card" style={{ color: 'var(--fc-danger)', textAlign: 'center', padding: '40px 0' }}>
          {error}
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--fc-text-3)', padding: '48px 0' }}>
          {(search || filterGrade || filterRoom) ? 'ไม่พบนักเรียนที่ตรงกับเงื่อนไข' : 'ยังไม่มีนักเรียนในระบบ'}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
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
                <tr
                  key={s.student_id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/students/${encodeURIComponent(s.student_id)}`)}
                >
                  <td style={{ fontWeight: 600, color: 'var(--fc-text)', fontFamily: 'var(--fc-font-mono)' }}>
                    {s.student_id}
                  </td>
                  <td>{s.first_name}</td>
                  <td>{s.last_name}</td>
                  <td>{s.grade_level ?? '—'}</td>
                  <td>{s.room_number ?? '—'}</td>
                  <td>
                    {s.has_face
                      ? <span className="chip" style={{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)' }}>มีแล้ว</span>
                      : <span className="chip" style={{ background: 'var(--fc-danger-light)', color: 'var(--fc-danger)' }}>ยังไม่มี</span>
                    }
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
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
        </div>
      )}

      {/* Confirm modal */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">ยืนยันการลบ</div>
            <p style={{ fontSize: 14, color: 'var(--fc-text-2)', marginBottom: 20 }}>
              ลบ <strong>{confirm.first_name} {confirm.last_name}</strong> ({confirm.student_id}) ออกจากระบบ?
              <br />
              <span style={{ color: 'var(--fc-danger)', fontSize: 12 }}>ข้อมูลและใบหน้าจะถูกลบถาวร</span>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--fc-danger)' }}
                disabled={deleting === confirm.student_id}
                onClick={() => handleDelete(confirm.student_id)}
              >
                {deleting === confirm.student_id ? 'กำลังลบ…' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
