"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TYPES = ["Feedback", "Feature Request", "Bug / Problem", "PDF not found", "Other"];
const ROLES = ["Faculty", "Center Head", "Region Head", "Admin"];

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: "", role: "", type: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim())    e.name = "Name is required";
    if (!form.role)           e.role = "Please select your role";
    if (!form.type)           e.type = "Please select a type";
    if (!form.message.trim()) e.message = "Please describe your feedback";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(evt: React.FormEvent) {
    evt.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#FAFAF8" }}>

      {/* Glow */}
      <div className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 z-0"
        style={{ width: 600, height: 300, background: "radial-gradient(ellipse at 50% 0%, rgba(255,199,0,0.15) 0%, transparent 70%)" }} />

      {/* Navbar */}
      <header className="relative z-10 shrink-0 flex items-center justify-between px-5 py-3.5 sm:px-8 border-b border-zinc-100 bg-white/80 backdrop-blur-sm">
        <a href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: "#FFC700" }}>
            <span className="font-black text-[10px] text-black tracking-tight">PW</span>
          </div>
          <span className="font-semibold text-gray-800 text-[13px] tracking-tight">PW Darpan</span>
        </a>
        <a href="/"
          className="text-[12px] font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          style={{ textDecoration: "none" }}>
          ← Back to Portal
        </a>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-y-auto flex items-start justify-center px-5 py-5">
        <div className="w-full max-w-[460px]">

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
            className="mb-4"
          >
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-2.5"
              style={{ background: "rgba(255,199,0,0.12)", border: "1px solid rgba(255,199,0,0.28)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FFC700" }} />
              <span className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: "#8A6200" }}>Feedback</span>
            </div>
            <h1 className="text-[24px] sm:text-[28px] font-black text-gray-950 tracking-tight leading-tight mb-1.5">
              Share your thoughts.
            </h1>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Report a problem, request a feature, or leave feedback.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {status === "done" ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as const }}
                className="rounded-2xl p-7 text-center"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.07)" }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <svg className="w-6 h-6" style={{ color: "#10B981" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-[18px] font-bold text-gray-900 tracking-tight mb-1.5">Thank you!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  Your feedback has been received. We&apos;ll review it shortly.
                </p>
                <a href="/"
                  className="inline-block px-5 py-2 text-sm font-bold text-black rounded-xl transition-colors"
                  style={{ background: "#FFC700", textDecoration: "none" }}>
                  ← Back to Portal
                </a>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
                onSubmit={handleSubmit}
                className="rounded-2xl p-4 sm:p-5"
                style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06)" }}
              >
                {status === "error" && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl mb-4"
                    style={{ background: "#FFF1F0", border: "1px solid #FFD0CC" }}>
                    <svg className="w-4 h-4 shrink-0" style={{ color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-[13px]" style={{ color: "#C0392B" }}>Something went wrong. Please try again.</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Name */}
                  <Field label="Your Name" error={errors.name}>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={form.name}
                      onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
                      className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 rounded-xl outline-none transition-all"
                      style={{ background: "#F7F8FA", border: `1px solid ${errors.name ? "#FCA5A5" : "rgba(0,0,0,0.1)"}` }}
                      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.2)")}
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    />
                  </Field>

                  {/* Role + Type */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Your Role" error={errors.role}>
                      <SelectInput
                        value={form.role}
                        options={ROLES}
                        placeholder="Select role"
                        hasError={!!errors.role}
                        onChange={(v) => { setForm((f) => ({ ...f, role: v })); setErrors((er) => ({ ...er, role: "" })); }}
                      />
                    </Field>
                    <Field label="Type" error={errors.type}>
                      <SelectInput
                        value={form.type}
                        options={TYPES}
                        placeholder="Select type"
                        hasError={!!errors.type}
                        onChange={(v) => { setForm((f) => ({ ...f, type: v })); setErrors((er) => ({ ...er, type: "" })); }}
                      />
                    </Field>
                  </div>

                  {/* Message */}
                  <Field label="Message" error={errors.message}>
                    <textarea
                      rows={4}
                      placeholder="Describe your feedback, request, or issue…"
                      value={form.message}
                      onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: "" })); }}
                      className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 rounded-xl outline-none transition-all resize-none"
                      style={{ background: "#F7F8FA", border: `1px solid ${errors.message ? "#FCA5A5" : "rgba(0,0,0,0.1)"}` }}
                      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.2)")}
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                    />
                  </Field>
                </div>

                <motion.button
                  type="submit"
                  disabled={status === "sending"}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-[14px] font-bold text-black rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "#FFC700", border: "none" }}
                >
                  {status === "sending" ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/60 shrink-0"
                        style={{ animation: "spin 0.75s linear infinite" }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send Feedback
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wide uppercase text-gray-500 mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>
      )}
    </div>
  );
}

function SelectInput({ value, options, placeholder, hasError, onChange }: {
  value: string; options: string[]; placeholder: string; hasError: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none pl-3 pr-8 py-2.5 text-sm text-gray-700 rounded-xl outline-none transition-all cursor-pointer"
        style={{ background: "#F7F8FA", border: `1px solid ${hasError ? "#FCA5A5" : "rgba(0,0,0,0.1)"}` }}
        onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.2)")}
        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
