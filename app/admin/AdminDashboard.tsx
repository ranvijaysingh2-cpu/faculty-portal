"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InactiveUser { email: string; role: string; scope: string; lastSeen: string | null }
interface Stats {
  users: {
    total: number;
    byRole: { faculty: number; center_head: number; region_head: number };
    activeThisWeek: number;
    activeThisMonth: number;
    inactive: InactiveUser[];
  };
  activity: {
    totalPortalOpens: number;
    totalPdfOpens: number;
    dailyActive: { date: string; count: number }[];
    byRegion: { region: string; opens: number }[];
    byCenter: { center: string; opens: number }[];
    byBatch: { batch: string; opens: number }[];
    byHour: { hour: string; count: number }[];
    recentEvents: { timestamp: string; email: string; event_type: string; pdf_name: string | null; region: string | null; batch: string | null }[];
    mostActiveRegion: string;
  };
  lastSync: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}

const Y = "#FFC700";
const TICK = { fill: "rgba(0,0,0,0.35)", fontSize: 10 };
const GRID = "rgba(0,0,0,0.06)";

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

function LightTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      {label && <div style={{ color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: "#111", fontWeight: 600 }}>
          <span style={{ color: p.color }}>{p.name}: </span>{p.value}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [revalidatedAt, setRevalidatedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [builtOk, setBuiltOk] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchStats]);

  async function handleRevalidate() {
    setRevalidating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      const d = await res.json();
      if (d.ok) { setRevalidatedAt(new Date().toLocaleTimeString()); setTimeout(fetchStats, 600); }
      else setActionError(d.error ?? "Revalidation failed.");
    } finally { setRevalidating(false); }
  }

  function copyEmails() {
    if (!stats) return;
    const text = stats.users.inactive.map((u) => u.email).join("\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function exportCSV() {
    if (!stats) return;
    const rows: string[][] = [
      ["Name", "Email", "Batch", "Center", "Region", "Last Seen"],
      ...stats.users.inactive.map((u: InactiveUser & { name?: string; batch?: string; center?: string; region?: string }) => [
        u.name || u.email.split("@")[0], u.email, u.batch || u.scope || "",
        u.center || "", u.region || "",
        u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("en-IN") : "Never",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `inactive-users-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    a.click();
  }

  async function sendReport() {
    setSending(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_reports" }),
      });
      const d = await res.json();
      if (d.ok) { setSentOk(true); setTimeout(() => setSentOk(false), 5000); }
      else setActionError(d.error ?? "Failed to send reports.");
    } finally { setSending(false); }
  }

  async function buildMasterMap() {
    setBuilding(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "build_master_map" }),
      });
      const d = await res.json();
      if (d.ok) { setBuiltOk(true); setTimeout(() => { setBuiltOk(false); fetchStats(); }, 3000); }
      else setActionError(d.error ?? "Failed to build master map.");
    } finally { setBuilding(false); }
  }

  if (loading) return <AdminSpinner />;
  if (error) return <AdminError message={error} />;
  if (!stats) return null;

  const { users, activity } = stats;
  const inactivePct = users.total > 0 ? Math.round((users.inactive.length / users.total) * 100) : 0;
  const pdfEvents = activity.recentEvents.filter((e) => e.event_type === "pdf_open");

  const sidebar = <AdminSidebar onClose={() => setSidebarOpen(false)} />;

  return (
    <div className="h-screen flex bg-[#fafaf8] text-zinc-900 overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-zinc-200 bg-white flex-col">
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside key="drawer"
            initial={{ x: -250 }} animate={{ x: 0 }} exit={{ x: -250 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }}
            className="fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-zinc-200 flex flex-col lg:hidden">
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 shrink-0 border-b border-zinc-200 bg-white px-4 lg:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open menu">
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight">Admin Dashboard</h1>
              {revalidatedAt && (
                <p className="text-[10px] text-zinc-400">Refreshed {revalidatedAt}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <AdminBtn onClick={buildMasterMap} disabled={building}>
              {building ? "Building…" : builtOk ? "✓ Built!" : "Build Map"}
            </AdminBtn>
            <AdminBtn onClick={handleRevalidate} disabled={revalidating} yellow>
              {revalidating ? "Refreshing…" : "⚡ Refresh"}
            </AdminBtn>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5">
          <div className="max-w-5xl mx-auto space-y-4">

            {/* Action error banner */}
            <AnimatePresence>
              {actionError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
                    <p className="text-sm text-red-600">{actionError}</p>
                    <button onClick={() => setActionError(null)}
                      className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none shrink-0 cursor-pointer">
                      ×
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* KPI grid */}
            <section id="kpi" className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Total Users"        value={users.total}               sub={`${users.byRole.faculty}F · ${users.byRole.center_head}CH · ${users.byRole.region_head}RH`} accent="#3B82F6" />
              <KpiCard label="Active This Week"   value={users.activeThisWeek}      sub={`${Math.round((users.activeThisWeek / (users.total || 1)) * 100)}% of total`} accent="#10B981" />
              <KpiCard label="Inactive This Week" value={users.inactive.length}     sub={`${inactivePct}% of total`} accent="#EF4444" />
              <KpiCard label="Active This Month"  value={users.activeThisMonth}     sub="" accent="#8B5CF6" />
              <KpiCard label="Portal Opens"       value={activity.totalPortalOpens} sub="all time" accent="#6366F1" />
              <KpiCard label="PDF Opens"          value={activity.totalPdfOpens}    sub="all time" accent={Y} />
            </section>

            {/* Daily active */}
            <section id="charts">
              <ChartCard title="Daily Active Users — Last 30 Days">
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={activity.dailyActive} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="date" tick={TICK} tickFormatter={(v) => v.slice(5)} interval={isMobile ? 6 : 3} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK} allowDecimals={false} width={28} axisLine={false} tickLine={false} />
                    <Tooltip content={<LightTooltip />} />
                    <Line type="monotone" dataKey="count" stroke={Y} strokeWidth={2.5} dot={false} name="Active Users" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            {/* Region + Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="PDF Opens by Region">
                {activity.byRegion.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={activity.byRegion} margin={{ top: 5, right: 16, left: 0, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                      <XAxis dataKey="region" tick={TICK} angle={-20} textAnchor="end" axisLine={false} tickLine={false} />
                      <YAxis tick={TICK} allowDecimals={false} width={28} axisLine={false} tickLine={false} />
                      <Tooltip content={<LightTooltip />} />
                      <Bar dataKey="opens" fill={Y} radius={[4, 4, 0, 0]} name="Opens" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="PDF Opens by Center (Top 10)">
                {activity.byCenter.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={activity.byCenter} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                      <XAxis type="number" tick={TICK} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="center" tick={TICK} width={isMobile ? 90 : 140}
                        tickFormatter={(v: string) => v.length > (isMobile ? 13 : 22) ? v.slice(0, isMobile ? 11 : 20) + "…" : v}
                        axisLine={false} tickLine={false} />
                      <Tooltip content={<LightTooltip />} />
                      <Bar dataKey="opens" fill="#4ECDC4" radius={[0, 4, 4, 0]} name="Opens" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Batch + Hour */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="PDF Opens by Batch (Top 10)">
                {activity.byBatch.length === 0 ? <ChartEmpty /> : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={activity.byBatch} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                      <XAxis type="number" tick={TICK} allowDecimals={false} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="batch" tick={TICK} width={isMobile ? 90 : 130}
                        tickFormatter={(v: string) => v.length > (isMobile ? 13 : 20) ? v.slice(0, isMobile ? 11 : 18) + "…" : v}
                        axisLine={false} tickLine={false} />
                      <Tooltip content={<LightTooltip />} />
                      <Bar dataKey="opens" fill="#FF6B35" radius={[0, 4, 4, 0]} name="Opens" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Activity by Hour of Day">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={activity.byHour} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="hour" tick={TICK} interval={isMobile ? 5 : 2} axisLine={false} tickLine={false} />
                    <YAxis tick={TICK} allowDecimals={false} width={28} axisLine={false} tickLine={false} />
                    <Tooltip content={<LightTooltip />} />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Inactive users */}
            <section id="users" className="bg-white border border-zinc-100 rounded-[20px] p-4 lg:p-5"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-1">Inactive This Week</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-zinc-900">{users.inactive.length}</span>
                    <span className="text-sm text-zinc-400">{inactivePct}% of total</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminBtn onClick={() => setReportModal(true)}>Preview Report</AdminBtn>
                  <AdminBtn onClick={sendReport} disabled={sending}>
                    {sending ? "Sending…" : sentOk ? "✓ Sent!" : "Send Reports"}
                  </AdminBtn>
                  <AdminBtn onClick={copyEmails}>{copied ? "✓ Copied!" : "Copy Emails"}</AdminBtn>
                  <AdminBtn onClick={exportCSV}>Export CSV</AdminBtn>
                </div>
              </div>

              {users.inactive.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
                  <span className="text-green-600 font-semibold text-sm">All users active this week!</span>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
                  <p className="text-sm text-zinc-600">
                    <span className="font-semibold text-zinc-900">{users.inactive.length} users</span> haven&apos;t accessed the portal this week.
                    Use <span className="font-semibold">Copy Emails</span> or <span className="font-semibold">Export CSV</span> to follow up.
                  </p>
                </div>
              )}
            </section>

            {/* Recent PDF activity */}
            <section id="activity" className="bg-white border border-zinc-100 rounded-[20px] p-4 lg:p-5"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-4">Recent PDF Activity</h2>

              <div className="overflow-x-auto rounded-xl border border-zinc-100">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-zinc-50">
                      {["Time", "Email", "PDF", "Batch"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pdfEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-zinc-300 text-sm">No PDF opens yet</td>
                      </tr>
                    ) : pdfEvents.map((e, i) => (
                      <tr key={i} className={i % 2 === 0 ? "" : "bg-zinc-50/60"}>
                        <td className="px-4 py-3 text-zinc-400 text-[11px] whitespace-nowrap">
                          {new Date(e.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 text-[12px] max-w-[180px] truncate">{e.email}</td>
                        <td className="px-4 py-3 text-zinc-700 font-medium max-w-[200px] truncate">
                          {e.pdf_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 text-[12px] max-w-[120px] truncate">{e.batch ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-center text-[11px] text-zinc-300 pb-2">
              Auto-refreshes every 10 min · Last loaded: {new Date(stats.lastSync).toLocaleTimeString()}
            </p>

          </div>
        </main>
      </div>

      {/* Report Modal */}
      {reportModal && (
        <ReportModal stats={stats} onClose={() => setReportModal(false)}
          onSend={sendReport} sending={sending} sentOk={sentOk} />
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function AdminSidebar({ onClose }: { onClose: () => void }) {
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    onClose();
  }
  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-zinc-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black font-black text-xs flex items-center justify-center shrink-0">
          PW
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight">PW Darpan</h2>
          <p className="text-[10px] text-zinc-500">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-3 px-3 space-y-1 shrink-0">
        <AdminNavItem icon={<OverviewIcon />} label="Overview"    onClick={() => scrollTo("kpi")}      active />
        <AdminNavItem icon={<ChartIcon />}    label="Activity"    onClick={() => scrollTo("charts")} />
        <AdminNavItem icon={<UsersIcon />}    label="Users"       onClick={() => scrollTo("users")} />
        <AdminNavItem icon={<ReportsIcon />}  label="PDF Activity" onClick={() => scrollTo("activity")} />
      </nav>

      {/* Back */}
      <div className="mt-3 pt-3 border-t border-zinc-100 px-3 space-y-1 shrink-0">
        <a href="/"
          className="w-full h-10 rounded-xl flex items-center gap-3 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer">
          <BackIcon />
          <span>Back to Portal</span>
        </a>
      </div>

      {/* Admin badge */}
      <div className="mt-auto pt-3 border-t border-zinc-100 px-3 pb-4 shrink-0">
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 p-2.5 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-yellow-400 text-black flex items-center justify-center font-black text-xs shrink-0">
            A
          </div>
          <div>
            <p className="text-xs font-semibold">Admin</p>
            <p className="text-[10px] text-zinc-500">Full access</p>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminNavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full h-10 rounded-xl flex items-center gap-3 px-3 text-sm transition-colors cursor-pointer ${
        active
          ? "bg-yellow-50 border border-yellow-200 text-zinc-900 font-semibold"
          : "text-zinc-600 hover:bg-zinc-100 font-medium"
      }`}>
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Report Modal ───────────────────────────────────────────────────────────────

function ReportModal({ stats, onClose, onSend, sending, sentOk }: {
  stats: Stats; onClose: () => void; onSend: () => void; sending: boolean; sentOk: boolean;
}) {
  const { users, activity } = stats;
  const week = (() => {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 86400000);
    return `${from.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  const reportText = [
    `PW Faculty Portal — Weekly Report`,
    `Week: ${week}`,
    ``,
    `📊 OVERVIEW`,
    `Total Users     : ${users.total}`,
    `Active This Week: ${users.activeThisWeek} (${Math.round((users.activeThisWeek / (users.total || 1)) * 100)}%)`,
    `Inactive        : ${users.inactive.length} (${Math.round((users.inactive.length / (users.total || 1)) * 100)}%)`,
    `Portal Opens    : ${activity.totalPortalOpens}`,
    `PDF Opens       : ${activity.totalPdfOpens}`,
    ``,
    `🏆 TOP REGIONS`,
    ...activity.byRegion.slice(0, 5).map((r, i) => `${i + 1}. ${r.region}: ${r.opens} opens`),
    ``,
    `🏫 TOP CENTERS`,
    ...activity.byCenter.slice(0, 5).map((c, i) => `${i + 1}. ${c.center}: ${c.opens} opens`),
    ``,
    `📚 TOP BATCHES`,
    ...activity.byBatch.slice(0, 5).map((b, i) => `${i + 1}. ${b.batch}: ${b.opens} opens`),
    ``,
    `⚠️ INACTIVE USERS (${users.inactive.length})`,
    ...users.inactive.map((u) => `• ${u.email}  [${u.role} — ${u.scope}]  (${u.lastSeen ? "Last: " + new Date(u.lastSeen).toLocaleDateString("en-IN") : "Never opened"})`),
    ``,
    `— PW Faculty Portal`,
  ].join("\n");

  const [copied, setCopied] = useState(false);
  function copyReport() {
    navigator.clipboard.writeText(reportText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <div className="bg-white border border-zinc-100 rounded-[20px] w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0">
          <h2 className="text-sm font-bold text-zinc-900">Weekly Report Preview</h2>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-100 transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close">
            ×
          </button>
        </div>
        <pre className="flex-1 overflow-y-auto px-5 py-4 text-[11.5px] leading-relaxed text-zinc-500 font-mono whitespace-pre-wrap bg-zinc-50/50">
          {reportText}
        </pre>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-100 shrink-0">
          <AdminBtn onClick={copyReport}>{copied ? "✓ Copied!" : "Copy"}</AdminBtn>
          <AdminBtn onClick={onSend} yellow disabled={sending}>
            {sending ? "Sending…" : sentOk ? "✓ Sent!" : "Send All Reports"}
          </AdminBtn>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent: string;
}) {
  return (
    <div className="bg-white border border-zinc-100 rounded-[18px] p-4"
      style={{ borderTop: `3px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1.5">{label}</div>
      <div className="text-2xl font-black text-zinc-900 leading-none" style={{ letterSpacing: -0.5 }}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-400 mt-1">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-[20px] p-4 lg:p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function AdminBtn({ children, onClick, disabled, yellow }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; yellow?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
        yellow
          ? "bg-yellow-400 text-black hover:bg-yellow-300"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}>
      {children}
    </button>
  );
}

function ChartEmpty() {
  return <div className="text-center py-8 text-zinc-300 text-sm">No data yet</div>;
}

function AdminSpinner() {
  return (
    <div className="h-screen bg-[#fafaf8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-9 h-9 rounded-full border-[2.5px] border-zinc-200 border-t-yellow-400 mx-auto mb-3"
          style={{ animation: "spin 0.75s linear infinite" }} />
        <p className="text-sm text-zinc-400">Loading dashboard…</p>
      </div>
    </div>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div className="h-screen bg-[#fafaf8] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-13 h-13 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Dashboard Error</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function OverviewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ReportsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
