import type { PdfRecord, UserAccess } from "./csv";

export interface AccessResult {
  role: UserAccess["role"];
  scopeValue: string;
  pdfs: PdfRecord[];
}

export function filterPdfs(
  allPdfs: PdfRecord[],
  user: UserAccess
): AccessResult {
  let pdfs: PdfRecord[];

  switch (user.role) {
    case "faculty":
      pdfs = allPdfs.filter(
        (p) => p.batch.trim().toLowerCase() === user.scope_value.trim().toLowerCase()
      );
      break;
    case "center_head":
      pdfs = allPdfs.filter(
        (p) => p.center.trim().toLowerCase() === user.scope_value.trim().toLowerCase()
      );
      break;
    case "region_head":
      pdfs = allPdfs.filter(
        (p) => p.region.trim().toLowerCase() === user.scope_value.trim().toLowerCase()
      );
      break;
    default:
      pdfs = [];
  }

  return { role: user.role, scopeValue: user.scope_value, pdfs };
}

export function unique<T extends PdfRecord, K extends keyof T>(
  pdfs: T[],
  key: K
): string[] {
  return [...new Set(pdfs.map((p) => p[key] as string))].sort();
}
