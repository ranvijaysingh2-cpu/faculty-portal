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
const DARK = "#1A1A1A";

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
      ["Email", "Role", "Scope", "Last Seen"],
      ...stats.users.inactive.map((u) => [
        u.email, u.role, u.scope,
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
      const res = await fetch("/api/admin/send-report", { method: "POST" });
      const d = await res.json();
      if (d.ok) { setSentOk(true); setTimeout(() => setSentOk(false), 4000); }
      else alert("Error: " + d.error);
    } finally { setSending(false); }
  }

  if (loading) return <Spinner />;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!stats) return null;

  const { users, activity } = stats;
  const inactivePct = users.total > 0 ? Math.round((users.inactive.length / users.total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4EE", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: DARK, padding: isMobile ? "0 16px" : "0 32px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: Y, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0 }}>PW</div>
          {!isMobile && <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Admin Dashboard</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const, justifyContent: "flex-end" }}>
          {revalidatedAt && !isMobile && <span style={{ color: "#888", fontSize: 11 }}>Refreshed {revalidatedAt}</span>}
          <Btn onClick={handleRevalidate} disabled={revalidating} yellow>
            {revalidating ? "⟳" : "⚡"}{!isMobile && (revalidating ? " Refreshing…" : " Refresh Now")}
          </Btn>
          <a href="/" style={{ color: "#aaa", fontSize: 12, textDecoration: "none", padding: "6px 10px" }}>← Portal</a>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? "16px 12px 60px" : "28px 24px 80px" }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          <KpiCard label="Total Users" value={users.total} icon="👥" color="#3B82F6" />
          <KpiCard label="Active This Week" value={users.activeThisWeek} sub={`${Math.round((users.activeThisWeek / (users.total || 1)) * 100)}%`} icon="✅" color="#10B981" />
          <KpiCard label="Inactive This Week" value={users.inactive.length} sub={`${inactivePct}% of total`} icon="⚠️" color="#EF4444" />
          <KpiCard label="Active This Month" value={users.activeThisMonth} icon="📅" color="#8B5CF6" />
          <KpiCard label="Portal Opens" value={activity.totalPortalOpens} sub="all time" icon="🚪" color="#6366F1" />
          <KpiCard label="PDF Opens" value={activity.totalPdfOpens} sub="all time" icon="📄" color="#F59E0B" />
        </div>

        {/* ── Daily Active Users ── */}
        <ChartCard title="Daily Active Users — Last 30 Days">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activity.dailyActive} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} interval={isMobile ? 6 : 3} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
              <Tooltip labelFormatter={(v) => `Date: ${v}`} />
              <Line type="monotone" dataKey="count" stroke={Y} strokeWidth={2.5} dot={false} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Region + Center ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="PDF Opens by Region">
            {activity.byRegion.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activity.byRegion} margin={{ top: 5, right: 16, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="opens" fill={Y} radius={[4, 4, 0, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="PDF Opens by Center (Top 10)">
            {activity.byCenter.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activity.byCenter} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="center" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="opens" fill="#4ECDC4" radius={[0, 4, 4, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Batch + Hour ── */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <ChartCard title="PDF Opens by Batch (Top 10)">
            {activity.byBatch.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activity.byBatch} layout="vertical" margin={{ top: 5, right: 16, left: 4, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="batch" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="opens" fill="#FF6B35" radius={[0, 4, 4, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Activity by Hour of Day">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activity.byHour} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={isMobile ? 5 : 2} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Inactive Users Table ── */}
        <div style={T.box}>
          <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <h2 style={T.heading}>
              ⚠️ Inactive This Week
              <span style={{ background: "#FEE2E2", color: "#EF4444", fontSize: 11, padding: "2px 8px", borderRadius: 20, marginLeft: 8 }}>{users.inactive.length}</span>
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <Btn onClick={() => setReportModal(true)}>📋 Preview Report</Btn>
              <Btn onClick={sendReport} disabled={sending}>{sending ? "Sending…" : sentOk ? "✅ Sent!" : "📧 Send to Boss"}</Btn>
              <Btn onClick={copyEmails}>{copied ? "✅ Copied!" : "📋 Copy Emails"}</Btn>
              <Btn onClick={exportCSV}>⬇️ Export CSV</Btn>
            </div>
          </div>

          {users.inactive.length === 0 ? (
            <p style={{ color: "#10B981", textAlign: "center", padding: 24, fontWeight: 600 }}>🎉 All users active this week!</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={T.table}>
                <thead><tr>{["Email", "Role", "Scope", "Last Seen"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {users.inactive.map((u, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                      <td style={T.td}>{u.email}</td>
                      <td style={T.td}><RoleBadge role={u.role} /></td>
                      <td style={T.td}>{u.scope}</td>
                      <td style={{ ...T.td, color: u.lastSeen ? "#555" : "#EF4444" }}>
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
        <div style={T.box}>
          <h2 style={{ ...T.heading, marginBottom: 14 }}>🕒 Recent Activity</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={T.table}>
              <thead><tr>{["Time", "Email", "Event", "Details"].map((h) => <th key={h} style={T.th}>{h}</th>)}</tr></thead>
              <tbody>
                {activity.recentEvents.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...T.td, textAlign: "center", color: "#aaa" }}>No activity yet</td></tr>
                ) : activity.recentEvents.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <td style={{ ...T.td, color: "#888", fontSize: 11, whiteSpace: "nowrap" as const }}>
                      {new Date(e.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ ...T.td, fontSize: 12 }}>{e.email}</td>
                    <td style={T.td}>
                      <span style={{ background: e.event_type === "pdf_open" ? "#FFF9E0" : "#EFF6FF", color: e.event_type === "pdf_open" ? "#b38f00" : "#3B82F6", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600, whiteSpace: "nowrap" as const }}>
                        {e.event_type === "pdf_open" ? "📄 PDF" : "🚪 Login"}
                      </span>
                    </td>
                    <td style={{ ...T.td, fontSize: 12, color: "#555" }}>
                      {e.pdf_name ? `${e.pdf_name}${e.batch ? ` · ${e.batch}` : ""}` : e.region ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 8 }}>
          Auto-refreshes every 10 min · Last loaded: {new Date(stats.lastSync).toLocaleTimeString()}
        </p>
      </main>

      {/* ── Weekly Report Modal ── */}
      {reportModal && <ReportModal stats={stats} onClose={() => setReportModal(false)} onSend={sendReport} sending={sending} sentOk={sentOk} />}
    </div>
  );
}

// ── Weekly Report Modal ───────────────────────────────────────────────────────

function ReportModal({ stats, onClose, onSend, sending, sentOk }: {
  stats: Stats;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  sentOk: boolean;
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: DARK }}>📋 Weekly Report Preview</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>
        <pre style={{ flex: 1, overflowY: "auto", padding: "16px 20px", fontSize: 12, lineHeight: 1.7, color: "#333", fontFamily: "monospace", margin: 0, whiteSpace: "pre-wrap" as const }}>
          {reportText}
        </pre>
        <div style={{ padding: "14px 20px", borderTop: "1px solid #eee", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn onClick={copyReport}>{copied ? "✅ Copied!" : "📋 Copy"}</Btn>
          <Btn onClick={onSend} yellow disabled={sending}>{sending ? "Sending…" : sentOk ? "✅ Sent!" : "📧 Send to Boss"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Small Components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: string; color: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: DARK, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 14 }}>{title}</h2>
      {children}
    </div>
  );
}

function Btn({ children, onClick, disabled, yellow }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; yellow?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: yellow ? Y : "#f5f4ee", color: yellow ? DARK : "#333", border: "1.5px solid " + (yellow ? Y : "#e0dfd8"), borderRadius: 8, padding: "7px 14px", fontWeight: 600, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, whiteSpace: "nowrap" as const }}
    >
      {children}
    </button>
  );
}

function RoleBadge({ role }: { role: string }) {
  const m: Record<string, [string, string, string]> = {
    faculty: ["Faculty", "#EFF6FF", "#3B82F6"],
    center_head: ["Center Head", "#F0FDF4", "#10B981"],
    region_head: ["Region Head", "#FFF9E0", "#b38f00"],
  };
  const [label, bg, color] = m[role] ?? [role, "#f0f0f0", "#555"];
  return <span style={{ background: bg, color, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{label}</span>;
}

function Empty() {
  return <div style={{ textAlign: "center", padding: "32px 0", color: "#ccc", fontSize: 13 }}>No data yet</div>;
}

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F4EE" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #eee", borderTopColor: Y, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#888", fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );
}

const T = {
  box: { background: "#fff", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 } as React.CSSProperties,
  heading: { fontSize: 14, fontWeight: 700, color: DARK } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "8px 10px", borderBottom: "2px solid #f0efe8", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5, whiteSpace: "nowrap" as const },
  td: { padding: "9px 10px", borderBottom: "1px solid #f5f4ee", color: DARK, verticalAlign: "middle" as const } as React.CSSProperties,
};
