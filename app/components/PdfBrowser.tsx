"use client";

import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type { PdfRecord } from "@/lib/csv";

// ── Hooks ──────────────────────────────────────────────────────────────────

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

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

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
  return role === "faculty" ? "Faculty"
    : role === "center_head" ? "Center Head"
    : "Region Head";
}

function fmt(d: Date) {
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

// ── Animation variants ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as number[] },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

// ── Main component ─────────────────────────────────────────────────────────

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
      f = f.filter(
        (p) =>
          p.pdf_name.toLowerCase().includes(q) ||
          friendlyPdfName(p.pdf_name).toLowerCase().includes(q)
      );
    }
    return f;
  }, [data, selRegion, selCenter, selBatch, selDate, search]);

  function handleRegion(v: string) { setSelRegion(v); setSelCenter(""); setSelBatch(""); setSelDate(""); }
  function handleCenter(v: string) { setSelCenter(v); setSelBatch(""); setSelDate(""); }
  function handleBatch(v: string)  { setSelBatch(v); setSelDate(""); }

  function clearFilters() {
    setSearch("");
    if (!data) return;
    if (data.role === "faculty")      { setSelDate(""); return; }
    if (data.role === "center_head")  { setSelBatch(""); setSelDate(""); return; }
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

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;
  if (!data)   return null;

  const role = data.role;
  const showRegion = role === "region_head";
  const showCenter = role === "region_head" || role === "center_head";
  const hasFilters = !!(selBatch || selDate || search || (showCenter && selCenter) || (showRegion && selRegion));
  const showResults = selDate || search.length > 0;

  const latestDate = dates[dates.length - 1] || "—";
  const activeBatch = data.batches?.[0] || data.scopeValue || "—";
  const firstName = data.user.name.split(" ")[0];

  const nextActive =
    showRegion && !selRegion ? "region"
    : showCenter && !selCenter ? "center"
    : !selBatch ? "batch"
    : !selDate ? "date"
    : null;

  return (
    <div className="min-h-screen bg-[#F7F8FA]" style={{ paddingBottom: 68 }}>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="max-w-[1100px] mx-auto px-5 h-[60px] flex items-center justify-between gap-4">

          {/* Left: logo + title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-[34px] h-[34px] bg-[#FFC700] rounded-[9px] flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 2px 8px rgba(255,199,0,0.25)" }}>
              <span className="font-black text-[11px] text-black">PW</span>
            </div>
            {!isMobile && (
              <span className="font-semibold text-gray-800 text-[14.5px] tracking-tight">
                Faculty Portal
              </span>
            )}
          </div>

          {/* Right: admin badge + user */}
          <div className="flex items-center gap-3">
            {data.isAdmin && (
              <a href="/admin"
                className="px-3 py-1.5 bg-[#FFC700] rounded-lg text-[10.5px] font-bold text-black uppercase tracking-wide hover:bg-[#E6B400] transition-colors">
                Admin
              </a>
            )}
            {!isMobile && (
              <div className="text-right">
                <div className="text-[13px] font-semibold text-gray-800 leading-tight">{data.user.name}</div>
                <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{roleLabel(role)}</div>
              </div>
            )}
            {data.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.user.image} alt="avatar" referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover"
                style={{ border: "2px solid rgba(255,199,0,0.4)" }} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#FFC700] flex items-center justify-center font-bold text-black text-sm shrink-0">
                {data.user.name?.[0] ?? "?"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page body ── */}
      <main className="max-w-[1100px] mx-auto px-5 py-8">

        {/* Welcome */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="mb-7"
        >
          <motion.div variants={fadeUp}>
            <h1 className="text-[28px] sm:text-[32px] font-bold text-gray-900 tracking-tight leading-tight mb-1.5">
              Welcome back, {firstName} <span>👋</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              We&apos;ve synced the latest result PDFs.
            </p>
            {fetchedAt && (
              <div className="flex items-center gap-1.5 mt-2">
                <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-.44-6.02" />
                </svg>
                <span className="text-xs text-gray-400">Last Synced: {fmt(fetchedAt)}</span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-3 gap-3 sm:gap-4 mb-6"
        >
          <StatCard
            icon={<FileIcon />}
            label="Total PDFs"
            value={String(data.pdfs.length)}
            accent="#FFC700"
          />
          <StatCard
            icon={<LayersIcon />}
            label="Active Batch"
            value={activeBatch}
            accent="#F59E0B"
            compact
          />
          <StatCard
            icon={<ClockIcon />}
            label="Latest Upload"
            value={latestDate}
            accent="#10B981"
            compact
          />
        </motion.div>

        {/* Filter card */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="show"
          transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 mb-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)" }}
        >
          {/* Filter header */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-bold text-gray-900 text-[15px] tracking-tight">Browse Results</h2>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                className="px-4 py-1.5 text-xs font-bold bg-[#FFC700] text-black rounded-lg hover:bg-[#E6B400] transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {showRegion && (
              <FilterSelect
                label="Region" options={regions} value={selRegion}
                onChange={handleRegion} disabled={false}
                active={nextActive === "region"}
              />
            )}
            {showCenter && (
              <FilterSelect
                label="Center" options={centers} value={selCenter}
                onChange={handleCenter}
                disabled={showRegion && !selRegion}
                active={nextActive === "center"}
              />
            )}
            <FilterSelect
              label="Batch" options={batches} value={selBatch}
              onChange={handleBatch}
              disabled={(showRegion && !selRegion) || (showCenter && !selCenter)}
              active={nextActive === "batch"}
            />
            <FilterSelect
              label="Test Date" options={dates} value={selDate}
              onChange={setSelDate} disabled={!selBatch}
              active={nextActive === "date"}
            />
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none shrink-0"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by PDF name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400
                         bg-gray-50 border border-gray-200 rounded-xl
                         outline-none transition-all duration-150
                         focus:bg-white focus:border-[#FFC700]"
              style={{ "--tw-ring-shadow": "none" } as React.CSSProperties}
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
        </motion.div>

        {/* Results area */}
        <AnimatePresence mode="wait">
          {showResults ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {visiblePdfs.length === 0 ? (
                <EmptyState type="no-results" />
              ) : (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-3 pl-1">
                    {visiblePdfs.length} result{visiblePdfs.length !== 1 ? "s" : ""}
                  </p>
                  <motion.div
                    variants={stagger} initial="hidden" animate="show"
                    className="flex flex-col gap-2"
                  >
                    {visiblePdfs.map((pdf, i) => (
                      <PdfRow key={i} pdf={pdf} onOpen={logPdfOpen} />
                    ))}
                  </motion.div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState type="select-filters" onShowAll={() => {
                if (data?.pdfs.length && !selDate) {
                  const sel = document.querySelector("select") as HTMLSelectElement;
                  sel?.focus();
                }
              }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5"
        style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 -1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Secure Internal Portal</span>
          {fetchedAt && !isMobile && (
            <span className="text-gray-300 ml-2">
              · Synced {fetchedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          )}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg px-4 py-2
                     hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors duration-150"
        >
          Sign out
        </motion.button>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, accent, compact,
}: {
  icon: React.ReactNode; label: string; value: string; accent: string; compact?: boolean;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col gap-1"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 shrink-0"
        style={{ background: `${accent}18` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wide">{label}</div>
      <div
        className="font-bold text-gray-900 leading-tight truncate"
        style={{ fontSize: compact ? 15 : 26, letterSpacing: compact ? -0.3 : -1 }}
      >
        {value}
      </div>
    </motion.div>
  );
}

function FilterSelect({
  label, options, value, onChange, disabled, active,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; disabled: boolean; active: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide pl-0.5">{label}</label>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-gray-700 bg-gray-50 border rounded-xl outline-none transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: active ? "#FFC700" : "#E5E7EB",
            boxShadow: active ? "0 0 0 3px rgba(255,199,0,0.12)" : "none",
          }}
          onFocus={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = "#FFC700";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)";
            }
          }}
          onBlur={(e) => {
            if (!active) {
              e.currentTarget.style.borderColor = "#E5E7EB";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          <option value="">— {label} —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none shrink-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function PdfRow({ pdf, onOpen }: { pdf: PdfRecord; onOpen: (pdf: PdfRecord) => void }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -1, boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
      className="bg-white border border-gray-100 rounded-xl px-4 py-3.5 flex items-center gap-3.5 transition-all duration-150"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* PDF icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "rgba(255,199,0,0.1)" }}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-gray-800 truncate leading-snug mb-0.5">
          {friendlyPdfName(pdf.pdf_name)}
        </div>
        <div className="text-[11px] text-gray-400 font-mono truncate">{pdf.pdf_name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {pdf.batch} · {pdf.test_date}
        </div>
      </div>

      {/* Open button */}
      <motion.a
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        href={pdf.gdrive_link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onOpen(pdf)}
        className="shrink-0 px-4 py-2 bg-[#FFC700] text-black text-xs font-bold rounded-lg hover:bg-[#E6B400] transition-colors whitespace-nowrap"
      >
        Open ↗
      </motion.a>
    </motion.div>
  );
}

function EmptyState({
  type, onShowAll,
}: {
  type: "select-filters" | "no-results";
  onShowAll?: () => void;
}) {
  const isNoResults = type === "no-results";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="bg-white border border-gray-100 rounded-2xl py-16 px-6 flex flex-col items-center text-center"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Stacked doc illustration */}
      <div className="relative w-[100px] h-[88px] mb-7">
        {[
          { w: 62, h: 76, rotate: "-9deg", left: "4px",  bg: "#F3F4F6", border: "#E5E7EB", z: 1 },
          { w: 62, h: 76, rotate: "-2deg", left: "18px", bg: "#F9FAFB", border: "#E5E7EB", z: 2 },
          { w: 62, h: 76, rotate:  "7deg", left: "34px", bg: "#F3F4F6", border: "#E5E7EB", z: 1 },
        ].map((d, i) => (
          <div key={i} style={{
            position: "absolute", bottom: 0, left: d.left,
            width: d.w, height: d.h,
            borderRadius: 10,
            background: d.bg,
            border: `1px solid ${d.border}`,
            transform: `rotate(${d.rotate})`,
            zIndex: d.z,
          }}>
            <div style={{ padding: "10px 10px 0", display: "flex", flexDirection: "column", gap: 5 }}>
              {[70, 90, 55].map((w, j) => (
                <div key={j} style={{ height: 3.5, width: `${w}%`, background: "#E5E7EB", borderRadius: 2 }} />
              ))}
            </div>
          </div>
        ))}
        {/* Center card on top */}
        <div style={{
          position: "absolute", bottom: 2, left: "18px", width: 62, height: 76,
          borderRadius: 10, background: "#fff",
          border: "1.5px solid #E5E7EB", zIndex: 3,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        </div>
        {/* Sparkle dots */}
        <span style={{ position: "absolute", top: 0, right: 4,  fontSize: 10, color: "#FFC700", opacity: 0.6 }}>✦</span>
        <span style={{ position: "absolute", top: 10, left: 0, fontSize: 8, color: "#FFC700", opacity: 0.4 }}>✦</span>
      </div>

      <h3 className="text-[15.5px] font-semibold text-gray-800 tracking-tight mb-2">
        {isNoResults ? "No PDFs found" : "Select filters to find reports"}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-6">
        {isNoResults
          ? "No PDFs match your current filters. Try adjusting your selection or search query."
          : "Choose your batch and test date above to view your available result PDFs."}
      </p>

      {!isNoResults && onShowAll && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onShowAll}
          className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
        >
          Show all PDFs
        </motion.button>
      )}
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
      <div className="text-center">
        <div className="w-9 h-9 rounded-full border-[2.5px] border-gray-200 border-t-[#FFC700] mx-auto mb-4"
          style={{ animation: "spin 0.75s linear infinite" }} />
        <p className="text-sm text-gray-400 font-medium">Loading your portal…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Access Error</h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-6 py-2.5 bg-[#FFC700] text-black font-bold text-sm rounded-xl hover:bg-[#E6B400] transition-colors"
        >
          Sign out
        </motion.button>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
