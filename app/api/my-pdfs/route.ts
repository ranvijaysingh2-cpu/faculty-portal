import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { getPdfIndex, getUserAccess } from "@/lib/csv";
import { filterPdfs } from "@/lib/access";
import { logEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    const devEmail = process.env.DEV_EMAIL?.trim();
    if (!devEmail) {
      return NextResponse.json(
        { error: "Set DEV_EMAIL in .env.local to a valid email from your user_access sheet." },
        { status: 400 }
      );
    }
    email = devEmail.toLowerCase();
  } else {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    email = session.user.email.trim().toLowerCase();
  }

  const [allPdfs, allUsers] = await Promise.all([getPdfIndex(), getUserAccess()]);

  const userRecord = allUsers.find(
    (u) => u.email.trim().toLowerCase() === email
  );

  if (!userRecord) {
    return NextResponse.json(
      { error: `No access record found for "${email}". Check your user_access sheet.` },
      { status: 403 }
    );
  }

  const result = filterPdfs(allPdfs, userRecord);

  await logEvent({
    email,
    role: userRecord.role,
    scope_value: userRecord.scope_value,
    event_type: "portal_open",
  });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  const isAdmin = adminEmails.includes(email);

  return NextResponse.json({
    role: result.role,
    scopeValue: result.scopeValue,
    pdfs: result.pdfs,
    isAdmin,
    user: {
      name: email.split("@")[0],
      email,
      image: null,
    },
  });
}
