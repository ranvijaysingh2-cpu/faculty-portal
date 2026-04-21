import type { PdfRecord, HeadRecord } from "./csv";

export type PortalRole = "faculty" | "center_head" | "region_head";

export interface FacultyPortalUser {
  role: "faculty";
  name: string;
  email: string;
  batches: string[];        // one faculty can teach multiple batches
}

export interface HeadPortalUser {
  role: "center_head" | "region_head";
  name: string;
  email: string;
  scopeValue: string;       // center name or region name
}

export type PortalUser = FacultyPortalUser | HeadPortalUser;

export interface AccessResult {
  role: PortalRole;
  scopeValue: string;       // for display ("Batch A, Batch B" or center/region name)
  batches: string[];        // relevant batch names (for faculty: their batches; heads: all in scope)
  pdfs: PdfRecord[];
}

// ── Faculty: filter by all their batches ─────────────────────────────────────

export function filterPdfsForFaculty(
  allPdfs: PdfRecord[],
  user: FacultyPortalUser
): AccessResult {
  const batchSet = new Set(user.batches.map((b) => b.trim().toLowerCase()));
  const pdfs = allPdfs.filter((p) => batchSet.has(p.batch.trim().toLowerCase()));
  return {
    role: "faculty",
    scopeValue: user.batches.join(", "),
    batches: user.batches,
    pdfs,
  };
}

// ── Head: filter by center or region ─────────────────────────────────────────

export function filterPdfsForHead(
  allPdfs: PdfRecord[],
  user: HeadPortalUser
): AccessResult {
  const scope = user.scopeValue.trim().toLowerCase();
  let pdfs: PdfRecord[];

  if (user.role === "center_head") {
    pdfs = allPdfs.filter((p) => p.center.trim().toLowerCase() === scope);
  } else {
    pdfs = allPdfs.filter((p) => p.region.trim().toLowerCase() === scope);
  }

  const batches = Array.from(new Set(pdfs.map((p) => p.batch))).sort();
  return { role: user.role, scopeValue: user.scopeValue, batches, pdfs };
}

// ── Legacy shim (keeps existing /api/my-pdfs call shape) ─────────────────────

export function filterPdfs(
  allPdfs: PdfRecord[],
  user: HeadRecord
): AccessResult {
  const head: HeadPortalUser = {
    role: user.role,
    name: user.email.split("@")[0],
    email: user.email,
    scopeValue: user.scope_value,
  };
  return filterPdfsForHead(allPdfs, head);
}
