"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "This Google account isn't authorised. Sign in with your @pw.live account.",
  OAuthSignin: "Couldn't start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Check your network and retry.",
  OAuthAccountNotLinked: "This email is linked to a different sign-in method.",
  Configuration: "Server configuration error. Contact your admin.",
  Default: "Sign-in failed. Please try again.",
};

const ROLES = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
    title: "Faculty",
    desc: "Test PDFs for your assigned batches",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: "Center Head",
    desc: "All results across your center",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Region Head",
    desc: "All results across your region",
  },
];

const PDF_TYPES = [
  "Student Performance Reports",
  "Question Level Insights",
  "Cohort Data — JEE / NEET (Vidyapeeth)",
];

export default function SignIn({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  async function handleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "#FAFAF8" }}
    >
      {/* Grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 z-0"
        style={{
          width: 800,
          height: 500,
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,199,0,0.22) 0%, rgba(255,199,0,0.05) 45%, transparent 70%)",
        }}
      />

      {/* Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] as const }}
        className="relative z-10 shrink-0 flex items-center justify-between px-5 py-4 sm:px-8"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm shrink-0"
            style={{ background: "#FFC700" }}
          >
            <span className="font-black text-[11px] text-black tracking-tight">PW</span>
          </div>
          <span className="font-semibold text-gray-800 text-[13px] tracking-tight">Physics Wallah</span>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Internal</span>
        </div>
      </motion.header>

      {/* Main — vertically centered, flex-1 */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 overflow-hidden">
        <div className="flex flex-col items-center w-full max-w-[388px]">

          {/* Eyebrow + heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
            className="text-center mb-6"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 mb-4"
              style={{ background: "rgba(255,199,0,0.12)", border: "1px solid rgba(255,199,0,0.28)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#FFC700" }} />
              <span className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: "#8A6200" }}>
                Faculty Portal
              </span>
            </div>
            <h1
              className="font-black text-gray-950 leading-[0.9] tracking-[-0.04em] select-none"
              style={{ fontSize: "clamp(40px, 7vw, 72px)" }}
            >
              Welcome<br />
              <span style={{ color: "#FFC700" }}>Back.</span>
            </h1>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.16, 1, 0.3, 1] as const }}
            className="w-full rounded-3xl p-6 sm:p-7"
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.07), 0 24px 64px rgba(0,0,0,0.04)",
            }}
          >
            {/* Card header */}
            <div className="text-center mb-5">
              <h2 className="text-[15px] font-bold text-gray-900 tracking-tight mb-1">
                Sign in to your account
              </h2>
              <p className="text-[12.5px] text-gray-500">
                Use your <span className="font-semibold text-gray-700">@pw.live</span> Google account
              </p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div
                    className="flex items-start gap-2.5 p-3 rounded-xl"
                    style={{ background: "#FFF1F0", border: "1px solid #FFD0CC" }}
                  >
                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span className="text-[12px] leading-relaxed" style={{ color: "#C0392B" }}>{errorMsg}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google button */}
            <motion.button
              whileHover={{ scale: 1.015, boxShadow: "0 6px 28px rgba(0,0,0,0.12)" }}
              whileTap={{ scale: 0.985 }}
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 text-[14px] font-semibold text-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none"
              style={{
                padding: "12px 20px",
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 14,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.35)")}
              onBlur={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
            >
              {loading ? (
                <span
                  className="w-4 h-4 rounded-full border-2 shrink-0"
                  style={{ borderColor: "#e5e7eb", borderTopColor: "#FFC700", animation: "spin 0.75s linear infinite" }}
                />
              ) : <GoogleIcon />}
              <span>{loading ? "Signing in…" : "Continue with Google"}</span>
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-2.5 my-4">
              <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
              <span className="text-[10px] font-bold tracking-[2px] whitespace-nowrap" style={{ color: "#C8C8C8" }}>
                WHO CAN ACCESS
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
            </div>

            {/* Role info */}
            <div className="space-y-2 mb-4">
              {ROLES.map((r) => (
                <div key={r.title} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,199,0,0.05)", border: "1px solid rgba(255,199,0,0.12)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,199,0,0.15)", color: "#8A6200" }}>
                    {r.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[12px] font-bold text-gray-800">{r.title}</span>
                    <span className="text-[11px] text-gray-400 ml-1.5">{r.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* PDF types */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <p className="text-[10px] font-bold tracking-[1px] uppercase text-gray-400 mb-1.5">Available PDFs</p>
              <ul className="space-y-1">
                {PDF_TYPES.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[11.5px] text-gray-500">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#FFC700" }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="text-[11px] text-center mt-4"
            style={{ color: "#C0C0C0" }}
          >
            Only <span style={{ color: "#9CA3AF", fontWeight: 600 }}>@pw.live</span> accounts are permitted
          </motion.p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
