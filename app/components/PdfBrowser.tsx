"use client";

import { useEffect, useState, useMemo } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import type { PdfRecord } from "@/lib/csv";

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

// ── Animation variants ─────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// ── Main component ─────────────────────────────────────────────────────────

export default function PdfBrowser() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selRegion, setSelRegion] = useState("");
  const [selCenter, setSelCenter] = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [selDate, setSelDate] = useState("");

  // Close mobile drawer when resizing to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setSidebarOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch("/api/my-pdfs")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setError(json.error); return; }
        setData(json);

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
    if (data.role === "faculty")     { setSelDate(""); return; }
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

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} />;
  if (!data)   return null;

  const role = data.role;
  const showRegion = role === "region_head";
  const showCenter = role === "region_head" || role === "center_head";
  const hasFilters = !!(selBatch || selDate || search || (showCenter && selCenter) || (showRegion && selRegion));
  const showResults = !!(selDate || search.length > 0);
  const firstName = data.user.name.split(" ")[0];

  const nextActive =
    showRegion && !selRegion ? "region"
    : showCenter && !selCenter ? "center"
    : !selBatch ? "batch"
    : !selDate ? "date"
    : null;

  const sidebarProps = {
    data, firstName, role,
    onClose: () => setSidebarOpen(false),
  };

  return (
    <div className="h-screen flex bg-[#fafaf8] text-zinc-900 overflow-hidden">

      {/* Desktop sidebar — always visible lg+ */}
      <aside className="hidden lg:flex w-[250px] shrink-0 border-r border-zinc-200 bg-white flex-col">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }}
            className="fixed inset-y-0 left-0 z-50 w-[250px] bg-white border-r border-zinc-200 flex flex-col lg:hidden"
          >
            <SidebarContent {...sidebarProps} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-16 shrink-0 border-b border-zinc-200 bg-white px-5 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold leading-tight">Reports Workspace</h1>
              <p className="hidden sm:block text-[11px] text-zinc-500 mt-0.5">Find and open PDFs quickly</p>
            </div>
          </div>

          {/* Search — desktop */}
          <div className="relative hidden md:block shrink-0">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-10 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:bg-white focus:border-yellow-400 focus:w-72"
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-hidden p-4 lg:p-6 flex flex-col gap-4">

          {/* Welcome */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="show"
            className="rounded-[24px] bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 shrink-0"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-500 mb-1">
              Report Access
            </p>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight">
              Hello, {firstName} 👋
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Select batch, test date and report type to load PDFs.
            </p>
          </motion.section>

          {/* Filters */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.08 }}
            className="rounded-[24px] bg-white border border-zinc-100 px-5 lg:px-6 py-4 lg:py-5 shrink-0"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-900">Browse Results</h3>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer">
                  Clear all
                </button>
              )}
            </div>

            <div className={`grid gap-3 ${
              showRegion ? "grid-cols-2 lg:grid-cols-4"
              : showCenter ? "grid-cols-2 lg:grid-cols-3"
              : "grid-cols-2"
            }`}>
              {showRegion && (
                <FilterSelect label="Region" options={regions} value={selRegion}
                  onChange={handleRegion} disabled={false} active={nextActive === "region"} />
              )}
              {showCenter && (
                <FilterSelect label="Center" options={centers} value={selCenter}
                  onChange={handleCenter} disabled={showRegion && !selRegion} active={nextActive === "center"} />
              )}
              <FilterSelect label="Batch" options={batches} value={selBatch}
                onChange={handleBatch}
                disabled={(showRegion && !selRegion) || (showCenter && !selCenter)}
                active={nextActive === "batch"} />
              <FilterSelect label="Test Date" options={dates} value={selDate}
                onChange={setSelDate} disabled={!selBatch} active={nextActive === "date"} />
            </div>

            {/* Search — mobile */}
            <div className="md:hidden mt-3 relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                onFocus={(e) => { e.currentTarget.style.borderColor = "#FFC700"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e4e4e7"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </motion.section>

          {/* Results */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.14 }}
            className="flex-1 rounded-[24px] bg-white border border-zinc-100 overflow-hidden flex flex-col"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          >
            <div className="h-14 shrink-0 border-b border-zinc-100 px-5 lg:px-6 flex items-center justify-between">
              <h3 className="text-sm font-bold">Available Reports</h3>
              <span className="text-sm text-zinc-500">
                {showResults ? `${visiblePdfs.length} result${visiblePdfs.length !== 1 ? "s" : ""}` : "—"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {!showResults ? (
                  <EmptyState key="select" type="select-filters" />
                ) : visiblePdfs.length === 0 ? (
                  <EmptyState key="noresults" type="no-results" />
                ) : (
                  <motion.div
                    key="list"
                    variants={stagger} initial="hidden" animate="show"
                    className="p-4 flex flex-col gap-2"
                  >
                    {visiblePdfs.map((pdf, i) => (
                      <PdfRow key={i} pdf={pdf} onOpen={logPdfOpen} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

        </main>
      </div>
    </div>
  );
}

// ── Sidebar content ────────────────────────────────────────────────────────

function SidebarContent({
  data, firstName, role, onClose,
}: {
  data: ApiResponse; firstName: string; role: Role; onClose: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-5 border-b border-zinc-100 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-black font-black text-sm flex items-center justify-center shrink-0">
          PW
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight">PW Darpan</h2>
          <p className="text-[11px] text-zinc-500">Workspace</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-4 px-3 space-y-1 shrink-0">
        <SidebarItem icon={<ReportsIcon />} label="Reports" active onClick={onClose} />
        <SidebarItem icon={<RecentIcon />}  label="Recent"      onClick={onClose} />
        <SidebarItem icon={<StarIcon />}    label="Saved Views" onClick={onClose} />
        <SidebarItem icon={<DownloadIcon />} label="Downloads"  onClick={onClose} />
      </nav>

      {/* Support */}
      <div className="mt-5 pt-4 border-t border-zinc-100 px-3 space-y-1 shrink-0">
        <SidebarItem icon={<HelpIcon />} label="Feedback & Help" href="/feedback" onClick={onClose} />
        {data.isAdmin && (
          <SidebarItem icon={<ShieldIcon />} label="Admin Dashboard" href="/admin" onClick={onClose} yellow />
        )}
      </div>

      {/* User profile card */}
      <div className="mt-auto pt-4 border-t border-zinc-100 px-3 pb-4 shrink-0">
        <div className="rounded-2xl bg-zinc-50 p-3 flex items-center gap-3">
          {data.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.user.image} alt="" referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {data.user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{firstName}</p>
            <p className="text-xs text-zinc-500">{roleLabel(role)}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
          >
            <SignOutIcon />
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sidebar item ───────────────────────────────────────────────────────────

function SidebarItem({
  icon, label, active, href, yellow, onClick,
}: {
  icon: React.ReactNode; label: string; active?: boolean;
  href?: string; yellow?: boolean; onClick?: () => void;
}) {
  const cls = `w-full h-11 rounded-2xl flex items-center gap-3 px-4 text-sm transition-colors cursor-pointer ${
    yellow
      ? "bg-yellow-400 text-black font-bold hover:bg-yellow-300"
      : active
      ? "bg-yellow-50 border border-yellow-200 text-zinc-900 font-semibold"
      : "text-zinc-600 hover:bg-zinc-100 font-medium"
  }`;

  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        <span className="shrink-0">{icon}</span>
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ── Filter select ──────────────────────────────────────────────────────────

function FilterSelect({
  label, options, value, onChange, disabled, active,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; disabled: boolean; active: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 appearance-none pl-4 pr-9 text-sm text-zinc-700 bg-zinc-50 border rounded-2xl outline-none transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          borderColor: active ? "#FFC700" : "#e4e4e7",
          boxShadow: active ? "0 0 0 3px rgba(255,199,0,0.12)" : "none",
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = "#FFC700";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)";
            e.currentTarget.style.background = "#fff";
          }
        }}
        onBlur={(e) => {
          if (!active) {
            e.currentTarget.style.borderColor = "#e4e4e7";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.background = "";
          }
        }}
      >
        <option value="">— {label} —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ── PDF row ────────────────────────────────────────────────────────────────

function PdfRow({ pdf, onOpen }: { pdf: PdfRecord; onOpen: (pdf: PdfRecord) => void }) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3.5 flex items-center gap-4 transition-all duration-150 hover:border-zinc-200 hover:bg-white hover:shadow-sm"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-yellow-50 border border-yellow-100">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-semibold text-zinc-800 truncate leading-snug">
          {friendlyPdfName(pdf.pdf_name)}
        </div>
        <div className="text-[11px] text-zinc-400 mt-0.5">
          {pdf.batch} · {pdf.test_date}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a href={pdf.gdrive_link} target="_blank" rel="noopener noreferrer"
          onClick={() => onOpen(pdf)}
          className="h-9 px-4 bg-yellow-400 text-black text-xs font-bold rounded-xl hover:bg-yellow-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
          <OpenIcon />
          Open
        </a>
        <a href={pdf.gdrive_link} target="_blank" rel="noopener noreferrer"
          onClick={() => onOpen(pdf)} title="Download"
          className="h-9 w-9 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center cursor-pointer">
          <DownloadSmIcon />
        </a>
      </div>
    </motion.div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ type }: { type: "select-filters" | "no-results" }) {
  const isNoResults = type === "no-results";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center text-center px-8 py-14"
    >
      <div className="w-16 h-16 rounded-3xl bg-yellow-50 border border-yellow-100 flex items-center justify-center mb-4">
        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.6}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>
      <h3 className="text-[17px] font-bold text-zinc-800 mb-2">
        {isNoResults ? "No PDFs Found" : "Ready to Load Reports"}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
        {isNoResults
          ? "No PDFs match your current filters. Try adjusting your selection or search."
          : "Choose Batch, Test Date and Report Type to view available PDFs."}
      </p>
    </motion.div>
  );
}

// ── Loading / Error screens ────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#fafaf8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-[2.5px] border-zinc-200 border-t-yellow-400 mx-auto mb-4"
          style={{ animation: "spin 0.75s linear infinite" }} />
        <p className="text-sm text-zinc-400 font-medium">Loading workspace…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="h-screen bg-[#fafaf8] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Access Error</h2>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">{message}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-6 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function RecentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DownloadSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
