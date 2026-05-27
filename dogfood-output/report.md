# FaceCheck QA Report (Full Run)
**URL:** https://face-check-zeta.vercel.app/  
**Date:** 2026-05-14  
**Tester:** /dogfood skill (Playwright MCP · Microsoft Edge)  
**Scope:** Login, all authenticated pages, route protection, responsive, logout

---

## Executive Summary

| | |
|---|---|
| **Audit Score** | 17/20 — Good |
| **Total Issues** | 3 issues (0 P0, 1 P1, 1 P2, 1 P3) |
| **Overall** | ระบบทำงานได้ดี ทุก page โหลดข้อมูลจริงครบ ไม่มี crash |

---

## Pages Tested

| Page | URL | Result | Console Errors |
|---|---|---|---|
| Login | `/login` | ✅ | — |
| Dashboard | `/` | ✅ Data loaded | — |
| Students | `/students` | ✅ Table + filters | — |
| Student Detail | `/students/16153` | ✅ Graceful no-face | 1 (expected 404) |
| Scanner | `/scan` | ✅ Camera permission | — |
| Enrollment | `/enroll` | ✅ Camera permission | — |
| Reports | `/reports` | ✅ | — |
| Admin | `/admin` | ✅ | — |
| QR Checkin | `/checkin` | ✅ Public page | — |
| Logout | button | ✅ → `/login` | — |

---

## Issues

---

### [P1] Unknown routes render layout shell — no 404 or redirect

**Category:** Functional  
**Affected URLs:** `/dashboard`, `/nonexistent-page`, any undefined path  
**Impact:** Unauthenticated users see full sidebar navigation (all route names) with blank main content instead of being redirected to login.

**Root cause** ([frontend/src/pages/App.jsx:49](../frontend/src/pages/App.jsx#L49)):
```jsx
<Route path="/*" element={<Layout />} />
```
`/*` catchall renders Layout for any path. Inner Routes have no `/dashboard` entry → nothing renders, no redirect fires.

**Fix — one line inside Layout's inner `<Routes>`:**
```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

MEDIA:dogfood-output/screenshots/08-unknown-route.png

---

### [P2] Student detail logs 404 console error for students without face

**Category:** UX / Console noise  
**URL:** `/students/:id` when student has no face enrolled  
**Impact:** Console error `GET /enroll/students/{id}/face → 404` on every unregistered student. UI handles it gracefully (shows letter avatar) so no visual bug — but noisy in DevTools and could mask real errors.

**Fix:** Catch the 404 in the fetch call and treat it as "no face" silently, or use HEAD request first.

---

### [P3] Stale credentials persist in login form after failed attempt

**Category:** UX  
**Impact:** Minor — user must manually clear wrong username/password.

**Fix:** After failed login, focus password field or clear both fields.

---

## Positive Findings

| Feature | Result |
|---|---|
| Login — empty fields disables submit button | ✅ |
| Login — password visibility toggle | ✅ |
| Login — error message on bad credentials | ✅ |
| All protected routes redirect to login | ✅ |
| Dashboard — real data: 33 students, 4 subjects, charts | ✅ |
| Students — table, filters, "ไม่มีใบหน้า (29)" filter | ✅ |
| Student detail — graceful empty state (no face, no attendance) | ✅ |
| Scanner — camera permission dialog triggered correctly | ✅ |
| Reports, Admin — load without errors | ✅ |
| Logout — clears session, redirects to login | ✅ |
| Mobile (390px) — hamburger menu, dashboard reflows | ✅ |
| Tablet (768px) — layout correct | ✅ |
| No JS crashes on any page | ✅ |

---

## Summary Table

| # | Issue | Severity | Category |
|---|---|---|---|
| 1 | Unknown routes render bare sidebar (no 404/redirect) | P1 | Functional |
| 2 | Student detail logs 404 for unenrolled students | P2 | Console/UX |
| 3 | Stale credentials in login form after failure | P3 | UX |

---

## Recommended Actions (priority order)

1. **[P1]** Add `<Route path="*" element={<Navigate to="/" replace />} />` in Layout inner Routes
2. **[P2]** Silence expected 404 on face fetch in StudentDetail
3. **[P3]** Clear/refocus login fields on auth failure
