import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'
import { useDialog } from '../hooks/useDialog'

const API = `${import.meta.env.VITE_API_URL}/enroll`

export default function Students() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { dialog, alert } = useDialog()
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [search, setSearch]     = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterRoom, setFilterRoom]   = useState('')
  const [filterFace, setFilterFace]   = useState('all')
  const [deleting, setDeleting]     = useState(null)
  const [confirm, setConfirm]       = useState(null)
  const [selected, setSelected]     = useState(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const selectAllRef = useRef(null)

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

  // Clear selection when filters change
  useEffect(() => { setSelected(new Set()) }, [filterGrade, filterRoom, filterFace, search])

  const grades = [...new Set(students.map(s => s.grade_level).filter(Boolean))].sort()
  const rooms  = [...new Set(
    students
      .filter(s => !filterGrade || s.grade_level === filterGrade)
      .map(s => s.room_number)
      .filter(Boolean)
  )].sort((a, b) => Number(a) - Number(b))

  const noFaceCount = students.filter(s => !s.has_face).length

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q || (
      s.student_id.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q)
    )
    const matchGrade = !filterGrade || s.grade_level === filterGrade
    const matchRoom  = !filterRoom  || s.room_number  === filterRoom
    const matchFace  = filterFace === 'all' || !s.has_face
    return matchSearch && matchGrade && matchRoom && matchFace
  })

  // Selection helpers
  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.student_id))
  const someFilteredSelected = filtered.some(s => selected.has(s.student_id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected
    }
  }, [someFilteredSelected, allFilteredSelected])

  const toggleSelect = (sid, e) => {
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sid) ? next.delete(sid) : next.add(sid)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(s => next.delete(s.student_id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        filtered.forEach(s => next.add(s.student_id))
        return next
      })
    }
  }

  // Single delete
  const handleDelete = async (studentId) => {
    setDeleting(studentId)
    try {
      await axios.delete(`${API}/students/${studentId}`)
      setStudents(prev => prev.filter(s => s.student_id !== studentId))
      setSelected(prev => { const n = new Set(prev); n.delete(studentId); return n })
    } catch {
      await alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setDeleting(null)
      setConfirm(null)
    }
  }

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      const ids = [...selected]
      await axios.post(`${API}/students/bulk-delete`, { student_ids: ids })
      setStudents(prev => prev.filter(s => !selected.has(s.student_id)))
      setSelected(new Set())
      setBulkConfirm(false)
    } catch {
      await alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Export
  const exportExcel = () => {
    const params = new URLSearchParams()
    if (selected.size > 0) {
      params.set('ids', [...selected].join(','))
    } else {
      if (filterGrade) params.append('grade_level', filterGrade)
      if (filterRoom)  params.append('room_number', filterRoom)
    }
    window.open(`${API}/students/export?${params}`, '_blank')
  }

  return (
    <main id="main-content" className="page">
      {dialog}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">รายชื่อนักเรียน</h1>
          <p className="page-sub">นักเรียนทั้งหมดในระบบ {students.length} คน</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>รีเฟรช</button>
          <button className="btn btn-ghost btn-sm" onClick={exportExcel}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4, verticalAlign: 'middle' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {selected.size > 0 ? `ส่งออก ${selected.size} คน` : 'ส่งออก Excel'}
          </button>
          {user?.role === 'admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/enroll')}>+ ลงทะเบียนนักเรียน</button>
          )}
        </div>
      </div>

      {/* No-face banner */}
      {user?.role === 'admin' && noFaceCount > 0 && filterFace === 'all' && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--fc-warning-light)', border: '1px solid var(--fc-warning)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16, gap: 12,
        }}>
          <div style={{ fontSize: 13, color: 'var(--fc-warning)', fontWeight: 500 }}>
            มีนักเรียน <strong>{noFaceCount}</strong> คนที่ยังไม่มีใบหน้าในระบบ — กดที่ชื่อเพื่อเพิ่มใบหน้า
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setFilterFace('no_face')}
            style={{ background: 'var(--fc-warning)', color: '#fff', border: 'none', flexShrink: 0 }}
          >
            ดูรายการ
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--fc-primary)', color: '#fff',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>เลือกแล้ว {selected.size} คน</span>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-sm"
            onClick={() => setSelected(new Set())}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
          >
            ยกเลิกการเลือก
          </button>
          <button
            className="btn btn-sm"
            onClick={exportExcel}
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
          >
            ส่งออก Excel
          </button>
          {user?.role === 'admin' && (
            <button
              className="btn btn-sm"
              onClick={() => setBulkConfirm(true)}
              style={{ background: 'var(--fc-danger)', color: '#fff', border: 'none' }}
            >
              ลบ {selected.size} คน
            </button>
          )}
        </div>
      )}

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
        <div style={{ flex: '0 0 130px' }}>
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
        <div style={{ flex: '0 0 110px' }}>
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
        <select
          value={filterFace}
          onChange={e => setFilterFace(e.target.value)}
          style={{ flex: '0 0 160px' }}
          aria-label="กรองตามใบหน้า"
        >
          <option value="all">ใบหน้า: ทั้งหมด</option>
          <option value="no_face">ยังไม่มีใบหน้า ({noFaceCount})</option>
        </select>
        {(filterGrade || filterRoom || search || filterFace !== 'all') && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterGrade(''); setFilterRoom(''); setSearch(''); setFilterFace('all') }}
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
          {/* Desktop table */}
          <div className="students-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      aria-label="เลือกทั้งหมด"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: 120 }}>รหัสนักเรียน</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th style={{ width: 100 }}>ชั้น/ห้อง</th>
                  <th style={{ width: 90 }}>ใบหน้า</th>
                  {user?.role === 'admin' && <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.student_id}
                    style={{
                      cursor: 'pointer',
                      background: selected.has(s.student_id)
                        ? 'var(--fc-primary-light, rgba(99,102,241,0.08))'
                        : !s.has_face ? 'rgba(251,191,36,0.06)' : undefined,
                    }}
                    onClick={() => navigate(`/students/${encodeURIComponent(s.student_id)}`)}
                  >
                    <td style={{ textAlign: 'center' }} onClick={e => toggleSelect(s.student_id, e)}>
                      <input
                        type="checkbox"
                        checked={selected.has(s.student_id)}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontFamily: 'var(--fc-font-mono)', fontSize: 13, color: 'var(--fc-text-2)' }}>
                      {s.student_id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--fc-text)', lineHeight: 1.3 }}>
                        {[s.title, s.first_name, s.last_name].filter(Boolean).join(' ') || '—'}
                      </div>
                    </td>
                    <td style={{ color: 'var(--fc-text-3)', fontSize: 13 }}>
                      {s.grade_level && s.room_number ? `${s.grade_level}/${s.room_number}` : s.grade_level ?? '—'}
                    </td>
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

          {/* Mobile cards */}
          <div className="students-cards-wrap">
            {filtered.map(s => (
              <div
                key={s.student_id}
                className="student-card-row"
                style={{
                  background: selected.has(s.student_id)
                    ? 'var(--fc-primary-light, rgba(99,102,241,0.08))'
                    : !s.has_face ? 'rgba(251,191,36,0.06)' : undefined,
                }}
                onClick={() => navigate(`/students/${encodeURIComponent(s.student_id)}`)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.student_id)}
                  onChange={() => {}}
                  onClick={e => toggleSelect(s.student_id, e)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="student-card-main">
                  <div className="student-card-name">
                    {[s.title, s.first_name, s.last_name].filter(Boolean).join(' ') || '(ไม่มีชื่อ)'}
                  </div>
                  <div className="student-card-id">{s.student_id}</div>
                  <div className="student-card-meta">
                    {s.grade_level ? `ชั้น ${s.grade_level}` : '—'}{s.room_number ? ` ห้อง ${s.room_number}` : ''}
                  </div>
                </div>
                <div className="student-card-right">
                  {s.has_face
                    ? <span className="chip" style={{ background: 'var(--fc-success-light)', color: 'var(--fc-success-dark)' }}>มีแล้ว</span>
                    : <span className="chip" style={{ background: 'var(--fc-danger-light)', color: 'var(--fc-danger)' }}>ยังไม่มี</span>
                  }
                  {user?.role === 'admin' && (
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deleting === s.student_id}
                      onClick={e => { e.stopPropagation(); setConfirm(s) }}
                    >
                      {deleting === s.student_id ? '…' : 'ลบ'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single delete modal */}
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

      {/* Bulk delete modal */}
      {bulkConfirm && (
        <div className="modal-overlay" onClick={() => !bulkDeleting && setBulkConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">ยืนยันการลบจำนวนมาก</div>
            <p style={{ fontSize: 14, color: 'var(--fc-text-2)', marginBottom: 20 }}>
              ลบนักเรียน <strong>{selected.size} คน</strong> ออกจากระบบ?
              <br />
              <span style={{ color: 'var(--fc-danger)', fontSize: 12 }}>ข้อมูลและใบหน้าทั้งหมดจะถูกลบถาวร ไม่สามารถกู้คืนได้</span>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" disabled={bulkDeleting} onClick={() => setBulkConfirm(false)}>ยกเลิก</button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--fc-danger)' }}
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
              >
                {bulkDeleting ? 'กำลังลบ…' : `ลบ ${selected.size} คน`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
