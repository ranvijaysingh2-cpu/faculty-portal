import Papa from "papaparse";

export interface PdfRecord {
  region: string;
  center: string;
  batch: string;
  test_date: string;
  pdf_name: string;
  gdrive_link: string;
}

export interface UserAccess {
  email: string;
  role: "faculty" | "center_head" | "region_head";
  scope_value: string;
}

async function fetchCsv<T>(url: string): Promise<T[]> {
  const res = await fetch(url, {
    next: { revalidate: 3600, tags: ["csv"] },
  });
  if (!res.ok) throw new Error(`CSV fetch failed: ${url} (${res.status})`);
  const text = await res.text();
  const result = Papa.parse<T>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return result.data;
}

export async function getPdfIndex(): Promise<PdfRecord[]> {
  return fetchCsv<PdfRecord>(process.env.PDF_INDEX_CSV_URL!);
}

export async function getUserAccess(): Promise<UserAccess[]> {
  return fetchCsv<UserAccess>(process.env.USER_ACCESS_CSV_URL!);
}
