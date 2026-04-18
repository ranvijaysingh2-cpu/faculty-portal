import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { getUserAccess, getActivityLog } from "@/lib/csv";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

export async function GET() {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    email = process.env.DEV_EMAIL?.trim().toLowerCase() ?? "admin@pw.live";
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    email = session.user.email.toLowerCase();
  }

  if (!isAdmin(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [allUsers, activityLog] = await Promise.all([getUserAccess(), getActivityLog()]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Active sets
  const activeWeekEmails = new Set(
    activityLog
      .filter((a) => a.event_type === "portal_open" && new Date(a.timestamp) >= weekAgo)
      .map((a) => a.email.toLowerCase())
  );
  const activeMonthEmails = new Set(
    activityLog
      .filter((a) => a.event_type === "portal_open" && new Date(a.timestamp) >= monthAgo)
      .map((a) => a.email.toLowerCase())
  );

  // Last seen per user
  const lastSeen: Record<string, Date> = {};
  activityLog.forEach((a) => {
    const ts = new Date(a.timestamp);
    const e = a.email.toLowerCase();
    if (!lastSeen[e] || ts > lastSeen[e]) lastSeen[e] = ts;
  });

  // Role breakdown
  const byRole = { faculty: 0, center_head: 0, region_head: 0 };
  allUsers.forEach((u) => {
    const r = u.role as keyof typeof byRole;
    if (r in byRole) byRole[r]++;
  });

  // Inactive users
  const inactive = allUsers
    .filter((u) => !activeWeekEmails.has(u.email.toLowerCase()))
    .map((u) => ({
      email: u.email,
      role: u.role,
      scope: u.scope_value,
      lastSeen: lastSeen[u.email.toLowerCase()]?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      if (!a.lastSeen) return -1;
      if (!b.lastSeen) return 1;
      return new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
    });

  // Daily active users (last 30 days)
  const dailyMap: Record<string, Set<string>> = {};
  activityLog
    .filter((a) => a.event_type === "portal_open" && new Date(a.timestamp) >= monthAgo)
    .forEach((a) => {
      const date = a.timestamp.slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = new Set();
      dailyMap[date].add(a.email.toLowerCase());
    });

  const dailyActive = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 86400000);
    const date = d.toISOString().slice(0, 10);
    return { date, count: dailyMap[date]?.size ?? 0 };
  });

  // PDF opens by region
  const regionMap: Record<string, number> = {};
  activityLog
    .filter((a) => a.event_type === "pdf_open" && a.region)
    .forEach((a) => { regionMap[a.region] = (regionMap[a.region] ?? 0) + 1; });
  const byRegion = Object.entries(regionMap)
    .sort((a, b) => b[1] - a[1])
    .map(([region, opens]) => ({ region, opens }));

  // PDF opens by batch (top 10)
  const batchMap: Record<string, number> = {};
  activityLog
    .filter((a) => a.event_type === "pdf_open" && a.batch)
    .forEach((a) => { batchMap[a.batch] = (batchMap[a.batch] ?? 0) + 1; });
  const byBatch = Object.entries(batchMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([batch, opens]) => ({ batch, opens }));

  // PDF opens by center (top 10)
  const centerMap: Record<string, number> = {};
  activityLog
    .filter((a) => a.event_type === "pdf_open" && a.center)
    .forEach((a) => { centerMap[a.center] = (centerMap[a.center] ?? 0) + 1; });
  const byCenter = Object.entries(centerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([center, opens]) => ({ center, opens }));

  // Activity by hour
  const hourMap: number[] = new Array(24).fill(0);
  activityLog.forEach((a) => {
    const h = new Date(a.timestamp).getHours();
    hourMap[h]++;
  });
  const byHour = hourMap.map((count, hour) => ({ hour: `${hour}:00`, count }));

  // Recent events (last 20)
  const recentEvents = [...activityLog]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map((a) => ({
      timestamp: a.timestamp,
      email: a.email,
      event_type: a.event_type,
      pdf_name: a.pdf_name || null,
      region: a.region || null,
      batch: a.batch || null,
    }));

  // Most active region
  const mostActiveRegion = byRegion[0]?.region ?? "—";

  return NextResponse.json({
    users: {
      total: allUsers.length,
      byRole,
      activeThisWeek: activeWeekEmails.size,
      activeThisMonth: activeMonthEmails.size,
      inactive,
    },
    activity: {
      totalPortalOpens: activityLog.filter((a) => a.event_type === "portal_open").length,
      totalPdfOpens: activityLog.filter((a) => a.event_type === "pdf_open").length,
      dailyActive,
      byRegion,
      byCenter,
      byBatch,
      byHour,
      recentEvents,
      mostActiveRegion,
    },
    lastSync: new Date().toISOString(),
  });
}
