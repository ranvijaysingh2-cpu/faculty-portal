import Papa from "papaparse";

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function fetchCsv<T>(url: string, tag = "csv"): Promise<T[]> {
  const res = await fetch(url, { next: { revalidate: 3600, tags: [tag] } });
  if (!res.ok) throw new Error(`CSV fetch failed: ${url} (${res.status})`);
  const text = await res.text();
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return result.data;
}

// ── pdf_index ─────────────────────────────────────────────────────────────────

export interface PdfRecord {
  region: string;
  center: string;
  batch: string;
  test_date: string;
  pdf_name: string;
  gdrive_link: string;
}

export async function getPdfIndex(): Promise<PdfRecord[]> {
  return fetchCsv<PdfRecord>(process.env.PDF_INDEX_CSV_URL!);
}

// ── faculty tab (replaces old user_access) ────────────────────────────────────
// Columns: faculty_email | faculty_name | batch

export interface FacultyRecord {
  faculty_email: string;
  faculty_name: string;
  batch: string;
}

export async function getFaculty(): Promise<FacultyRecord[]> {
  const url = process.env.FACULTY_CSV_URL;
  if (!url) return [];
  return fetchCsv<FacultyRecord>(url);
}

// ── heads tab (center_head / region_head portal access) ───────────────────────
// Columns: email | role | scope_value

export interface HeadRecord {
  email: string;
  role: "center_head" | "region_head";
  scope_value: string;
}

export async function getHeads(): Promise<HeadRecord[]> {
  const url = process.env.HEADS_CSV_URL;
  if (!url) return [];
  return fetchCsv<HeadRecord>(url);
}

// ── master_map tab (pre-joined, for admin stats + reports) ────────────────────

export interface MasterMapRecord {
  faculty_email: string;
  faculty_name: string;
  batch: string;
  center: string;
  region: string;
  ch_email: string;
  ach_email: string;
  rah_email: string;
  raom_email: string;
  aom_email: string;
}

export async function getMasterMap(): Promise<MasterMapRecord[]> {
  const url = process.env.MASTER_MAP_CSV_URL;
  if (!url) return [];
  return fetchCsv<MasterMapRecord>(url, "master_map");
}

// ── activity_log ──────────────────────────────────────────────────────────────

export interface ActivityRecord {
  timestamp: string;
  email: string;
  role: string;
  scope_value: string;
  event_type: string;
  pdf_name: string;
  batch: string;
  center: string;
  region: string;
  test_date: string;
}

export async function getActivityLog(): Promise<ActivityRecord[]> {
  const url = process.env.ACTIVITY_LOG_CSV_URL;
  if (!url) return [];
  return fetchCsv<ActivityRecord>(url, "activity_log");
}

// ── Legacy alias (keeps old imports working during transition) ────────────────
export type UserAccess = {
  email: string;
  role: "faculty" | "center_head" | "region_head";
  scope_value: string;
};
export async function getUserAccess(): Promise<UserAccess[]> {
  return getHeads();
}
