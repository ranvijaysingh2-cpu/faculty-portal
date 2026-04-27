"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  show: { transition: { staggerChildren: 0.05 } },
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

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-zinc-200 bg-white flex-col">
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
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            exit={{ x: -250 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] as const }}
            className="fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-zinc-200 flex flex-col lg:hidden"
          >
            <SidebarContent {...sidebarProps} />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="h-14 shrink-0 border-b border-zinc-200 bg-white px-4 lg:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">Reports Workspace</h1>
            </div>
          </div>

          {/* Search — desktop */}
          <div className="relative hidden md:block shrink-0">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 h-9 rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none transition-all focus:bg-white focus:border-yellow-400 focus:w-64"
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
            />
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 overflow-hidden p-3 lg:p-5 flex flex-col gap-3">

          {/* Filters */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="show"
            className="rounded-2xl bg-white border border-zinc-100 px-4 lg:px-5 py-3.5 shrink-0"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">Filters</h2>
                {data.pdfs.length > 0 && (
                  <span className="text-[10px] font-medium text-zinc-400">{data.pdfs.length} PDFs available</span>
                )}
              </div>
              {hasFilters && (
                <button onClick={clearFilters}
                  className="text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer">
                  Clear all
                </button>
              )}
            </div>

            <div className={`grid gap-2.5 ${
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
            <div className="md:hidden mt-2.5 relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm text-zinc-800 placeholder-zinc-400 outline-none"
                onFocus={(e) => { e.currentTarget.style.borderColor = "#FFC700"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e4e4e7"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </motion.section>

          {/* Results */}
          <motion.section
            variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: 0.07 }}
            className="flex-1 rounded-2xl bg-white border border-zinc-100 overflow-hidden flex flex-col min-h-0"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="h-11 shrink-0 border-b border-zinc-100 px-4 lg:px-5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Results</h3>
              <span className="text-xs text-zinc-400">
                {showResults ? `${visiblePdfs.length} PDF${visiblePdfs.length !== 1 ? "s" : ""}` : "—"}
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
                    className="p-3 flex flex-col gap-2"
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
      <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-zinc-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black font-black text-xs flex items-center justify-center shrink-0">
          PW
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-tight">PW Darpan</h2>
          <p className="text-[10px] text-zinc-500">Workspace</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-3 px-3 space-y-1 shrink-0">
        <SidebarItem icon={<ReportsIcon />} label="Reports" active onClick={onClose} />
      </nav>

      {/* Support */}
      <div className="mt-3 pt-3 border-t border-zinc-100 px-3 space-y-1 shrink-0">
        <SidebarItem icon={<HelpIcon />} label="Feedback & Help" href="/feedback" onClick={onClose} />
        {data.isAdmin && (
          <SidebarItem icon={<ShieldIcon />} label="Admin Dashboard" href="/admin" onClick={onClose} yellow />
        )}
      </div>

      {/* Scope info */}
      <div className="mt-3 mx-3 shrink-0">
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">{roleLabel(role)}</p>
          <p className="text-xs font-medium text-zinc-700 truncate">{data.scopeValue || data.user.email}</p>
        </div>
      </div>

      {/* User profile card */}
      <div className="mt-auto pt-3 border-t border-zinc-100 px-3 pb-4 shrink-0">
        <div className="rounded-xl bg-zinc-50 p-2.5 flex items-center gap-2.5">
          {data.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.user.image} alt="" referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {data.user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{firstName}</p>
            <p className="text-[10px] text-zinc-500 truncate">{data.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
            aria-label="Sign out"
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
  const cls = `w-full h-10 rounded-xl flex items-center gap-3 px-3 text-sm transition-colors cursor-pointer ${
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

// ── Custom dropdown ────────────────────────────────────────────────────────

function FilterSelect({
  label, options, value, onChange, disabled, active,
}: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; disabled: boolean; active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function openDropdown() {
    if (disabled || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node) &&
          !listRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onClose() { setOpen(false); }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open]);

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openDropdown()}
        className="w-full h-11 flex items-center justify-between pl-3.5 pr-3 text-sm rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          borderColor: open || active ? "#FFC700" : "#e4e4e7",
          boxShadow: open || active ? "0 0 0 3px rgba(255,199,0,0.12)" : "none",
          background: disabled ? "#f9f9f9" : open ? "#fff" : "#fafafa",
          color: value ? "#3f3f46" : "#a1a1aa",
        }}
      >
        <span className="truncate text-left text-sm">{value || `— ${label} —`}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="shrink-0 ml-2"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            key="dd"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] as const }}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
              background: "#fff",
              border: "1px solid #e4e4e7",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div className="max-h-52 overflow-y-auto py-1">
              <button type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-50 transition-colors">
                — {label} —
              </button>
              {options.map((o) => (
                <button key={o} type="button"
                  onClick={() => { onChange(o); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                    o === value
                      ? "bg-yellow-50 text-zinc-900 font-semibold"
                      : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <span className="truncate">{o}</span>
                  {o === value && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EAB308"
                      strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 ml-2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── PDF row ────────────────────────────────────────────────────────────────

function PdfRow({ pdf, onOpen }: { pdf: PdfRecord; onOpen: (pdf: PdfRecord) => void }) {
  return (
    <motion.div
      variants={fadeUp}
      className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-150 hover:border-zinc-200 hover:bg-white hover:shadow-sm"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-yellow-50 border border-yellow-100">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.8}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-zinc-800 truncate leading-snug">
          {friendlyPdfName(pdf.pdf_name)}
        </div>
        <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
          {pdf.batch} · {pdf.test_date}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <a href={pdf.gdrive_link} target="_blank" rel="noopener noreferrer"
          onClick={() => onOpen(pdf)}
          className="h-8 px-3.5 bg-yellow-400 text-black text-xs font-bold rounded-lg hover:bg-yellow-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
          <OpenIcon />
          Open
        </a>
        <a href={pdf.gdrive_link} target="_blank" rel="noopener noreferrer"
          onClick={() => onOpen(pdf)} title="Download"
          className="h-8 w-8 bg-zinc-100 text-zinc-500 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Download">
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
      className="flex flex-col items-center justify-center text-center px-8 py-12"
    >
      <div className="w-14 h-14 rounded-2xl bg-yellow-50 border border-yellow-100 flex items-center justify-center mb-4">
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#D4A000" strokeWidth={1.6}
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-zinc-800 mb-1.5">
        {isNoResults ? "No PDFs Found" : "Ready to Browse"}
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
        {isNoResults
          ? "No PDFs match your current filters. Try a different batch, date, or search term."
          : "Select a batch and test date above to view available report PDFs."}
      </p>
    </motion.div>
  );
}

// ── Loading / Error screens ────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#fafaf8] flex items-center justify-center">
      <div className="text-center">
        <div className="w-9 h-9 rounded-full border-[2.5px] border-zinc-200 border-t-yellow-400 mx-auto mb-3"
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
        <div className="w-13 h-13 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Access Error</h2>
        <p className="text-sm text-zinc-500 leading-relaxed mb-5">{message}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-5 py-2 bg-yellow-400 text-black font-bold text-sm rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DownloadSmIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
