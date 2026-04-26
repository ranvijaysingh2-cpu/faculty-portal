import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, role, type, message } = body;

    if (!name || !role || !type || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      name: String(name).trim(),
      role: String(role).trim(),
      type: String(type).trim(),
      message: String(message).trim(),
    };

    // Log so admins can see in server/Vercel logs
    console.log("[FEEDBACK]", JSON.stringify(entry));

    // Forward to external log endpoint if configured
    const url = process.env.ACTIVITY_LOG_URL;
    if (url) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          event_type: "feedback",
          _secret: process.env.LOG_SECRET ?? "",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
