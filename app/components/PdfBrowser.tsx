"use client";

import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import type { PdfRecord } from "@/lib/csv";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

type Role = "faculty" | "center_head" | "region_head";

interface ApiResponse {
  role: Role;
  scopeValue: string;
  batches: string[];
  pdfs: PdfRecord[];
  isAdmin: boolean;
  logMeta?: { role: string; scope_value: string };
  user: { name: string; email: string; image?: string };
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function friendlyPdfName(raw: string): string {
  return raw
    .replace(/\.pdf$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function roleLabel(role: Role) {
  return role === "faculty" ? "Faculty" : role === "center_head" ? "Center Head" : "Region Head";
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Main component ──────────────────────────────────────────────────────────

export default function PdfBrowser() {
  const isMobile = useIsMobile();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [search, setSearch] = useState("");

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

        if (!sessionStorage.getItem("pw_logged") && json.logMeta) {
          sessionStorage.setItem("pw_logged", "1");
          fetch("/api/log-open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...json.logMeta, email: json.user.email }),
          }).catch(() => {});
        }

        if (json.role === "faculty" && json.batches?.length === 1) setSelBatch(json.batches[0]);
        if (json.role === "center_head") setSelCenter(json.scopeValue);
        if (json.role === "region_head") setSelRegion(json.scopeValue);
      })
      .catch(() => setError("Failed to load data. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(() => (data ? unique(data.pdfs.map((p) => p.region)) : []), [data]);

  const centers = useMemo(() => {
    if (!data) return [];
    const src = selRegion ? data.pdfs.filter((p) => p.region === selRegion) : data.pdfs;
    return unique(src.map((p) => p.center));
  }, [data, selRegion]);

  const batches = useMemo(() => {
    if (!data) return [];
    let f = data.pdfs;
    if (selRegion) f = f.filter((p) => p.region === selRegion);
    if (selCenter) f = f.filter((p) => p.center === selCenter);
    return unique(f.map((p) => p.batch));
  }, [data, selRegion, selCenter]);

  const dates = useMemo(() => {
    if (!data) return [];
    let f = data.pdfs;
    if (selRegion) f = f.filter((p) => p.region === selRegion);
    if (selCenter) f = f.filter((p) => p.center === selCenter);
    if (selBatch) f = f.filter((p) => p.batch === selBatch);
    return unique(f.map((p) => p.test_date));
  }, [data, selRegion, selCenter, selBatch]);

  const visiblePdfs = useMemo(() => {
    if (!data) return [];
    if (!selDate && !search) return [];
    let f = data.pdfs;
    if (selRegion) f = f.filter((p) => p.region === selRegion);
    if (selCenter) f = f.filter((p) => p.center === selCenter);
    if (selBatch) f = f.filter((p) => p.batch === selBatch);
    if (selDate) f = f.filter((p) => p.test_date === selDate);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter((p) => p.pdf_name.toLowerCase().includes(q) || friendlyPdfName(p.pdf_name).toLowerCase().includes(q));
    }
    return f;
  }, [data, selRegion, selCenter, selBatch, selDate, search]);

  function handleRegion(v: string) { setSelRegion(v); setSelCenter(""); setSelBatch(""); setSelDate(""); }
  function handleCenter(v: string) { setSelCenter(v); setSelBatch(""); setSelDate(""); }
  function handleBatch(v: string) { setSelBatch(v); setSelDate(""); }

  function clearFilters() {
    setSearch("");
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
        role: data.role, scope_value: data.scopeValue,
        pdf_name: pdf.pdf_name, batch: pdf.batch,
        center: pdf.center, region: pdf.region, test_date: pdf.test_date,
      }),
    }).catch(() => {});
  }

  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorScreen message={error} />;
  if (!data) return null;

  const role = data.role;
  const showRegion = role === "region_head";
  const showCenter = role === "region_head" || role === "center_head";
  const hasFilters = !!(selBatch || selDate || search || (showCenter && selCenter) || (showRegion && selRegion));
  const showResults = selDate || search.length > 0;

  const latestDate = dates[dates.length - 1] || "—";
  const activeBatch = data.batches?.[0] || data.scopeValue || "—";

  const nextActive =
    showRegion && !selRegion ? "region"
    : showCenter && !selCenter ? "center"
    : !selBatch ? "batch"
    : !selDate ? "date"
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", paddingBottom: 80 }}>

      {/* ── Navbar ── */}
      <header style={nav.bar}>
        <div style={nav.inner}>
          <div style={nav.left}>
            <div style={nav.logoBox}>
              <span style={nav.logoText}>PW</span>
            </div>
            {!isMobile && <span style={nav.brand}>Faculty Portal</span>}
          </div>

          <div style={nav.right}>
            {data.isAdmin && (
              <a href="/admin" style={nav.adminBadge}>ADMIN</a>
            )}
            {!isMobile && (
              <div style={nav.userBlock}>
                <div style={nav.userName}>{data.user.name}</div>
                <div style={nav.userRole}>{roleLabel(role)}</div>
              </div>
            )}
            {data.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.user.image} alt="avatar" style={nav.avatar} referrerPolicy="no-referrer" />
            ) : (
              <div style={nav.avatarFallback}>{data.user.name?.[0] ?? "?"}</div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={pg.wrapper}>

        {/* Hero */}
        <div style={hero.section} className="animate-in">
          <div style={hero.text}>
            <h1 style={hero.greeting}>
              Welcome back, {data.user.name.split(" ")[0]} <span style={{ fontStyle: "normal" }}>👋</span>
            </h1>
            <p style={hero.sub}>We&apos;ve synced the latest result PDFs.</p>
            {fetchedAt && (
              <div style={hero.syncRow}>
                <SyncIcon size={13} />
                <span>Last Synced: {fmt(fetchedAt)}</span>
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div style={hero.statsRow}>
            <StatCard
              icon={<DocIcon />}
              label="Total PDFs"
              value={String(data.pdfs.length)}
            />
            <StatCard
              icon={<BatchIconSvg />}
              label="Active Batch"
              value={activeBatch}
              compact
            />
            <StatCard
              icon={<SyncIcon size={18} />}
              label="Latest Upload"
              value={latestDate}
              compact
            />
          </div>
        </div>

        {/* Filter panel */}
        <div style={filter.box} className="animate-in delay-1">
          <div style={filter.header}>
            <h2 style={filter.title}>Browse Results</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {hasFilters && (
                <button style={filter.clearBtn} onClick={clearFilters}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,199,0,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#FFC700"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}>
                  Clear Filters
                </button>
              )}
              <button style={filter.applyBtn}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#D4A000"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#FFC700"; }}>
                Apply Filters
              </button>
            </div>
          </div>

          {/* Dropdowns */}
          <div style={filter.grid}>
            {showRegion && (
              <FilterDropdown label="Region" options={regions} value={selRegion} onChange={handleRegion} disabled={false} active={nextActive === "region"} />
            )}
            {showCenter && (
              <FilterDropdown label="Center" options={centers} value={selCenter} onChange={handleCenter} disabled={showRegion && !selRegion} active={nextActive === "center"} />
            )}
            <FilterDropdown label="Batch" options={batches} value={selBatch} onChange={handleBatch} disabled={(showRegion && !selRegion) || (showCenter && !selCenter)} active={nextActive === "batch"} />
            <FilterDropdown label="Test Date" options={dates} value={selDate} onChange={setSelDate} disabled={!selBatch} active={nextActive === "date"} />
          </div>

          {/* Search */}
          <div style={filter.searchWrap}>
            <span style={filter.searchIcon}><SearchIcon /></span>
            <input
              type="text"
              placeholder="Search by PDF name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={filter.searchInput}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,199,0,0.45)";
                (e.currentTarget as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(255,199,0,0.08)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        {/* PDF results */}
        {showResults ? (
          <div className="animate-in delay-2">
            {visiblePdfs.length === 0 ? (
              <div style={empty.box}>
                <div style={empty.iconWrap}><DocIcon size={32} dim /></div>
                <p style={empty.msg}>No PDFs found for this selection.</p>
                <p style={empty.sub}>Try adjusting your filters or search query.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 4, paddingLeft: 2 }}>
                  {visiblePdfs.length} result{visiblePdfs.length !== 1 ? "s" : ""}
                </div>
                {visiblePdfs.map((pdf, i) => <PdfCard key={i} pdf={pdf} onOpen={logPdfOpen} />)}
              </div>
            )}
          </div>
        ) : (
          <div style={empty.box} className="animate-in delay-2">
            <div style={empty.illustrationWrap}>
              <div style={empty.illustrationCard}>
                <DocIcon size={40} dim />
              </div>
              <div style={empty.illustrationCard2}>
                <DocIcon size={28} dim />
              </div>
              <div style={empty.illustrationCard3}>
                <DocIcon size={22} dim />
              </div>
            </div>
            <p style={empty.msg}>Select filters above to find reports</p>
            <p style={empty.sub}>Choose your batch and test date to view available PDFs</p>
            <button style={empty.cta}
              onClick={() => {
                if (data && data.pdfs.length > 0 && !selDate) {
                  const d = document.querySelector("select");
                  d?.focus();
                }
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}>
              Show all PDFs
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={ftr.bar}>
        <div style={ftr.left}>
          <span style={ftr.secBadge}>
            <LockIcon />
            Secure Internal Portal
          </span>
          {fetchedAt && !isMobile && (
            <span style={ftr.copy}>
              © 2026 Physics Wallah. &nbsp;Last synced {fetchedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button style={ftr.signOut}
          onClick={() => signOut({ callbackUrl: "/" })}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,70,70,0.12)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,70,70,0.35)";
            (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
          }}>
          Sign out
        </button>
      </footer>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, label, value, compact }: { icon: React.ReactNode; label: string; value: string; compact?: boolean }) {
  return (
    <div style={statCard.box}>
      <div style={statCard.icon}>{icon}</div>
      <div style={statCard.label}>{label}</div>
      <div style={{ ...statCard.value, fontSize: compact ? 13 : 22, letterSpacing: compact ? -0.2 : -0.8 }}>{value}</div>
    </div>
  );
}

function FilterDropdown({ label, options, value, onChange, disabled, active }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; disabled: boolean; active: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={filter.label}>{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...filter.select,
          borderColor: active ? "rgba(255,199,0,0.5)" : disabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
          boxShadow: active ? "0 0 0 3px rgba(255,199,0,0.1)" : "none",
          opacity: disabled ? 0.35 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <option value="">— {label} —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function PdfCard({ pdf, onOpen }: { pdf: PdfRecord; onOpen: (pdf: PdfRecord) => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      style={{ ...pdfCard.box, ...(hov ? pdfCard.boxHov : {}) }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={pdfCard.iconWrap}>
        <PdfIcon size={22} color="#FFC700" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={pdfCard.name}>{friendlyPdfName(pdf.pdf_name)}</div>
        <div style={pdfCard.filename}>{pdf.pdf_name}</div>
        <div style={pdfCard.meta}>{pdf.batch} · {pdf.test_date}</div>
      </div>
      <a
        href={pdf.gdrive_link}
        target="_blank"
        rel="noopener noreferrer"
        style={pdfCard.btn}
        onClick={() => onOpen(pdf)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#D4A000"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#FFC700"; }}
      >
        Open ↗
      </a>
    </div>
  );
}

function FullPageSpinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "2.5px solid rgba(255,255,255,0.08)", borderTopColor: "#FFC700", borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto" }} />
        <p style={{ marginTop: 16, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Loading…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: "#fff", marginBottom: 10, fontSize: 20, fontWeight: 700 }}>Access Error</h2>
        <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14, lineHeight: 1.7 }}>{message}</p>
        <button
          style={{ padding: "11px 28px", background: "#FFC700", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#1A1A1A" }}
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function PdfIcon({ size = 24, color = "#FFC700" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function DocIcon({ size = 24, dim }: { size?: number; dim?: boolean }) {
  const c = dim ? "rgba(255,255,255,0.18)" : "rgba(255,199,0,0.7)";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function BatchIconSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,199,0,0.7)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SyncIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,199,0,0.7)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const nav: Record<string, React.CSSProperties> = {
  bar: {
    background: "rgba(10,10,10,0.85)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 20px",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { display: "flex", alignItems: "center", gap: 12 },
  logoBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "linear-gradient(135deg, #FFC700 0%, #D4A000 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 10px rgba(255,199,0,0.25)",
    flexShrink: 0,
  },
  logoText: { fontWeight: 900, fontSize: 12, color: "#1A1A1A" },
  brand: { fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.85)", letterSpacing: -0.3 },
  right: { display: "flex", alignItems: "center", gap: 12 },
  adminBadge: {
    padding: "5px 12px",
    background: "#FFC700",
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 11,
    color: "#1A1A1A",
    letterSpacing: 0.5,
    textDecoration: "none",
    textTransform: "uppercase" as const,
  },
  userBlock: { textAlign: "right" as const },
  userName: { fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.3 },
  userRole: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 },
  avatar: { width: 34, height: 34, borderRadius: "50%", border: "1.5px solid rgba(255,199,0,0.5)", objectFit: "cover" as const },
  avatarFallback: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg, #FFC700 0%, #D4A000 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 800, fontSize: 13, color: "#1A1A1A", flexShrink: 0,
  },
};

const pg: Record<string, React.CSSProperties> = {
  wrapper: { maxWidth: 1100, margin: "0 auto", padding: "28px 20px 40px" },
};

const hero: Record<string, React.CSSProperties> = {
  section: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 20,
    marginBottom: 24,
  },
  text: {},
  greeting: {
    fontSize: 26,
    fontWeight: 800,
    color: "#FFFFFF",
    letterSpacing: -0.8,
    lineHeight: 1.2,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  syncRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
};

const statCard: Record<string, React.CSSProperties> = {
  box: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  icon: { marginBottom: 6, display: "flex" },
  label: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500, letterSpacing: 0.2 },
  value: { fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
};

const filter: Record<string, React.CSSProperties> = {
  box: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "22px",
    marginBottom: 20,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: -0.3 },
  clearBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  applyBtn: {
    background: "#FFC700",
    border: "none",
    borderRadius: 8,
    padding: "7px 18px",
    fontSize: 12,
    fontWeight: 700,
    color: "#1A1A1A",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid",
    borderRadius: 10,
    fontSize: 13,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    appearance: "auto" as const,
  },
  searchWrap: {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute" as const,
    left: 13,
    display: "flex",
    alignItems: "center",
    pointerEvents: "none" as const,
  },
  searchInput: {
    width: "100%",
    padding: "10px 14px 10px 36px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    fontSize: 13,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
};

const pdfCard: Record<string, React.CSSProperties> = {
  box: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: "16px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
    transition: "border-color 0.2s, background 0.2s",
  },
  boxHov: {
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,199,0,0.2)",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 11,
    background: "rgba(255,199,0,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  name: { fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 2, lineHeight: 1.3 },
  filename: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  meta: { fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 },
  btn: {
    padding: "8px 18px",
    background: "#FFC700",
    color: "#1A1A1A",
    borderRadius: 9,
    fontWeight: 700,
    fontSize: 12,
    textDecoration: "none",
    whiteSpace: "nowrap" as const,
    transition: "background 0.15s",
    flexShrink: 0,
  },
};

const empty: Record<string, React.CSSProperties> = {
  box: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "56px 24px",
    gap: 10,
    textAlign: "center" as const,
  },
  illustrationWrap: {
    position: "relative" as const,
    width: 120,
    height: 80,
    marginBottom: 8,
  },
  illustrationCard: {
    position: "absolute" as const,
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    width: 70,
    height: 70,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  illustrationCard2: {
    position: "absolute" as const,
    left: "18%",
    top: "55%",
    transform: "translate(-50%, -50%) rotate(-8deg)",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    width: 56,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  illustrationCard3: {
    position: "absolute" as const,
    left: "82%",
    top: "55%",
    transform: "translate(-50%, -50%) rotate(8deg)",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10,
    width: 46,
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  iconWrap: {
    width: 64,
    height: 64,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  msg: { fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: -0.2 },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 },
  cta: {
    marginTop: 8,
    padding: "9px 22px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    cursor: "pointer",
    transition: "background 0.15s",
  },
};

const ftr: Record<string, React.CSSProperties> = {
  bar: {
    position: "fixed" as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: "rgba(10,10,10,0.9)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: { display: "flex", alignItems: "center", gap: 16 },
  secBadge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    fontWeight: 500,
  },
  copy: { fontSize: 11, color: "rgba(255,255,255,0.2)" },
  signOut: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "7px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(255,255,255,0.45)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};
