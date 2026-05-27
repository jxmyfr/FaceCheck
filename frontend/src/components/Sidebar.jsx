import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePrivacy } from '../contexts/PrivacyContext'

// ── Icons ────────────────────────────────────────────────────────
const IcDashboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
)
const IcCamera = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
)
const IcUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IcClipboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
)
const IcReport = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
)
const IcSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const IcLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)
const IcCalendar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const IcMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6"  x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)
const IcHelp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const IcX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IcChevronLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

// label fade helper
const lbl = (collapsed) => ({
  opacity: collapsed ? 0 : 1,
  transition: collapsed ? 'opacity 0.07s ease' : 'opacity 0.16s ease 0.13s',
  pointerEvents: collapsed ? 'none' : 'auto',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
})

// Tooltip portal — escapes aside's overflow:hidden
function SideTooltip({ anchorRef, label, visible, tooltipId }) {
  if (!visible || !anchorRef.current) return null
  const rect = anchorRef.current.getBoundingClientRect()
  return createPortal(
    <div
      role="tooltip"
      id={tooltipId}
      style={{
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
        transform: 'translateY(-50%)',
        background: '#0F172A',
        color: '#E2E8F0',
        fontSize: 12, fontWeight: 500,
        padding: '6px 11px', borderRadius: 7,
        whiteSpace: 'nowrap',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {label}
    </div>,
    document.body
  )
}

// ── NavItem ──────────────────────────────────────────────────────
function NavItem({ to, label, icon, active, collapsed, onClose }) {
  const [hov, setHov] = useState(false)
  const ref = useRef(null)
  const tooltipId = `sidebar-tip-${label.replace(/\s/g, '-').toLowerCase()}`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Link
        to={to}
        onClick={onClose}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-describedby={collapsed && hov ? tooltipId : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '9px 12px',
          justifyContent: 'flex-start',
          borderRadius: 8, textDecoration: 'none',
          fontSize: 13, fontWeight: active ? 600 : 400,
          color: active ? '#fff' : hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
          background: active
            ? 'rgba(96,165,250,0.13)'
            : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'color 0.12s, background 0.12s',
        }}
      >
        <span style={{
          flexShrink: 0, display: 'flex',
          color: active ? 'var(--fc-sidebar-accent)' : hov ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.32)',
          transition: 'color 0.12s',
        }}>
          {icon}
        </span>
        <span style={{
          ...lbl(collapsed),
          flex: collapsed ? '0 0 0px' : 1,
          maxWidth: collapsed ? 0 : 'none',
          letterSpacing: '0.01em',
        }}>
          {label}
        </span>
      </Link>

      <SideTooltip anchorRef={ref} label={label} visible={collapsed && hov} tooltipId={tooltipId} />
    </div>
  )
}

// Logout icon button — for collapsed sidebar
function LogoutIconBtn({ onClick }) {
  const ref = useRef(null)
  const [hov, setHov] = useState(false)
  return (
    <div ref={ref}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-label="ออกจากระบบ"
        aria-describedby={hov ? 'sidebar-tip-logout' : undefined}
        style={{
          width: 40, height: 40, borderRadius: 8,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hov ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.05)',
          color: hov ? '#FCA5A5' : 'rgba(255,255,255,0.35)',
          transition: 'background 0.12s, color 0.12s',
        }}
      >
        <IcLogout />
      </button>
      <SideTooltip anchorRef={ref} label="ออกจากระบบ" visible={hov} tooltipId="sidebar-tip-logout" />
    </div>
  )
}

// ── Help content ─────────────────────────────────────────────────
const HELP_ADMIN = [
  {
    title: 'Dashboard',
    body: [
      'ดูภาพรวมการเข้าเรียนทั้งโรงเรียน — จำนวนนักเรียน วิชา และอัตราเฉลี่ยรายภาคเรียน',
      'กดที่การ์ด ม.ต้น / ม.ปลาย เพื่อ drill-down ลงไปถึงระดับชั้น → ห้อง → รายนักเรียน',
      'กราฟแสดงแนวโน้มการเข้าเรียนรายวันตลอดภาคเรียน',
    ],
  },
  {
    title: 'Scanner — สแกนใบหน้า',
    body: [
      'เลือกวิชาที่ต้องการเช็คอิน (ระบบจะล็อคคาบอัตโนมัติหากตรงเวลาปัจจุบัน)',
      'โหมด อัตโนมัติ: กด "เริ่มสแกน" แล้วให้นักเรียนเดินผ่านกล้อง ระบบสแกนทุก 2 วินาที',
      'โหมด เมนวล: กดถ่ายภาพครั้งละ 1 คน',
      'โหมด เช็คอิน ID: ป้อนรหัสนักเรียนโดยตรงเมื่อสแกนใบหน้าไม่ผ่าน',
      'ประวัติการสแกนจะค้างอยู่แม้เปลี่ยนหน้าแล้วกลับมา',
    ],
  },
  {
    title: 'Students — รายชื่อนักเรียน',
    body: [
      'ค้นหาด้วยรหัส / ชื่อ / นามสกุล กรองตามชั้นและห้อง',
      'แบนเนอร์เตือนเมื่อมีนักเรียนที่ยังไม่ได้ลงทะเบียนใบหน้า',
      'กดที่แถวนักเรียนเพื่อดูสถิติการเข้าเรียนและจัดการใบหน้า',
      'ปุ่ม "ลบ" ลบนักเรียนออกจากระบบพร้อมข้อมูลทั้งหมด (ย้อนกลับไม่ได้)',
    ],
  },
  {
    title: 'Enrollment — ลงทะเบียนนักเรียน',
    body: [
      'Import ข้อมูลนักเรียนจากไฟล์ Excel (.xlsx) — ดาวน์โหลด template ได้จากหน้านี้',
      'หลัง import แล้ว กดที่นักเรียนเพื่อถ่ายและบันทึกใบหน้าเข้าระบบ',
      'ใบหน้าที่ดี: แสงสว่าง มองตรง ไม่สวมแว่นหรือหน้ากาก',
    ],
  },
  {
    title: 'Reports — รายงาน',
    body: [
      'กรองรายงานตามวิชา วันที่ ชั้น และห้อง',
      'ส่งออกข้อมูลเป็นไฟล์ Excel เพื่อนำไปจัดทำเอกสาร',
    ],
  },
  {
    title: 'Admin — จัดการระบบ',
    body: [
      'แท็บ ครู: เพิ่ม / แก้ไข / ลบบัญชีครู และดูวิชาที่ได้รับมอบหมาย',
      'แท็บ วิชา: เพิ่มรายวิชา กำหนดตารางสอน (วัน / เวลา / ห้อง) มอบหมายครูผู้สอน',
      'แท็บ ตั้งค่า: กำหนดวันเปิด-ปิดภาคเรียน และค่า threshold การจับคู่ใบหน้า',
      'การเพิ่มวิชาพร้อมเลือกครูจะมอบหมายให้ครูคนนั้นโดยอัตโนมัติ',
    ],
  },
]

const HELP_TEACHER = [
  {
    title: 'Dashboard',
    body: [
      'ดูสรุปภาพรวมวิชาที่คุณสอน — จำนวนนักเรียน อัตราเข้าเรียน และบันทึกทั้งหมด',
      'กดที่การ์ดวิชาเพื่อดูรายละเอียดระดับห้อง → รายนักเรียน',
      'กราฟแสดงแนวโน้มการเข้าเรียน 30 วันย้อนหลัง',
    ],
  },
  {
    title: 'Scanner — สแกนใบหน้า',
    body: [
      'เลือกวิชาที่คุณสอน (แสดงเฉพาะวิชาที่ได้รับมอบหมาย)',
      'โหมด อัตโนมัติ: กด "เริ่มสแกน" แล้วให้นักเรียนเดินผ่านกล้อง',
      'โหมด เมนวล: กดถ่ายภาพครั้งละ 1 คน เหมาะเมื่อนักเรียนน้อย',
      'โหมด เช็คอิน ID: ป้อนรหัสนักเรียนเมื่อสแกนใบหน้าไม่ผ่าน เลือกสถานะ มาเรียน / มาสาย / ขาดเรียน',
      'หากพบคาบเรียนตรงเวลาปัจจุบัน ระบบจะล็อควิชาและห้องให้อัตโนมัติ',
    ],
  },
  {
    title: 'ตารางสอน',
    body: [
      'ดูตารางสอนประจำสัปดาห์ของคุณ แยกตามวัน',
      'คาบที่กำลังสอนอยู่จะถูก highlight ให้เห็นชัดเจน',
      'แถบสรุปด้านบนแสดงทุกคาบของวันนี้',
    ],
  },
  {
    title: 'Students — รายชื่อนักเรียน',
    body: [
      'ดูรายชื่อนักเรียนทั้งหมดในระบบ ค้นหาและกรองตามชั้น/ห้อง',
      'กดที่นักเรียนเพื่อดูสถิติการเข้าเรียนเฉพาะวิชาที่คุณสอน',
    ],
  },
  {
    title: 'Reports — รายงาน',
    body: [
      'ดูรายงานการเช็คอินเฉพาะวิชาที่คุณสอนเท่านั้น',
      'กรองตามวันที่และห้อง ส่งออกเป็น Excel',
    ],
  },
]

// ── Help modal ────────────────────────────────────────────────────
function HelpModal({ role, onClose }) {
  const sections = role === 'admin' ? HELP_ADMIN : HELP_TEACHER
  const roleLabel = role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครูผู้สอน'

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          maxHeight: 'calc(100vh - 32px)',
          background: 'var(--fc-surface)',
          borderRadius: 16,
          border: '1px solid var(--fc-border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'helpSlideIn 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--fc-border)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'var(--fc-primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--fc-primary)',
          }}>
            <IcHelp />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fc-text)' }}>คู่มือการใช้งาน</div>
            <div style={{ fontSize: 12, color: 'var(--fc-text-4)', marginTop: 1 }}>
              สิทธิ์:{' '}
              <span style={{
                background: role === 'admin' ? 'var(--fc-primary-light)' : 'var(--fc-success-light)',
                color: role === 'admin' ? 'var(--fc-primary)' : 'var(--fc-success-dark)',
                padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              }}>
                {roleLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="ปิดคู่มือ"
            style={{
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              border: 'none', background: 'var(--fc-muted)',
              color: 'var(--fc-text-3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IcX />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {sections.map((sec) => (
            <div key={sec.title}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: 'var(--fc-primary)',
                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10,
              }}>
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sec.body.map((line, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--fc-primary)', opacity: 0.5, marginTop: 7,
                    }} />
                    <div style={{ fontSize: 13, color: 'var(--fc-text-2)', lineHeight: 1.65 }}>{line}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 4, padding: '12px 14px',
            background: 'var(--fc-muted)', borderRadius: 10,
            fontSize: 12, color: 'var(--fc-text-4)', lineHeight: 1.7,
          }}>
            หากพบปัญหาหรือต้องการความช่วยเหลือเพิ่มเติม กรุณาติดต่อผู้ดูแลระบบ
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── HelpButton (mirrors NavItem style) ───────────────────────────
function HelpButton({ collapsed, onClick }) {
  const [hov, setHov] = useState(false)
  const ref = useRef(null)
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-label="คู่มือการใช้งาน"
        aria-describedby={collapsed && hov ? 'sidebar-tip-help' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '9px 12px', justifyContent: 'flex-start',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: 400,
          color: hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
          background: hov ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'color 0.12s, background 0.12s',
        }}
      >
        <span style={{
          flexShrink: 0, display: 'flex',
          color: hov ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.32)',
          transition: 'color 0.12s',
        }}>
          <IcHelp />
        </span>
        <span style={{
          ...lbl(collapsed),
          flex: collapsed ? '0 0 0px' : 1,
          maxWidth: collapsed ? 0 : 'none',
          letterSpacing: '0.01em',
        }}>
          ช่วยเหลือ
        </span>
      </div>
      <SideTooltip anchorRef={ref} label="ช่วยเหลือ" visible={collapsed && hov} tooltipId="sidebar-tip-help" />
    </div>
  )
}

// ── PrivacyButton ────────────────────────────────────────────────
function PrivacyButton({ collapsed, privacyMode, onToggle }) {
  const [hov, setHov] = useState(false)
  const ref = useRef(null)
  const label = privacyMode ? 'Privacy ON' : 'Privacy Mode'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        role="button" tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onToggle() }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        aria-label={label}
        aria-pressed={privacyMode}
        aria-describedby={collapsed && hov ? 'sidebar-tip-privacy' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '9px 12px', justifyContent: 'flex-start',
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: privacyMode ? 600 : 400,
          color: privacyMode ? '#FCD34D' : hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
          background: privacyMode
            ? 'rgba(251,191,36,0.12)'
            : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'color 0.12s, background 0.12s',
          border: 'none',
        }}
      >
        <span style={{ flexShrink: 0, display: 'flex', color: privacyMode ? '#FCD34D' : hov ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.32)', transition: 'color 0.12s' }}>
          {privacyMode
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </span>
        <span style={{
          ...lbl(collapsed),
          flex: collapsed ? '0 0 0px' : 1,
          maxWidth: collapsed ? 0 : 'none',
          letterSpacing: '0.01em',
        }}>
          {privacyMode ? 'Privacy ON' : 'Privacy Mode'}
        </span>
      </div>
      <SideTooltip anchorRef={ref} label={label} visible={collapsed && hov} tooltipId="sidebar-tip-privacy" />
    </div>
  )
}

// ── Sidebar ──────────────────────────────────────────────────────
export default function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { privacyMode, togglePrivacy } = usePrivacy()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const avatarRef = useRef(null)
  const [avatarHov, setAvatarHov] = useState(false)

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (!mobile) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = (isMobile && mobileOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobile, mobileOpen])

  const handleLogout = () => { logout(); navigate('/login') }

  const links = [
    { to: '/',          label: 'Dashboard',  icon: <IcDashboard /> },
    { to: '/scan',      label: 'Scanner',    icon: <IcCamera /> },
    { to: '/schedule',  label: 'ตารางสอน',   icon: <IcCalendar /> },
    { to: '/students',  label: 'Students',   icon: <IcUsers /> },
    ...(user?.role === 'admin' ? [{ to: '/enroll', label: 'Enrollment', icon: <IcClipboard /> }] : []),
    { to: '/reports',   label: 'Reports',    icon: <IcReport /> },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: <IcSettings /> }] : []),
  ]

  // On mobile, drawer is always full-width (never icon-only)
  const isCollapsed = isMobile ? false : collapsed
  const sidebarWidth = isCollapsed ? 60 : 220

  return (
    <>
      <style>{`
        @keyframes sidebarFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes helpSlideIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Mobile: dark overlay behind drawer */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 49,
          }}
        />
      )}

      {/* Mobile: floating hamburger (only when drawer is closed) */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="เปิดเมนู"
          style={{
            position: 'fixed', top: 14, left: 14, zIndex: 48,
            width: 40, height: 40, borderRadius: 10,
            border: 'none',
            background: 'var(--fc-surface)',
            boxShadow: 'var(--fc-shadow)',
            color: 'var(--fc-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <IcMenu />
        </button>
      )}

      <aside
        aria-label="เมนูนำทาง"
        style={{
          width: sidebarWidth,
          height: '100vh',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--fc-sidebar-bg)',
          overflow: 'hidden',
          transition: isMobile
            ? 'transform 0.25s cubic-bezier(0.4,0,0.2,1)'
            : 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
          borderRight: '1px solid var(--fc-sidebar-border)',
          zIndex: isMobile ? 50 : undefined,
        }}
      >
        <a href="#main-content" className="skip-link">ข้ามไปเนื้อหาหลัก</a>

        {/* ── Brand + Toggle (fixed height) ── */}
        <div style={{ height: 68, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 13px', gap: 10 }}>
          {isCollapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="ขยายเมนู"
              style={{
                width: 40, height: 40, borderRadius: 8, margin: '0 auto', flexShrink: 0,
                border: 'none', background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              <IcMenu />
            </button>
          ) : (
            <>
              <Link
                to="/"
                onClick={isMobile ? () => setMobileOpen(false) : undefined}
                style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}
              >
                <img src="/logo.png" alt="FaceCheck" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>FaceCheck</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>ระบบเช็คอิน</div>
                </div>
              </Link>
              <button
                onClick={isMobile ? () => setMobileOpen(false) : () => setCollapsed(true)}
                aria-label={isMobile ? 'ปิดเมนู' : 'ย่อเมนู'}
                style={{
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  border: 'none', background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.11)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >
                <IcChevronLeft />
              </button>
            </>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--fc-sidebar-border)', margin: '0 13px 10px' }} />

        {/* ── Nav ── */}
        <nav aria-label="เมนูหลัก" style={{
          flex: 1, padding: '0 10px',
          display: 'flex', flexDirection: 'column', gap: 1,
          overflowY: 'auto', overflowX: 'hidden',
        }}>
          {links.map(({ to, label, icon }) => (
            <NavItem
              key={to} to={to} label={label} icon={icon}
              active={pathname === to}
              collapsed={isCollapsed}
              onClose={isMobile ? () => setMobileOpen(false) : undefined}
            />
          ))}
          <PrivacyButton collapsed={isCollapsed} privacyMode={privacyMode} onToggle={togglePrivacy} />
          <HelpButton collapsed={isCollapsed} onClick={() => setHelpOpen(true)} />
        </nav>

        {helpOpen && <HelpModal role={user?.role} onClose={() => setHelpOpen(false)} />}

        {/* ── User section ── */}
        {user && (
          <>
            <div style={{ height: 1, background: 'var(--fc-sidebar-border)', margin: '8px 13px' }} />

            {isCollapsed ? (
              <div style={{ padding: '10px 0 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div
                  ref={avatarRef}
                  onMouseEnter={() => setAvatarHov(true)}
                  onMouseLeave={() => setAvatarHov(false)}
                  aria-describedby={avatarHov ? 'sidebar-tip-avatar' : undefined}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(26,86,219,0.55)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, cursor: 'default',
                  }}
                >
                  {user.full_name?.[0] ?? 'U'}
                </div>
                <SideTooltip anchorRef={avatarRef} label={`${user.full_name} (${user.role})`} visible={avatarHov} tooltipId="sidebar-tip-avatar" />
                <LogoutIconBtn onClick={handleLogout} />
              </div>
            ) : (
              <div style={{ padding: '10px 13px 18px', flexShrink: 0, animation: 'sidebarFadeIn 0.16s ease 0.13s both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(26,86,219,0.55)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {user.full_name?.[0] ?? 'U'}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.full_name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize', marginTop: 1 }}>{user.role}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 7, padding: '7px 10px', borderRadius: 7,
                    border: '1px solid rgba(255,255,255,0.09)', background: 'transparent',
                    fontSize: 12, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#FCA5A5'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
                >
                  <IcLogout /> ออกจากระบบ
                </button>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  )
}
