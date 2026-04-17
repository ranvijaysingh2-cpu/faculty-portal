import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";

export async function POST(req: NextRequest) {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    email = process.env.DEV_EMAIL?.trim().toLowerCase() ?? "dev@pw.live";
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    email = session.user.email;
  }

  const body = await req.json();

  await logEvent({
    email,
    role: body.role ?? "",
    scope_value: body.scope_value ?? "",
    event_type: "pdf_open",
    pdf_name: body.pdf_name,
    batch: body.batch,
    center: body.center,
    region: body.region,
    test_date: body.test_date,
  });

  return NextResponse.json({ ok: true });
}
