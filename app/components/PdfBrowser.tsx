"use client";

import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import type { PdfRecord } from "@/lib/csv";

type Role = "faculty" | "center_head" | "region_head";

interface ApiResponse {
  role: Role;
  scopeValue: string;
  pdfs: PdfRecord[];
  user: { name: string; email: string; image?: string };
}

// ── helpers ────────────────────────────────────────────────────────────────

function unique(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort();
}

function friendlyPdfName(raw: string): string {
  return raw
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleLabel(role: Role) {
  return role === "faculty"
    ? "Faculty"
    : role === "center_head"
    ? "Center Head"
    : "Region Head";
}

// ── main component ─────────────────────────────────────────────────────────

export default function PdfBrowser() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  // cascading selections
  const [selRegion, setSelRegion] = useState("");
  const [selCenter, setSelCenter] = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [selDate, setSelDate] = useState("");

  useEffect(() => {
    fetch("/api/my-pdfs")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setData(json);
        setFetchedAt(new Date());

        // pre-select single scope values
        if (json.role === "faculty") setSelBatch(json.scopeValue);
        if (json.role === "center_head") setSelCenter(json.scopeValue);
        if (json.role === "region_head") setSelRegion(json.scopeValue);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  // derived option lists
  const regions = useMemo(
    () => (data ? unique(data.pdfs.map((p) => p.region)) : []),
    [data]
  );

  const centers = useMemo(() => {
    if (!data) return [];
    const filtered = selRegion
      ? data.pdfs.filter((p) => p.region === selRegion)
      : data.pdfs;
    return unique(filtered.map((p) => p.center));
  }, [data, selRegion]);

  const batches = useMemo(() => {
    if (!data) return [];
    let filtered = data.pdfs;
    if (selRegion) filtered = filtered.filter((p) => p.region === selRegion);
    if (selCenter) filtered = filtered.filter((p) => p.center === selCenter);
    return unique(filtered.map((p) => p.batch));
  }, [data, selRegion, selCenter]);

  const dates = useMemo(() => {
    if (!data) return [];
    let filtered = data.pdfs;
    if (selRegion) filtered = filtered.filter((p) => p.region === selRegion);
    if (selCenter) filtered = filtered.filter((p) => p.center === selCenter);
    if (selBatch) filtered = filtered.filter((p) => p.batch === selBatch);
    return unique(filtered.map((p) => p.test_date));
  }, [data, selRegion, selCenter, selBatch]);

  const visiblePdfs = useMemo(() => {
    if (!data || !selDate) return [];
    let filtered = data.pdfs;
    if (selRegion) filtered = filtered.filter((p) => p.region === selRegion);
    if (selCenter) filtered = filtered.filter((p) => p.center === selCenter);
    if (selBatch) filtered = filtered.filter((p) => p.batch === selBatch);
    filtered = filtered.filter((p) => p.test_date === selDate);
    return filtered;
  }, [data, selRegion, selCenter, selBatch, selDate]);

  // reset downstream when upstream changes
  function handleRegion(v: string) {
    setSelRegion(v);
    setSelCenter("");
    setSelBatch("");
    setSelDate("");
  }
  function handleCenter(v: string) {
    setSelCenter(v);
    setSelBatch("");
    setSelDate("");
  }
  function handleBatch(v: string) {
    setSelBatch(v);
    setSelDate("");
  }

  function clearFilters() {
    if (!data) return;
    if (data.role === "faculty") { setSelDate(""); return; }
    if (data.role === "center_head") { setSelBatch(""); setSelDate(""); return; }
    setSelRegion(""); setSelCenter(""); setSelBatch(""); setSelDate("");
  }

  function logPdfOpen(pdf: PdfRecord) {
    if (!data) return;
    fetch("/api/log-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: data.role,
        scope_value: data.scopeValue,
        pdf_name: pdf.pdf_name,
        batch: pdf.batch,
        center: pdf.center,
        region: pdf.region,
        test_date: pdf.test_date,
      }),
    }).catch(() => {});
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorScreen message={error} />;
  if (!data) return null;

  const role = data.role;
  const showRegion = role === "region_head";
  const showCenter = role === "region_head" || role === "center_head";

  // determine which dropdown is the "next" active one
  const nextActive =
    showRegion && !selRegion
      ? "region"
      : showCenter && !selCenter
      ? "center"
      : !selBatch
      ? "batch"
      : !selDate
      ? "date"
      : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--pw-bg)" }}>
      {/* ── Header ── */}
      <header style={hdr.bar}>
        <div style={hdr.inner}>
          <div style={hdr.logo}>
            <div style={hdr.logoBox}>
              <span style={hdr.logoText}>PW</span>
            </div>
            <span style={hdr.brand}>Physics Wallah</span>
          </div>
          <div style={hdr.userRow}>
            <div style={{ textAlign: "right" }}>
              <div style={hdr.userName}>{data.user.name}</div>
              <div style={hdr.userEmail}>{data.user.email}</div>
            </div>
            {data.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.user.image} alt="avatar" style={hdr.avatar} referrerPolicy="no-referrer" />
            ) : (
              <div style={hdr.avatarFallback}>{data.user.name?.[0] ?? "?"}</div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={main.wrapper}>
        {/* Welcome strip */}
        <div style={main.welcome}>
          <div>
            <div style={main.welcomeRole}>{roleLabel(role)}</div>
            <div style={main.welcomeScope}>
              Scope: <strong>{data.scopeValue}</strong>
              &nbsp;·&nbsp;
              <span style={{ color: "#888" }}>
                {data.pdfs.length} PDF{data.pdfs.length !== 1 ? "s" : ""} available
              </span>
            </div>
          </div>
        </div>

        {/* Dropdowns card */}
        <div style={card.box}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ ...card.heading, marginBottom: 0 }}>Browse Results</h2>
            {(selBatch || selDate || (showCenter && selCenter) || (showRegion && selRegion && selCenter)) && (
              <button
                onClick={clearFilters}
                style={card.clearBtn}
                onMouseOver={(e) => (e.currentTarget.style.background = "#fff0cc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                ✕ Clear filters
              </button>
            )}
          </div>
          <div style={card.grid}>
            {showRegion && (
              <Dropdown
                label="Region"
                options={regions}
                value={selRegion}
                onChange={handleRegion}
                disabled={false}
                active={nextActive === "region"}
              />
            )}
            {showCenter && (
              <Dropdown
                label="Center"
                options={centers}
                value={selCenter}
                onChange={handleCenter}
                disabled={showRegion && !selRegion}
                active={nextActive === "center"}
              />
            )}
            <Dropdown
              label="Batch"
              options={batches}
              value={selBatch}
              onChange={handleBatch}
              disabled={(showRegion && !selRegion) || (showCenter && !selCenter)}
              active={nextActive === "batch"}
            />
            <Dropdown
              label="Test Date"
              options={dates}
              value={selDate}
              onChange={setSelDate}
              disabled={!selBatch}
              active={nextActive === "date"}
            />
          </div>
        </div>

        {/* PDF cards */}
        {selDate && (
          <div style={pdfGrid.wrapper}>
            {visiblePdfs.length === 0 ? (
              <p style={{ color: "#999", textAlign: "center", padding: 32 }}>
                No PDFs found for this selection.
              </p>
            ) : (
              visiblePdfs.map((pdf, i) => <PdfCard key={i} pdf={pdf} onOpen={logPdfOpen} />)
            )}
          </div>
        )}

        {!selDate && (
          <div style={hint.box}>
            <PdfIcon size={40} color="#ccc" />
            <p style={hint.text}>Select all filters above to view PDFs</p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={ftr.bar}>
        <span>
          {fetchedAt
            ? `Last synced: ${fetchedAt.toLocaleString()}`
            : ""}
        </span>
        <button
          style={ftr.signOut}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Dropdown({
  label,
  options,
  value,
  onChange,
  disabled,
  active,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  active: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={dd.label}>{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...dd.select,
          borderColor: active ? "#FFC700" : disabled ? "#e0dfd8" : "#d0cfc8",
          boxShadow: active ? "0 0 0 2px rgba(255,199,0,0.25)" : "none",
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <option value="">— Select {label} —</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PdfCard({ pdf, onOpen }: { pdf: PdfRecord; onOpen: (pdf: PdfRecord) => void }) {
  return (
    <div style={pdfCard.box}>
      <div style={pdfCard.iconWrap}>
        <PdfIcon size={28} color="#FFC700" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={pdfCard.name}>{friendlyPdfName(pdf.pdf_name)}</div>
        <div style={pdfCard.filename}>{pdf.pdf_name}</div>
        <div style={pdfCard.meta}>
          {pdf.batch} · {pdf.test_date}
        </div>
      </div>
      <a
        href={pdf.gdrive_link}
        target="_blank"
        rel="noopener noreferrer"
        style={pdfCard.btn}
        onClick={() => onOpen(pdf)}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "#e6b200";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "#FFC700";
        }}
      >
        Open ↗
      </a>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--pw-bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={spin.ring} />
        <p style={{ marginTop: 16, color: "#888", fontSize: 14 }}>Loading…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--pw-bg)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ color: "#1A1A1A", marginBottom: 8 }}>Access Error</h2>
        <p style={{ color: "#666", marginBottom: 20 }}>{message}</p>
        <button
          style={{
            padding: "10px 24px",
            background: "#FFC700",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function PdfIcon({ size = 24, color = "#1A1A1A" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const hdr: Record<string, React.CSSProperties> = {
  bar: { background: "#1A1A1A", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" },
  inner: { maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoBox: { width: 34, height: 34, borderRadius: 8, background: "#FFC700", display: "flex", alignItems: "center", justifyContent: "center" },
  logoText: { fontWeight: 900, fontSize: 13, color: "#1A1A1A" },
  brand: { fontWeight: 700, fontSize: 16, color: "#fff" },
  userRow: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontSize: 13, fontWeight: 600, color: "#fff" },
  userEmail: { fontSize: 11, color: "#aaa" },
  avatar: { width: 34, height: 34, borderRadius: "50%", border: "2px solid #FFC700" },
  avatarFallback: { width: 34, height: 34, borderRadius: "50%", background: "#FFC700", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#1A1A1A" },
};

const main: Record<string, React.CSSProperties> = {
  wrapper: { maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" },
  welcome: { background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 24, borderLeft: "4px solid #FFC700", display: "flex", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  welcomeRole: { fontSize: 12, fontWeight: 700, color: "#FFC700", textTransform: "uppercase", letterSpacing: 1 },
  welcomeScope: { fontSize: 15, color: "#1A1A1A", marginTop: 4 },
};

const card: Record<string, React.CSSProperties> = {
  box: { background: "#fff", borderRadius: 14, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 24 },
  heading: { fontSize: 16, fontWeight: 700, color: "#1A1A1A", marginBottom: 18 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  clearBtn: { background: "transparent", border: "1.5px solid #FFC700", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#b38f00", cursor: "pointer", transition: "background 0.15s" },
};

const dd: Record<string, React.CSSProperties> = {
  label: { fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "10px 12px", borderRadius: 8, border: "1.5px solid", fontSize: 14, background: "#fafafa", color: "#1A1A1A", transition: "border-color 0.2s, box-shadow 0.2s", outline: "none", width: "100%" },
};

const pdfGrid: Record<string, React.CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: 12 },
};

const pdfCard: Record<string, React.CSSProperties> = {
  box: { background: "#fff", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "box-shadow 0.15s" },
  iconWrap: { width: 48, height: 48, borderRadius: 10, background: "#FFF9E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  name: { fontSize: 15, fontWeight: 600, color: "#1A1A1A", marginBottom: 2 },
  filename: { fontSize: 12, color: "#888", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { fontSize: 12, color: "#aaa", marginTop: 4 },
  btn: { padding: "8px 18px", background: "#FFC700", color: "#1A1A1A", borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", transition: "background 0.15s", flexShrink: 0 },
};

const hint: Record<string, React.CSSProperties> = {
  box: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 },
  text: { color: "#bbb", fontSize: 14 },
};

const ftr: Record<string, React.CSSProperties> = {
  bar: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #eee", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#888" },
  signOut: { background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, color: "#555", fontWeight: 600 },
};

const spin: Record<string, React.CSSProperties> = {
  ring: { width: 36, height: 36, border: "3px solid #eee", borderTopColor: "#FFC700", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" },
};
