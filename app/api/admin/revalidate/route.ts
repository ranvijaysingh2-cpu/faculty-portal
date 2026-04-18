import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

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

  revalidateTag("csv");

  return NextResponse.json({ ok: true, revalidatedAt: new Date().toISOString() });
}
