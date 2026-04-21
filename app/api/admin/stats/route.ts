import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { getMasterMap, getActivityLog } from "@/lib/csv";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
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

  const [masterMap, activityLog] = await Promise.all([getMasterMap(), getActivityLog()]);

  const now      = new Date();
  const weekAgo  = new Date(now.getTime() - 7  * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);

  // Active sets (by unique faculty email)
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

  // Last seen per email
  const lastSeen: Record<string, Date> = {};
  activityLog.forEach((a) => {
    const ts = new Date(a.timestamp);
    const e  = a.email.toLowerCase();
    if (!lastSeen[e] || ts > lastSeen[e]) lastSeen[e] = ts;
  });

  // Unique faculty from master_map (dedupe by email)
  const seenEmails = new Set<string>();
  const uniqueFaculty = masterMap.filter((r) => {
    const e = r.faculty_email.toLowerCase();
    if (seenEmails.has(e)) return false;
    seenEmails.add(e);
    return true;
  });

  // Inactive list (rich — includes center, region from master_map)
  const inactive = uniqueFaculty
    .filter((u) => !activeWeekEmails.has(u.faculty_email.toLowerCase()))
    .map((u) => ({
      email:   u.faculty_email,
      name:    u.faculty_name,
      batch:   u.batch,
      center:  u.center,
      region:  u.region,
      lastSeen: lastSeen[u.faculty_email.toLowerCase()]?.toISOString() ?? null,
    }))
    .sort((a, b) => {
      if (!a.lastSeen && !b.lastSeen) return 0;
      if (!a.lastSeen) return -1;
      if (!b.lastSeen) return 1;
      return new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
    });

  // Region breakdown (from master_map)
  const byRoleMap = { faculty: seenEmails.size, center_head: 0, region_head: 0 };

  // Daily active (last 30 days)
  const dailyMap: Record<string, Set<string>> = {};
  activityLog
    .filter((a) => a.event_type === "portal_open" && new Date(a.timestamp) >= monthAgo)
    .forEach((a) => {
      const date = a.timestamp.slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = new Set();
      dailyMap[date].add(a.email.toLowerCase());
    });

  const dailyActive = Array.from({ length: 30 }, (_, i) => {
    const d    = new Date(now.getTime() - (29 - i) * 86400000);
    const date = d.toISOString().slice(0, 10);
    return { date, count: dailyMap[date]?.size ?? 0 };
  });

  // PDF opens by region / center / batch
  const regionMap: Record<string, number> = {};
  const centerMap: Record<string, number> = {};
  const batchMap:  Record<string, number> = {};
  activityLog
    .filter((a) => a.event_type === "pdf_open")
    .forEach((a) => {
      if (a.region) regionMap[a.region] = (regionMap[a.region] ?? 0) + 1;
      if (a.center) centerMap[a.center] = (centerMap[a.center] ?? 0) + 1;
      if (a.batch)  batchMap[a.batch]   = (batchMap[a.batch]   ?? 0) + 1;
    });

  const byRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1]).map(([region, opens]) => ({ region, opens }));
  const byCenter = Object.entries(centerMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([center, opens]) => ({ center, opens }));
  const byBatch  = Object.entries(batchMap) .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([batch, opens])  => ({ batch,  opens }));

  // Activity by hour
  const hourMap = new Array(24).fill(0);
  activityLog.forEach((a) => { hourMap[new Date(a.timestamp).getHours()]++; });
  const byHour = hourMap.map((count, hour) => ({ hour: `${hour}:00`, count }));

  // Recent events
  const recentEvents = [...activityLog]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
    .map((a) => ({
      timestamp:  a.timestamp,
      email:      a.email,
      event_type: a.event_type,
      pdf_name:   a.pdf_name  || null,
      region:     a.region    || null,
      batch:      a.batch     || null,
      center:     a.center    || null,
    }));

  return NextResponse.json({
    users: {
      total:           uniqueFaculty.length,
      byRole:          byRoleMap,
      activeThisWeek:  activeWeekEmails.size,
      activeThisMonth: activeMonthEmails.size,
      inactive,
    },
    activity: {
      totalPortalOpens: activityLog.filter((a) => a.event_type === "portal_open").length,
      totalPdfOpens:    activityLog.filter((a) => a.event_type === "pdf_open").length,
      dailyActive,
      byRegion,
      byCenter,
      byBatch,
      byHour,
      recentEvents,
      mostActiveRegion: byRegion[0]?.region ?? "—",
    },
    lastSync: new Date().toISOString(),
  });
}
