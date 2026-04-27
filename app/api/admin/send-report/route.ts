import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function callAppsScript(action: string) {
  const url = process.env.ACTIVITY_LOG_URL;
  if (!url) return { error: "ACTIVITY_LOG_URL not set" };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, _secret: process.env.LOG_SECRET ?? "" }),
  });
  return res.json();
}

export async function POST(req: Request) {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    email = process.env.DEV_EMAIL?.trim().toLowerCase() ?? "admin@pw.live";
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    email = session.user.email.toLowerCase();
  }

  if (!isAdmin(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action } = await req.json().catch(() => ({ action: "send_reports" }));

  try {
    const data = await callAppsScript(action === "build_master_map" ? "build_master_map" : "send_reports");
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });
    return NextResponse.json({ ok: true, action });
  } catch {
    return NextResponse.json({ error: "Failed to reach Apps Script" }, { status: 500 });
  }
}
