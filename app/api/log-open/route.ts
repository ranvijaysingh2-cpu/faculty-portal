import { NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { role, scope_value, email } = await req.json();
    if (!email) return NextResponse.json({ ok: false });
    await logEvent({ email, role, scope_value, event_type: "portal_open" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
