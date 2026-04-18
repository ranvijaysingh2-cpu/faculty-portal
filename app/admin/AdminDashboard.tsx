"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
    byBatch: { batch: string; opens: number }[];
    topPdfs: { name: string; opens: number }[];
    byHour: { hour: string; count: number }[];
    recentEvents: { timestamp: string; email: string; event_type: string; pdf_name: string | null; region: string | null; batch: string | null }[];
    mostActiveRegion: string;
  };
  lastSync: string;
}

const PW_YELLOW = "#FFC700";
const PW_DARK = "#1A1A1A";
const PIE_COLORS = ["#FFC700", "#FF6B35", "#4ECDC4"];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [revalidatedAt, setRevalidatedAt] = useState<string | null>(null);

  const fetchStats = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Failed to load stats."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleRevalidate() {
    setRevalidating(true);
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      const d = await res.json();
      if (d.ok) {
        setRevalidatedAt(new Date().toLocaleTimeString());
        setTimeout(fetchStats, 500);
      }
    } finally {
      setRevalidating(false);
    }
  }

  if (loading) return <LoadingScreen />;
  if (error) return <div style={{ padding: 40, color: "red" }}>{error}</div>;
  if (!stats) return null;

  const { users, activity } = stats;
  const inactiveCount = users.inactive.length;
  const inactivePct = users.total > 0 ? Math.round((inactiveCount / users.total) * 100) : 0;

  const roleData = [
    { name: "Faculty", value: users.byRole.faculty },
    { name: "Center Head", value: users.byRole.center_head },
    { name: "Region Head", value: users.byRole.region_head },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F4EE", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: PW_DARK, padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: PW_YELLOW, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12 }}>PW</div>
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>Admin Dashboard</span>
          <span style={{ background: "#333", color: "#aaa", fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>Super Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {revalidatedAt && <span style={{ color: "#aaa", fontSize: 12 }}>Cache refreshed at {revalidatedAt}</span>}
          <button
            onClick={handleRevalidate}
            disabled={revalidating}
            style={{ background: revalidating ? "#555" : PW_YELLOW, color: PW_DARK, border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 13, cursor: revalidating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            {revalidating ? "⟳ Refreshing…" : "⚡ Refresh Data Now"}
          </button>
          <a href="/" style={{ color: "#aaa", fontSize: 13, textDecoration: "none" }}>← Portal</a>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 28 }}>
          <KpiCard title="Total Users" value={users.total} icon="👥" color="#3B82F6" />
          <KpiCard title="Active This Week" value={users.activeThisWeek} sub={`${Math.round((users.activeThisWeek / users.total) * 100)}% of total`} icon="✅" color="#10B981" />
          <KpiCard title="Inactive This Week" value={inactiveCount} sub={`${inactivePct}% of total`} icon="⚠️" color="#EF4444" />
          <KpiCard title="Portal Opens" value={activity.totalPortalOpens} sub="all time" icon="🚪" color="#8B5CF6" />
          <KpiCard title="PDF Opens" value={activity.totalPdfOpens} sub="all time" icon="📄" color="#F59E0B" />
          <KpiCard title="Most Active Region" value={activity.mostActiveRegion} icon="🏆" color="#EC4899" small />
        </div>

        {/* ── Daily Active Users ── */}
        <ChartCard title="Daily Active Users — Last 30 Days">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={activity.dailyActive} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(v) => `Date: ${v}`} />
              <Line type="monotone" dataKey="count" stroke={PW_YELLOW} strokeWidth={2.5} dot={false} name="Active Users" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* ── Row: Region + Role ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 20 }}>
          <ChartCard title="PDF Opens by Region">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={activity.byRegion} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                <XAxis dataKey="region" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="opens" fill={PW_YELLOW} radius={[4, 4, 0, 0]} name="PDF Opens" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="User Role Breakdown">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {roleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Row: Top PDFs + Hour Activity ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <ChartCard title="Top 10 Most Opened PDFs">
            {activity.topPdfs.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={activity.topPdfs} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="opens" fill="#FF6B35" radius={[0, 4, 4, 0]} name="Opens" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Activity by Hour of Day">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={activity.byHour} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#4ECDC4" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── Top Batches ── */}
        {activity.byBatch.length > 0 && (
          <ChartCard title="PDF Opens by Batch (Top 10)">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activity.byBatch} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" />
                <XAxis dataKey="batch" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="opens" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Opens" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* ── Inactive Users Table ── */}
        <div style={tableCard.box}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={tableCard.heading}>
              ⚠️ Inactive Users This Week
              <span style={{ background: "#FEE2E2", color: "#EF4444", fontSize: 12, padding: "2px 10px", borderRadius: 20, marginLeft: 10 }}>{inactiveCount}</span>
            </h2>
          </div>
          {inactiveCount === 0 ? (
            <p style={{ color: "#10B981", textAlign: "center", padding: 24, fontWeight: 600 }}>🎉 All users active this week!</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={tableCard.table}>
                <thead>
                  <tr>{["Email", "Role", "Scope", "Last Seen"].map((h) => <th key={h} style={tableCard.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.inactive.map((u, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                      <td style={tableCard.td}>{u.email}</td>
                      <td style={tableCard.td}><RoleBadge role={u.role} /></td>
                      <td style={tableCard.td}>{u.scope}</td>
                      <td style={{ ...tableCard.td, color: u.lastSeen ? "#555" : "#EF4444" }}>
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
        <div style={tableCard.box}>
          <h2 style={{ ...tableCard.heading, marginBottom: 16 }}>🕒 Recent Activity</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={tableCard.table}>
              <thead>
                <tr>{["Time", "Email", "Event", "Details"].map((h) => <th key={h} style={tableCard.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {activity.recentEvents.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...tableCard.td, textAlign: "center", color: "#aaa" }}>No activity logged yet</td></tr>
                ) : activity.recentEvents.map((e, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafaf8" }}>
                    <td style={{ ...tableCard.td, color: "#888", fontSize: 12, whiteSpace: "nowrap" }}>
                      {new Date(e.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={tableCard.td}>{e.email}</td>
                    <td style={tableCard.td}>
                      <span style={{ background: e.event_type === "pdf_open" ? "#FFF9E0" : "#EFF6FF", color: e.event_type === "pdf_open" ? "#b38f00" : "#3B82F6", fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>
                        {e.event_type === "pdf_open" ? "📄 PDF Open" : "🚪 Portal Open"}
                      </span>
                    </td>
                    <td style={{ ...tableCard.td, fontSize: 12, color: "#555" }}>
                      {e.pdf_name ? `${e.pdf_name}${e.batch ? ` · ${e.batch}` : ""}` : e.region ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon, color, small }: {
  title: string; value: string | number; sub?: string; icon: string; color: string; small?: boolean;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: small ? 18 : 28, fontWeight: 800, color: "#1A1A1A", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A", marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    faculty: { label: "Faculty", bg: "#EFF6FF", color: "#3B82F6" },
    center_head: { label: "Center Head", bg: "#F0FDF4", color: "#10B981" },
    region_head: { label: "Region Head", bg: "#FFF9E0", color: "#b38f00" },
  };
  const s = map[role] ?? { label: role, bg: "#f0f0f0", color: "#555" };
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{s.label}</span>;
}

function EmptyState() {
  return <div style={{ textAlign: "center", padding: 40, color: "#ccc", fontSize: 14 }}>No data yet</div>;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F4EE" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #eee", borderTopColor: PW_YELLOW, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#888", fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );
}

const tableCard = {
  box: { background: "#fff", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 } as React.CSSProperties,
  heading: { fontSize: 14, fontWeight: 700, color: "#1A1A1A" } as React.CSSProperties,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "8px 12px", borderBottom: "2px solid #f0efe8", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f5f4ee", color: "#1A1A1A", verticalAlign: "middle" as const } as React.CSSProperties,
};
