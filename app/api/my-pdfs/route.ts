import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { NextResponse } from "next/server";
import { getPdfIndex, getFaculty, getHeads } from "@/lib/csv";
import { filterPdfsForFaculty, filterPdfsForHead } from "@/lib/access";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function GET() {
  let email: string;

  if (process.env.NODE_ENV === "development") {
    const devEmail = process.env.DEV_EMAIL?.trim();
    if (!devEmail) {
      return NextResponse.json(
        { error: "Set DEV_EMAIL in .env.local to a valid faculty or head email." },
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

  const [allPdfs, allFaculty, allHeads] = await Promise.all([
    getPdfIndex(),
    getFaculty(),
    getHeads(),
  ]);

  // ── Check faculty tab first ───────────────────────────────────────────────
  const myRows = allFaculty.filter(
    (f) => f.faculty_email.trim().toLowerCase() === email
  );

  if (myRows.length > 0) {
    const batches = Array.from(new Set(myRows.map((r) => r.batch.trim()).filter(Boolean)));
    const name    = myRows[0].faculty_name || email.split("@")[0];

    const result = filterPdfsForFaculty(allPdfs, { role: "faculty", name, email, batches });

    return NextResponse.json({
      role: result.role,
      scopeValue: result.scopeValue,
      batches: result.batches,
      pdfs: result.pdfs,
      isAdmin: isAdmin(email),
      logMeta: { role: "faculty", scope_value: batches.join(",") },
      user: { name, email, image: null },
    });
  }

  // ── Check heads tab ───────────────────────────────────────────────────────
  const headRecord = allHeads.find(
    (h) => h.email.trim().toLowerCase() === email
  );

  if (headRecord) {
    const name   = email.split("@")[0];
    const result = filterPdfsForHead(allPdfs, {
      role: headRecord.role,
      name,
      email,
      scopeValue: headRecord.scope_value,
    });

    return NextResponse.json({
      role: result.role,
      scopeValue: result.scopeValue,
      batches: result.batches,
      pdfs: result.pdfs,
      isAdmin: isAdmin(email),
      logMeta: { role: headRecord.role, scope_value: headRecord.scope_value },
      user: { name, email, image: null },
    });
  }

  // ── No access record found ────────────────────────────────────────────────
  return NextResponse.json(
    { error: `No access record found for "${email}". Contact your admin.` },
    { status: 403 }
  );
}
