"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────

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

const Y = "#FFC700";
const TICK = { fill: "rgba(0,0,0,0.35)", fontSize: 10 };
const GRID = "rgba(0,0,0,0.06)";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────

function LightTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      {label && <div style={{ color: "rgba(0,0,0,0.4)", marginBottom: 4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: "#111", fontWeight: 600 }}>
          <span style={{ color: p.color }}>{p.name}: </span>{p.value}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [revalidatedAt, setRevalidatedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [building, setBuilding] = useState(false);
  const [builtOk, setBuiltOk] = useState(false);
  const isMobile = useIsMobile();
  const REFRESH_MS = 10 * 60 * 1000;

  const fetchStats = useCallback(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStats();
    const iv = setInterval(fetchStats, REFRESH_MS);
    return () => clearInterval(iv);
  }, [fetchStats]);

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      const d = await res.json();
      if (d.ok) { setRevalidatedAt(new Date().toLocaleTimeString()); setTimeout(fetchStats, 600); }
    } finally { setRevalidating(false); }
  }

  function copyEmails() {
    if (!stats) return;
    const text = stats.users.inactive.map((u) => u.email).join("\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function exportCSV() {
    if (!stats) return;
    const rows = [
      ["Name", "Email", "Batch", "Center", "Region", "Last Seen"],
      ...stats.users.inactive.map((u: any) => [
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
    try {
      const res = await fetch("/api/admin/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_reports" }),
      });
      const d = await res.json();
      if (d.ok) { setSentOk(true); setTimeout(() => setSentOk(false), 5000); }
      else alert("Error: " + d.error);
    } finally { setSending(false); }
  }

  async function buildMasterMap() {
    setBuilding(true);
    try {
      const res = await fetch("/api/admin/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "build_master_map" }),
      });
      const d = await res.json();
      if (d.ok) { setBuiltOk(true); setTimeout(() => { setBuiltOk(false); fetchStats(); }, 3000); }
      else alert("Error: " + d.error);
    } finally { setBuilding(false); }
  }

  if (loading) return <AdminSpinner />;
  if (error) return <AdminError message={error} />;
  if (!stats) return null;

  const { users, activity } = stats;
  const inactivePct = users.total > 0 ? Math.round((users.inactive.length / users.total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif" }}>

      {/* Grain */}
      <div style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0, opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px" }} />

      {/* ── Header ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "0 20px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: Y, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(255,199,0,0.3)" }}>
              <span style={{ fontWeight: 900, fontSize: 10, color: "#000" }}>PW</span>
            </div>
            {!isMobile && <span style={{ color: "#111", fontWeight: 700, fontSize: 15, letterSpacing: -0.3 }}>Admin Dashboard</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {revalidatedAt && !isMobile && (
              <span style={{ color: "rgba(0,0,0,0.3)", fontSize: 11 }}>Refreshed {revalidatedAt}</span>
            )}
            <LightBtn onClick={buildMasterMap} disabled={building}>
              {building ? "⟳" : builtOk ? "✅" : "🗺️"}
              {!isMobile && (building ? " Building…" : builtOk ? " Built!" : " Build Map")}
            </LightBtn>
            <LightBtn onClick={handleRevalidate} disabled={revalidating} yellow>
              {revalidating ? "⟳" : "⚡"}
              {!isMobile && (revalidating ? " Refreshing…" : " Refresh Now")}
            </LightBtn>
            <a href="/" style={{ color: "rgba(0,0,0,0.4)", fontSize: 12, textDecoration: "none", padding: "6px 10px" }}>← Portal</a>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? "16px 12px 60px" : "28px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* ── KPI Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          <KpiCard label="Total Users" value={users.total} icon="👥" accent="#3B82F6" />
          <KpiCard label="Active This Week" value={users.activeThisWeek} sub={`${Math.round((users.activeThisWeek / (users.total || 1)) * 100)}%`} icon="✅" accent="#10B981" />
          <KpiCard label="Inactive This Week" value={users.inactive.length} sub={`${inactivePct}% of total`} icon="⚠️" accent="#EF4444" />
          <KpiCard label="Active This Month" value={users.activeThisMonth} icon="📅" accent="#8B5CF6" />
          <KpiCard label="Portal Opens" value={activity.totalPortalOpens} sub="all time" icon="🚪" accent="#6366F1" />
          <KpiCard label="PDF Opens" value={activity.totalPdfOpens} sub="all time" icon="📄" accent={Y} />
        </div>

        {/* ── Daily Active ── */}
        <ChartCard title="Daily Active Users — Last 30 Days">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activity.dailyActive} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="date" tick={TICK} tickFormatter={(v) => v.slice(5)} interval={isMobile ? 6 : 3} axisLine={false} tickLine={false} />
              <YAxis tick={TICK} allowDecimals={false} width={28} axisLine={false} tickLine={false} />
              <Tooltip content={<LightTooltip />} />
              <Line type="monotone" dataKey="count" stroke={Y} strokeWidth={2.5} dot={false} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Region + Center ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="PDF Opens by Region">
            {activity.byRegion.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={200}>
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
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activity.byCenter} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis type="number" tick={TICK} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="center" tick={TICK} width={isMobile ? 90 : 140}
                    tickFormatter={(v) => v.length > (isMobile ? 13 : 22) ? v.slice(0, isMobile ? 11 : 20) + "…" : v}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar dataKey="opens" fill="#4ECDC4" radius={[0, 4, 4, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Batch + Hour ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="PDF Opens by Batch (Top 10)">
            {activity.byBatch.length === 0 ? <ChartEmpty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activity.byBatch} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis type="number" tick={TICK} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="batch" tick={TICK} width={isMobile ? 90 : 130}
                    tickFormatter={(v) => v.length > (isMobile ? 13 : 20) ? v.slice(0, isMobile ? 11 : 18) + "…" : v}
                    axisLine={false} tickLine={false} />
                  <Tooltip content={<LightTooltip />} />
                  <Bar dataKey="opens" fill="#FF6B35" radius={[0, 4, 4, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Activity by Hour of Day">
            <ResponsiveContainer width="100%" height={220}>
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

        {/* ── Inactive Users ── */}
        <div style={card.box}>
          <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={card.title}>Inactive This Week</h2>
              <span style={badge.red}>{users.inactive.length}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <LightBtn onClick={() => setReportModal(true)}>{isMobile ? "📋" : "📋 Preview"}</LightBtn>
              <LightBtn onClick={sendReport} disabled={sending}>{sending ? "…" : sentOk ? "✅" : isMobile ? "📧" : "📧 Send Reports"}</LightBtn>
              <LightBtn onClick={copyEmails}>{copied ? "✅" : isMobile ? "Copy" : "Copy Emails"}</LightBtn>
              <LightBtn onClick={exportCSV}>{isMobile ? "CSV" : "Export CSV"}</LightBtn>
            </div>
          </div>

          {users.inactive.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <span style={{ fontSize: 32 }}>🎉</span>
              <p style={{ marginTop: 10, color: "#10B981", fontWeight: 600, fontSize: 14 }}>All users active this week!</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)" }}>
              <table style={tbl.table}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                    {["Name", "Email", "Batch", "Center", "Region", "Last Seen"].map((h) => (
                      <th key={h} style={tbl.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.inactive.map((u: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                      <td style={tbl.td}>{u.name || u.email.split("@")[0]}</td>
                      <td style={{ ...tbl.td, color: "rgba(0,0,0,0.4)", fontSize: 12 }}>{u.email}</td>
                      <td style={tbl.td}>{u.batch || u.scope || "—"}</td>
                      <td style={tbl.td}>{u.center || "—"}</td>
                      <td style={tbl.td}>{u.region || "—"}</td>
                      <td style={{ ...tbl.td, color: u.lastSeen ? "rgba(0,0,0,0.45)" : "#EF4444", fontWeight: u.lastSeen ? 400 : 600 }}>
                        {u.lastSeen ? new Date(u.lastSeen).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never opened"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Activity ── */}
        <div style={card.box}>
          <h2 style={{ ...card.title, marginBottom: 16 }}>Recent Activity</h2>
          <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.07)" }}>
            <table style={tbl.table}>
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                  {["Time", "Email", "Event", "Details"].map((h) => (
                    <th key={h} style={tbl.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.recentEvents.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...tbl.td, textAlign: "center", color: "rgba(0,0,0,0.25)", padding: "32px 0" }}>No activity yet</td></tr>
                ) : activity.recentEvents.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                    <td style={{ ...tbl.td, color: "rgba(0,0,0,0.35)", fontSize: 11, whiteSpace: "nowrap" as const }}>
                      {new Date(e.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ ...tbl.td, fontSize: 12 }}>{e.email}</td>
                    <td style={tbl.td}>
                      {e.event_type === "pdf_open"
                        ? <span style={badge.yellow}>📄 PDF</span>
                        : <span style={badge.blue}>🚪 Login</span>}
                    </td>
                    <td style={{ ...tbl.td, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
                      {e.pdf_name ? `${e.pdf_name}${e.batch ? ` · ${e.batch}` : ""}` : e.region ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(0,0,0,0.25)", marginTop: 8 }}>
          Auto-refreshes every 10 min · Last loaded: {new Date(stats.lastSync).toLocaleTimeString()}
        </p>
      </main>

      {/* ── Report Modal ── */}
      {reportModal && (
        <ReportModal stats={stats} onClose={() => setReportModal(false)} onSend={sendReport} sending={sending} sentOk={sentOk} />
      )}
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────────────────

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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.09)", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>📋 Weekly Report Preview</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "rgba(0,0,0,0.3)", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <pre style={{ flex: 1, overflowY: "auto", padding: "18px 22px", fontSize: 12, lineHeight: 1.75, color: "rgba(0,0,0,0.6)", fontFamily: "monospace", margin: 0, whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.02)" }}>{reportText}</pre>
        <div style={{ padding: "14px 22px", borderTop: "1px solid rgba(0,0,0,0.07)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <LightBtn onClick={copyReport}>{copied ? "✅ Copied!" : "📋 Copy"}</LightBtn>
          <LightBtn onClick={onSend} yellow disabled={sending}>{sending ? "Sending…" : sentOk ? "✅ Sent!" : "📧 Send All Reports"}</LightBtn>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string | number; sub?: string; icon: string; accent: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderTop: `3px solid ${accent}`, borderRadius: 16, padding: "16px 18px", marginBottom: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.35)", textTransform: "uppercase" as const, letterSpacing: 0.6 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111", lineHeight: 1, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(0,0,0,0.3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card.box, marginBottom: 0 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.7)", marginBottom: 16, letterSpacing: -0.2 }}>{title}</h2>
      {children}
    </div>
  );
}

function LightBtn({ children, onClick, disabled, yellow }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; yellow?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: yellow ? Y : "#F5F5F3",
        color: yellow ? "#000" : "rgba(0,0,0,0.65)",
        border: "1px solid " + (yellow ? Y : "rgba(0,0,0,0.1)"),
        borderRadius: 8,
        padding: "7px 14px",
        fontWeight: 600,
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap" as const,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function ChartEmpty() {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(0,0,0,0.25)", fontSize: 13 }}>No data yet</div>;
}

function AdminSpinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "2.5px solid rgba(0,0,0,0.08)", borderTopColor: Y, borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "rgba(0,0,0,0.35)", fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>⚠️</div>
        <h2 style={{ color: "#111", fontWeight: 700, marginBottom: 10 }}>Dashboard Error</h2>
        <p style={{ color: "rgba(0,0,0,0.45)", fontSize: 14, lineHeight: 1.7 }}>{message}</p>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const card = {
  box: {
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.07)",
    borderRadius: 16,
    padding: "20px 22px",
    marginBottom: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, color: "#111", letterSpacing: -0.2 } as React.CSSProperties,
};

const tbl = {
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 } as React.CSSProperties,
  th: { textAlign: "left" as const, padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase" as const, letterSpacing: 0.6, whiteSpace: "nowrap" as const } as React.CSSProperties,
  td: { padding: "11px 14px", borderBottom: "1px solid rgba(0,0,0,0.05)", color: "rgba(0,0,0,0.75)", verticalAlign: "middle" as const } as React.CSSProperties,
};

const badge = {
  red: { background: "rgba(239,68,68,0.1)", color: "#dc2626", fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 700, border: "1px solid rgba(239,68,68,0.2)" } as React.CSSProperties,
  yellow: { background: "rgba(255,199,0,0.12)", color: "#92600A", fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600, border: "1px solid rgba(255,199,0,0.25)", whiteSpace: "nowrap" as const } as React.CSSProperties,
  blue: { background: "rgba(99,102,241,0.1)", color: "#4f46e5", fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600, border: "1px solid rgba(99,102,241,0.2)", whiteSpace: "nowrap" as const } as React.CSSProperties,
};
