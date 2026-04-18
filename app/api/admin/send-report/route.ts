import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

export async function POST() {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    email = process.env.DEV_EMAIL?.trim().toLowerCase() ?? "admin@pw.live";
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    email = session.user.email.toLowerCase();
  }

  if (!isAdmin(email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = process.env.ACTIVITY_LOG_URL;
  if (!url) return NextResponse.json({ error: "ACTIVITY_LOG_URL not set" }, { status: 500 });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_weekly_report",
        _secret: process.env.LOG_SECRET ?? "",
      }),
    });
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reach Apps Script" }, { status: 500 });
  }
}
