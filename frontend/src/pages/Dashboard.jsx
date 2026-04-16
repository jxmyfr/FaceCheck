import { useEffect, useState, useCallback } from "react";

const API = "http://127.0.0.1:8000/api/v1/stats";

// ── Utility ──────────────────────────────────────────────────────────────────
const pct = (val, total) => (total > 0 ? Math.round((val / total) * 100) : 0);
const fmt  = (n) => Number(n).toLocaleString("th-TH");

// ── Sub-components ────────────────────────────────────────────────────────────

/** การ์ดตัวเลขสรุป — ใช้ @container ปรับขนาดตาม parent */
function StatCard({ label, value, sub, dotColor }) {
  return (
    <div className="@container">
      <div className="
        bg-white dark:bg-zinc-900
        border border-black/10 dark:border-white/10
        rounded-xl p-4
        flex flex-col gap-1
      ">
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tracking-wide">
          {label}
        </span>
        {/* ขนาดตัวเลขปรับตามความกว้างของการ์ด (Container Query) */}
        <span className="@xs:text-2xl @sm:text-3xl text-xl font-medium text-zinc-900 dark:text-zinc-100 leading-none">
          {fmt(value)}
        </span>
        {sub && (
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: dotColor }}
            />
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

/** Progress bar รายวิชา */
function SubjectBar({ name, count, max }) {
  const width = max > 0 ? (count / max) * 100 : 0;
  const color =
    width >= 80 ? "#378ADD" : width >= 65 ? "#1D9E75" : width >= 50 ? "#BA7517" : "#D85A30";
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-xs text-zinc-700 dark:text-zinc-300 w-24 truncate shrink-0">
        {name}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width.toFixed(1)}%`, background: color }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-8 text-right">{count}</span>
    </div>
  );
}

/** แท่งกราฟรายวัน */
function DayBar({ label, count, max, isToday }) {
  const height = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-[10px] text-zinc-400">{count > 0 ? count : ""}</span>
      <div className="w-full flex items-end" style={{ height: 80 }}>
        <div
          className="w-full rounded-t transition-all duration-700"
          style={{
            height: `${height}%`,
            minHeight: count > 0 ? 4 : 0,
            background: isToday ? "#378ADD" : count > 0 ? "#85B7EB" : "#D3D1C7",
          }}
        />
      </div>
      <span
        className={`text-[10px] ${isToday ? "text-blue-500 font-medium" : "text-zinc-400"}`}
      >
        {label}
      </span>
    </div>
  );
}

/** สถานะ badge */
function StatusPill({ status }) {
  const map = {
    present: { label: "มาเรียน", cls: "bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
    absent:  { label: "ขาดเรียน", cls: "bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
    late:    { label: "มาสาย",    cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-zinc-100 text-zinc-600" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  );
}

/** Donut อัตราการเข้าเรียน */
function DonutChart({ present, total }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const ratio = total > 0 ? present / total : 0;
  const offset = circ * (1 - ratio);
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
          className="text-zinc-200 dark:text-zinc-700" strokeWidth="8" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#378ADD" strokeWidth="8"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-zinc-800 dark:text-zinc-200">
        {pct(present, total)}%
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [overview, setOverview]   = useState(null);
  const [daily, setDaily]         = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [ov, dl, sb, lg] = await Promise.all([
        fetch(`${API}/overview`).then((r) => r.json()),
        fetch(`${API}/daily?days=7`).then((r) => r.json()),
        fetch(`${API}/by-subject`).then((r) => r.json()),
        fetch(`${API}/logs?limit=10`).then((r) => r.json()),
      ]);
      setOverview(ov);
      setDaily(dl);
      setSubjects(sb);
      setLogs(lg);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError("เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบ Backend");
    } finally {
      setLoading(false);
    }
  }, []);

  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, recent_logs: [] });

    useEffect(() => {
    const fetchStats = async () => {
        try {
        const res = await axios.get('http://localhost:8000/api/v1/stats/summary');
        setStats(res.data);
        } catch (err) { console.error("Fetch error", err); }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // อัปเดตข้อมูลทุก 5 วินาที
    return () => clearInterval(interval);
    },);

  useEffect(() => {
    fetchAll();
    // Auto-refresh ทุก 30 วินาที
    const id = setInterval(fetchAll, 30_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // ── วันในสัปดาห์ (ไทย) ──────────────────────────────────────────────────
  const DAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const today  = new Date().getDay();
  const maxDayCount = Math.max(...daily.map((d) => d.count), 1);
  // ปรับ daily array ให้มีครบ 7 วัน
  const dailyPadded = Array.from({ length: 7 }, (_, i) => {
    const idx = (today - 6 + i + 7) % 7;
    const found = daily[i];
    return { label: DAY_TH[idx], count: found?.count ?? 0, isToday: i === 6 };
  });

  

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchAll}
            className="text-xs px-4 py-1.5 border border-black/10 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const maxSubjectCount = Math.max(...subjects.map((s) => s.attendance_count), 1);

  return (
    <div className="p-5 max-w-6xl mx-auto space-y-4">

      {/* ── Topbar ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            FaceCheck Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            อัปเดตล่าสุด {lastRefresh.toLocaleTimeString("th-TH")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ระบบออนไลน์
          </span>
          <button
            onClick={fetchAll}
            className="text-xs px-3 py-1.5 border border-black/10 dark:border-white/10 rounded-lg
              text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {/* ── Stat Cards — Container Queries grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="นักเรียนทั้งหมด"  value={overview.total_students}        sub="ลงทะเบียนแล้ว"    dotColor="#639922" />
        <StatCard label="รายวิชา"           value={overview.total_subjects}        sub="เปิดภาคเรียนนี้"  dotColor="#378ADD" />
        <StatCard label="เช็คชื่อวันนี้"    value={overview.attendance_today}      sub={`${pct(overview.attendance_today, overview.total_students)}% ของทั้งหมด`} dotColor="#1D9E75" />
        <StatCard label="บันทึกสะสม"        value={overview.total_attendance_logs} sub="ทั้งภาคเรียน"     dotColor="#BA7517" />
      </div>

      {/* ── Bottom Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* ซ้าย: กราฟ + ตาราง (3/5) */}
        <div className="lg:col-span-3 space-y-3">

          {/* กราฟรายวัน */}
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              การเช็คชื่อรายวัน (7 วันล่าสุด)
            </p>
            <div className="flex items-end gap-2" style={{ height: 96 }}>
              {dailyPadded.map((d, i) => (
                <DayBar key={i} {...d} max={maxDayCount} />
              ))}
            </div>
          </div>

          {/* ตารางบันทึกล่าสุด */}
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              บันทึกล่าสุด
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-400 border-b border-black/5 dark:border-white/5">
                    <th className="text-left font-normal pb-2 pr-3">นักเรียน</th>
                    <th className="text-left font-normal pb-2 pr-3">วิชา</th>
                    <th className="text-left font-normal pb-2 pr-3">เวลา</th>
                    <th className="text-left font-normal pb-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-zinc-400">
                        ยังไม่มีบันทึก
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <tr
                        key={i}
                        className="border-b border-black/5 dark:border-white/5 last:border-none"
                      >
                        <td className="py-2 pr-3 text-zinc-800 dark:text-zinc-200">
                          {log.full_name}
                        </td>
                        <td className="py-2 pr-3 text-zinc-500">{log.subject_code}</td>
                        <td className="py-2 pr-3 text-zinc-400">
                          {new Date(log.timestamp).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2">
                          <StatusPill status={log.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ขวา: วิชา + Donut (2/5) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              การเข้าเรียนตามรายวิชา
            </p>
            {subjects.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              subjects.slice(0, 8).map((s) => (
                <SubjectBar
                  key={s.subject_code}
                  name={s.subject_name}
                  count={s.attendance_count}
                  max={maxSubjectCount}
                />
              ))
            )}
          </div>

          {/* Donut */}
          <div className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              อัตราการเข้าเรียนวันนี้
            </p>
            <div className="flex items-center gap-4">
              <DonutChart
                present={overview.attendance_today}
                total={overview.total_students}
              />
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">
                  มาเรียน{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {fmt(overview.attendance_today)}
                  </span>{" "}
                  คน
                </p>
                <p className="text-xs text-zinc-500">
                  ขาดเรียน{" "}
                  <span className="font-medium text-red-500">
                    {fmt(overview.total_students - overview.attendance_today)}
                  </span>{" "}
                  คน
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  จาก {fmt(overview.total_students)} คนทั้งหมด
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

