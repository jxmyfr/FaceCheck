import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL

const DAYS     = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const DAY_FULL = { จ: 'จันทร์', อ: 'อังคาร', พ: 'พุธ', พฤ: 'พฤหัสบดี', ศ: 'ศุกร์', ส: 'เสาร์', อา: 'อาทิตย์' }
const JS_TO_THAI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const TODAY = JS_TO_THAI[new Date().getDay()]

// ── Time grid constants ───────────────────────────────────────────
const PX_PER_MIN  = 1.5
const GRID_BASE   = 7 * 60        // 07:00
const GRID_END    = 18 * 60       // 18:00
const GRID_H      = (GRID_END - GRID_BASE) * PX_PER_MIN   // 990 px
const DAY_HDR_H   = 44
const TIME_COL_W  = 48
const HOURS = Array.from({ length: (GRID_END - GRID_BASE) / 60 + 1 }, (_, i) => GRID_BASE / 60 + i)

// ── Colors ────────────────────────────────────────────────────────
const COLORS = [
  { bg: 'rgba(26,86,219,0.09)',  border: 'rgba(26,86,219,0.28)',  accent: '#1A56DB' },
  { bg: 'rgba(124,58,237,0.09)', border: 'rgba(124,58,237,0.28)', accent: '#7C3AED' },
  { bg: 'rgba(8,145,178,0.09)',  border: 'rgba(8,145,178,0.28)',  accent: '#0891B2' },
  { bg: 'rgba(22,163,74,0.09)',  border: 'rgba(22,163,74,0.28)',  accent: '#16A34A' },
  { bg: 'rgba(217,119,6,0.09)',  border: 'rgba(217,119,6,0.28)',  accent: '#D97706' },
  { bg: 'rgba(220,38,38,0.09)',  border: 'rgba(220,38,38,0.28)',  accent: '#DC2626' },
]
const colorOf = (id) => COLORS[id % COLORS.length]

// ── Helpers ───────────────────────────────────────────────────────
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const minToY = (min) => (min - GRID_BASE) * PX_PER_MIN

function isActive(s) {
  if (s.day_of_week !== TODAY) return false
  try {
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    return (toMin(s.time_start) - 10) <= now && now <= (toMin(s.time_end) + 10)
  } catch { return false }
}

// Assign non-overlapping lane indices within a day column
function computeLanes(items) {
  if (!items.length) return []
  const sorted = [...items].sort((a, b) => toMin(a.time_start) - toMin(b.time_start))
  const laneEnds = []
  const withLane = sorted.map(s => {
    const end = toMin(s.time_end)
    let lane = laneEnds.findIndex(e => e <= toMin(s.time_start))
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end) }
    else laneEnds[lane] = end
    return { ...s, lane, _end: end }
  })
  return withLane.map((card, i) => {
    let maxLane = card.lane
    for (let j = 0; j < withLane.length; j++) {
      if (i === j) continue
      const a0 = toMin(card.time_start), a1 = card._end
      const b0 = toMin(withLane[j].time_start), b1 = withLane[j]._end
      if (a0 < b1 && b0 < a1) maxLane = Math.max(maxLane, withLane[j].lane)
    }
    return { ...card, totalLanes: maxLane + 1 }
  })
}

// ── Filter bar ────────────────────────────────────────────────────
function FilterBar({ schedules, filters, setFilters, isAdmin }) {
  const teachers = useMemo(
    () => [...new Set(schedules.map(s => s.teacher_name).filter(Boolean))].sort(),
    [schedules],
  )
  const grades = useMemo(
    () => [...new Set(schedules.map(s => s.grade_level).filter(Boolean))].sort(),
    [schedules],
  )
  const rooms = useMemo(() => {
    const src = filters.grade ? schedules.filter(s => s.grade_level === filters.grade) : schedules
    return [...new Set(src.map(s => s.room_number).filter(Boolean))].sort((a, b) => Number(a) - Number(b))
  }, [schedules, filters.grade])

  const sel = {
    padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit',
    border: '1.5px solid var(--fc-border)', background: 'var(--fc-surface)',
    color: 'var(--fc-text-2)', cursor: 'pointer',
  }
  const hasFilter = filters.teacher || filters.grade || filters.room

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
      {isAdmin && (
        <select value={filters.teacher} onChange={e => setFilters(f => ({ ...f, teacher: e.target.value }))} style={sel}>
          <option value="">ครูทุกคน</option>
          {teachers.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      <select value={filters.grade} onChange={e => setFilters(f => ({ ...f, grade: e.target.value, room: '' }))} style={sel}>
        <option value="">ทุกชั้น</option>
        {grades.map(g => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={filters.room} onChange={e => setFilters(f => ({ ...f, room: e.target.value }))} style={sel} disabled={!filters.grade}>
        <option value="">ทุกห้อง</option>
        {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
      </select>
      {hasFilter && (
        <button
          onClick={() => setFilters({ teacher: '', grade: '', room: '' })}
          style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, border: 'none', fontFamily: 'inherit', background: 'var(--fc-muted)', color: 'var(--fc-text-3)', cursor: 'pointer' }}
        >
          ล้างตัวกรอง ×
        </button>
      )}
    </div>
  )
}

// ── Time grid (desktop) ───────────────────────────────────────────
function TimeGrid({ byDay }) {
  const nowY = useMemo(() => {
    const now = new Date().getHours() * 60 + new Date().getMinutes()
    return (now >= GRID_BASE && now <= GRID_END) ? minToY(now) : null
  }, [])

  return (
    <div style={{ display: 'flex', minWidth: 600 }}>
      {/* Time axis */}
      <div style={{ width: TIME_COL_W, flexShrink: 0 }}>
        <div style={{ height: DAY_HDR_H }} />
        <div style={{ position: 'relative', height: GRID_H }}>
          {HOURS.map(h => (
            <div key={h} style={{
              position: 'absolute',
              top: minToY(h * 60) - 7,
              right: 6, left: 0,
              textAlign: 'right',
              fontSize: 9,
              color: 'var(--fc-text-4)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      {DAYS.map(d => {
        const cards = computeLanes(byDay[d])
        const isToday = d === TODAY
        return (
          <div key={d} style={{ flex: 1, minWidth: 90, borderLeft: '1px solid var(--fc-border)' }}>
            {/* Header */}
            <div style={{
              height: DAY_HDR_H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
              background: isToday ? 'var(--fc-primary)' : 'var(--fc-muted)',
              color: isToday ? '#fff' : 'var(--fc-text-3)',
              borderBottom: '1px solid var(--fc-border)',
              position: 'sticky', top: 0, zIndex: 2,
              userSelect: 'none',
            }}>
              {DAY_FULL[d]}
            </div>

            {/* Grid area */}
            <div style={{ position: 'relative', height: GRID_H }}>
              {/* Hour grid lines */}
              {HOURS.map(h => (
                <div key={h} style={{
                  position: 'absolute',
                  top: minToY(h * 60),
                  left: 0, right: 0, height: 1,
                  background: h % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
                }} />
              ))}

              {/* Current-time line (today only) */}
              {isToday && nowY !== null && (
                <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, height: 2, background: 'var(--fc-danger)', zIndex: 3, pointerEvents: 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fc-danger)', position: 'absolute', left: -4, top: -3 }} />
                </div>
              )}

              {/* Cards */}
              {cards.map(s => {
                const top    = minToY(toMin(s.time_start))
                const height = Math.max((toMin(s.time_end) - toMin(s.time_start)) * PX_PER_MIN - 3, 24)
                const w      = 100 / s.totalLanes
                const l      = (s.lane / s.totalLanes) * 100
                const c      = colorOf(s.subject_id)
                const active = isActive(s)
                return (
                  <div
                    key={s.schedule_id}
                    title={`${s.subject_code} — ${s.subject_name}\n${s.time_start}–${s.time_end}  ${s.grade_level ?? ''} ห้อง ${s.room_number ?? ''}\n${s.teacher_name ?? ''}`}
                    style={{
                      position: 'absolute',
                      top, height,
                      left:  `calc(${l}% + 2px)`,
                      width: `calc(${w}% - 4px)`,
                      borderRadius: 6,
                      background: active ? 'var(--fc-primary-light)' : c.bg,
                      border: `1.5px solid ${active ? 'var(--fc-primary)' : c.border}`,
                      padding: '3px 5px',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      cursor: 'default',
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--fc-primary)' : c.accent, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.subject_code}
                    </div>
                    {height > 38 && (
                      <div style={{ fontSize: 9, color: 'var(--fc-text-2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35 }}>
                        {s.subject_name}
                      </div>
                    )}
                    {height > 60 && (s.grade_level || s.room_number) && (
                      <div style={{ fontSize: 9, color: 'var(--fc-text-4)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[s.grade_level, s.room_number ? `ห้อง ${s.room_number}` : ''].filter(Boolean).join(' ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Card (mobile list) ────────────────────────────────────────────
function SubjectCard({ s }) {
  const active = isActive(s)
  const c = colorOf(s.subject_id)
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      border: `1.5px solid ${active ? 'var(--fc-primary)' : c.border}`,
      background: active ? 'var(--fc-primary-light)' : c.bg,
      position: 'relative', overflow: 'hidden',
    }}>
      {active && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--fc-primary)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'var(--fc-text-4)', fontWeight: 600 }}>{s.time_start}–{s.time_end}</span>
        {active && <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--fc-primary)', color: '#fff', padding: '1px 6px', borderRadius: 20 }}>กำลังสอน</span>}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--fc-primary)' : c.accent, marginBottom: 2 }}>{s.subject_code}</div>
      <div style={{ fontSize: 11, color: 'var(--fc-text-2)', lineHeight: 1.45, marginBottom: 3 }}>{s.subject_name}</div>
      {(s.grade_level || s.room_number) && (
        <div style={{ fontSize: 10, color: 'var(--fc-text-4)' }}>
          {[s.grade_level, s.room_number ? `ห้อง ${s.room_number}` : ''].filter(Boolean).join(' ')}
        </div>
      )}
      {s.teacher_name && <div style={{ fontSize: 10, color: 'var(--fc-text-4)', marginTop: 2 }}>{s.teacher_name}</div>}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function Schedule() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [schedules, setSchedules] = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeDay, setActiveDay] = useState(TODAY)
  const [filters, setFilters]     = useState({ teacher: '', grade: '', room: '' })

  useEffect(() => {
    axios.get(`${API}/attendance/schedules/all`)
      .then(r => { setSchedules(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => schedules.filter(s => {
    if (filters.teacher && s.teacher_name !== filters.teacher) return false
    if (filters.grade   && s.grade_level  !== filters.grade)   return false
    if (filters.room    && s.room_number  !== filters.room)    return false
    return true
  }), [schedules, filters])

  const byDay = useMemo(() => {
    const map = Object.fromEntries(DAYS.map(d => [d, []]))
    filtered.forEach(s => { if (map[s.day_of_week]) map[s.day_of_week].push(s) })
    DAYS.forEach(d => map[d].sort((a, b) => a.time_start.localeCompare(b.time_start)))
    return map
  }, [filtered])

  const todayList = byDay[TODAY] || []
  const hasFilter = filters.teacher || filters.grade || filters.room

  return (
    <div className="page" style={{ padding: '28px 24px', maxWidth: 1600 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fc-text)', margin: 0 }}>ตารางสอน</h1>
        <p style={{ fontSize: 13, color: 'var(--fc-text-4)', marginTop: 4 }}>
          {isAdmin ? 'ตารางสอนทุกวิชาในระบบ' : 'ตารางสอนของคุณประจำสัปดาห์'}
          {!loading && schedules.length > 0 && ` — ${filtered.length}${hasFilter ? `/${schedules.length}` : ''} คาบ/สัปดาห์`}
        </p>
      </div>

      {/* Filters */}
      {!loading && schedules.length > 0 && (
        <FilterBar schedules={schedules} filters={filters} setFilters={setFilters} isAdmin={isAdmin} />
      )}

      {/* Today strip */}
      {todayList.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '10px 14px', borderRadius: 10, marginBottom: 20,
          background: 'var(--fc-primary-light)',
          border: '1px solid rgba(26,86,219,0.15)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fc-primary)', flexShrink: 0 }}>
            วันนี้ ({DAY_FULL[TODAY]})
          </span>
          {todayList.map(s => (
            <span key={s.schedule_id} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: isActive(s) ? 'var(--fc-primary)' : 'rgba(255,255,255,0.75)',
              color: isActive(s) ? '#fff' : 'var(--fc-text-2)',
              fontWeight: isActive(s) ? 600 : 400,
            }}>
              {s.time_start} {s.subject_code}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fc-text-4)' }}>กำลังโหลด...</div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fc-text-4)', fontSize: 14 }}>ยังไม่มีตารางสอนในระบบ</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fc-text-4)', fontSize: 14 }}>ไม่มีข้อมูลตรงตามตัวกรองที่เลือก</div>
      ) : (
        <>
          {/* Desktop: time grid */}
          <div className="schedule-week-grid">
            <div style={{
              background: 'var(--fc-surface)',
              borderRadius: 12,
              border: '1px solid var(--fc-border)',
              boxShadow: 'var(--fc-shadow-sm)',
              overflow: 'auto',
            }}>
              <TimeGrid byDay={byDay} />
            </div>
          </div>

          {/* Mobile: day tabs + card list */}
          <div className="schedule-day-view">
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              {DAYS.map(d => (
                <button key={d} onClick={() => setActiveDay(d)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  flexShrink: 0, fontFamily: 'inherit', fontSize: 12,
                  fontWeight: activeDay === d ? 600 : 400,
                  background: activeDay === d ? 'var(--fc-primary)' : d === TODAY ? 'var(--fc-primary-light)' : 'var(--fc-muted)',
                  color: activeDay === d ? '#fff' : d === TODAY ? 'var(--fc-primary)' : 'var(--fc-text-3)',
                  transition: 'all 0.15s', position: 'relative',
                }}>
                  {DAY_FULL[d]}
                  {d === TODAY && activeDay !== d && (
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: 'var(--fc-primary)' }} />
                  )}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)', marginBottom: 12 }}>
              {DAY_FULL[activeDay]}{activeDay === TODAY ? ' (วันนี้)' : ''}{' '}
              <span style={{ fontWeight: 400, color: 'var(--fc-text-4)' }}>{byDay[activeDay].length} คาบ</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byDay[activeDay].length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>ไม่มีชั่วโมงสอน</div>
                : byDay[activeDay].map(s => <SubjectCard key={s.schedule_id} s={s} />)
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}
