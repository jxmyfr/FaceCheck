import { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

const API = import.meta.env.VITE_API_URL

const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
const DAY_FULL = {
  จ: 'จันทร์', อ: 'อังคาร', พ: 'พุธ',
  พฤ: 'พฤหัสบดี', ศ: 'ศุกร์', ส: 'เสาร์', อา: 'อาทิตย์',
}
// JS getDay(): 0=Sun 1=Mon ... 6=Sat → Thai
const JS_TO_THAI = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const TODAY = JS_TO_THAI[new Date().getDay()]

const COLORS = [
  { bg: 'rgba(26,86,219,0.07)',  border: 'rgba(26,86,219,0.2)',  accent: '#1A56DB' },
  { bg: 'rgba(124,58,237,0.07)', border: 'rgba(124,58,237,0.2)', accent: '#7C3AED' },
  { bg: 'rgba(8,145,178,0.07)',  border: 'rgba(8,145,178,0.2)',  accent: '#0891B2' },
  { bg: 'rgba(22,163,74,0.07)',  border: 'rgba(22,163,74,0.2)',  accent: '#16A34A' },
  { bg: 'rgba(217,119,6,0.07)',  border: 'rgba(217,119,6,0.2)',  accent: '#D97706' },
  { bg: 'rgba(220,38,38,0.07)',  border: 'rgba(220,38,38,0.2)',  accent: '#DC2626' },
]
const colorOf = (id) => COLORS[id % COLORS.length]

function getNowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function isCurrentlyActive(s) {
  if (s.day_of_week !== TODAY) return false
  try {
    const [sh, sm] = s.time_start.split(':').map(Number)
    const [eh, em] = s.time_end.split(':').map(Number)
    const now = getNowMinutes()
    return (sh * 60 + sm - 10) <= now && now <= (eh * 60 + em + 10)
  } catch { return false }
}

function SubjectCard({ s }) {
  const active = isCurrentlyActive(s)
  const c = colorOf(s.subject_id)
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 10,
      border: `1.5px solid ${active ? 'var(--fc-primary)' : c.border}`,
      background: active ? 'var(--fc-primary-light)' : c.bg,
      position: 'relative',
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      {active && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'var(--fc-primary)',
          borderRadius: '10px 10px 0 0',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: active ? 'var(--fc-primary)' : 'var(--fc-text-4)', fontWeight: 600 }}>
          {s.time_start}–{s.time_end}
        </span>
        {active && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.02em',
            background: 'var(--fc-primary)', color: '#fff',
            padding: '1px 6px', borderRadius: 20,
          }}>กำลังสอน</span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--fc-primary)' : c.accent, marginBottom: 2 }}>
        {s.subject_code}
      </div>
      <div style={{ fontSize: 11, color: 'var(--fc-text-2)', lineHeight: 1.45, marginBottom: 3 }}>
        {s.subject_name}
      </div>
      {(s.grade_level || s.room_number) && (
        <div style={{ fontSize: 10, color: 'var(--fc-text-4)' }}>
          {[s.grade_level, s.room_number ? `ห้อง ${s.room_number}` : ''].filter(Boolean).join(' ')}
        </div>
      )}
      {s.teacher_name && (
        <div style={{ fontSize: 10, color: 'var(--fc-text-4)', marginTop: 2 }}>{s.teacher_name}</div>
      )}
    </div>
  )
}

export default function Schedule() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeDay, setActiveDay] = useState(TODAY)

  useEffect(() => {
    axios.get(`${API}/attendance/schedules/all`)
      .then(r => { setSchedules(r.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const byDay = Object.fromEntries(DAYS.map(d => [d, []]))
  schedules.forEach(s => { if (byDay[s.day_of_week]) byDay[s.day_of_week].push(s) })
  DAYS.forEach(d => byDay[d].sort((a, b) => a.time_start.localeCompare(b.time_start)))

  const todayList = byDay[TODAY] || []

  return (
    <div className="page" style={{ padding: '28px 24px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fc-text)', margin: 0 }}>ตารางสอน</h1>
        <p style={{ fontSize: 13, color: 'var(--fc-text-4)', marginTop: 4 }}>
          {user?.role === 'admin' ? 'ตารางสอนทุกวิชาในระบบ' : 'ตารางสอนของคุณประจำสัปดาห์'}
          {!loading && schedules.length > 0 && ` — ${schedules.length} คาบ/สัปดาห์`}
        </p>
      </div>

      {/* Today's summary strip */}
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
              background: isCurrentlyActive(s) ? 'var(--fc-primary)' : 'rgba(255,255,255,0.75)',
              color: isCurrentlyActive(s) ? '#fff' : 'var(--fc-text-2)',
              fontWeight: isCurrentlyActive(s) ? 600 : 400,
            }}>
              {s.time_start} {s.subject_code}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fc-text-4)' }}>กำลังโหลด...</div>
      ) : schedules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--fc-text-4)', fontSize: 14 }}>
          ยังไม่มีตารางสอนในระบบ
        </div>
      ) : (
        <>
          {/* Desktop: all 7 days side-by-side */}
          <div className="schedule-week-grid">
            {DAYS.map(d => (
              <div key={d}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textAlign: 'center',
                  padding: '6px 4px', borderRadius: 8, marginBottom: 8,
                  background: d === TODAY ? 'var(--fc-primary)' : 'var(--fc-muted)',
                  color: d === TODAY ? '#fff' : 'var(--fc-text-3)',
                  letterSpacing: '0.02em',
                  position: 'relative',
                }}>
                  {DAY_FULL[d]}
                  {byDay[d].length > 0 && d !== TODAY && (
                    <span style={{
                      position: 'absolute', top: 5, right: 6,
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--fc-primary)', opacity: 0.5,
                    }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byDay[d].length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: 'var(--fc-neutral)' }}>—</div>
                  ) : (
                    byDay[d].map(s => <SubjectCard key={s.schedule_id} s={s} />)
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile: tab per day */}
          <div className="schedule-day-view">
            {/* Day selector */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
              {DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
                    fontSize: 12, fontWeight: activeDay === d ? 600 : 400,
                    background: activeDay === d
                      ? 'var(--fc-primary)'
                      : d === TODAY ? 'var(--fc-primary-light)' : 'var(--fc-muted)',
                    color: activeDay === d
                      ? '#fff'
                      : d === TODAY ? 'var(--fc-primary)' : 'var(--fc-text-3)',
                    position: 'relative',
                    transition: 'all 0.15s',
                  }}
                >
                  {DAY_FULL[d]}
                  {d === TODAY && activeDay !== d && (
                    <span style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 5, height: 5, borderRadius: '50%',
                      background: 'var(--fc-primary)',
                    }} />
                  )}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fc-text-2)', marginBottom: 12 }}>
              {DAY_FULL[activeDay]}{activeDay === TODAY ? ' (วันนี้)' : ''}
              {' '}
              <span style={{ fontWeight: 400, color: 'var(--fc-text-4)' }}>
                {byDay[activeDay].length} คาบ
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {byDay[activeDay].length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fc-text-4)', fontSize: 13 }}>
                  ไม่มีชั่วโมงสอน
                </div>
              ) : (
                byDay[activeDay].map(s => <SubjectCard key={s.schedule_id} s={s} />)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
