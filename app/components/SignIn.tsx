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

const STATS = [
  { label: "Reports", value: "4,500+", float: "up"   as const },
  { label: "Centers", value: "120+",   float: "down" as const },
  { label: "Users",   value: "10k+",   float: "up"   as const },
];

const ROLES = [
  { title: "Faculty",      desc: "Assigned batches only",  yellow: true  },
  { title: "Center Head",  desc: "All center batches",     yellow: false },
  { title: "Region Head",  desc: "Region-wide reports",    yellow: false },
];

export default function SignIn({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  async function handleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="h-screen flex flex-col bg-[#fafaf8] text-zinc-900">

      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blobs */}
        <div className="absolute top-[-120px] left-[-100px] w-80 h-80 rounded-full bg-yellow-300/30 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-100px] w-[360px] h-[360px] rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-yellow-100/40 blur-[120px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
            backgroundSize: "54px 54px",
          }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 shrink-0 h-[72px] px-6 md:px-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-black font-black text-sm flex items-center justify-center shadow-md shrink-0">
            PW
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[15px] tracking-tight">PW Darpan</div>
            <div className="text-[11px] text-zinc-500">Academic Access Portal</div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white/80 text-sm text-zinc-600 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          Secure Access
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 overflow-y-auto">
        {/* min-h-full + flex items-center → vertically centered on desktop, scrollable on mobile */}
        <div className="min-h-full flex items-center px-6 md:px-14 py-3 lg:py-6">
          <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* ── Left — Hero ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] as const }}
              className="hidden lg:flex flex-col order-2 lg:order-1"
            >
              <p className="uppercase tracking-[0.4em] text-xs text-yellow-500 font-semibold mb-5">
                Performance Intelligence Platform
              </p>

              <h1
                className="font-black leading-[0.92] tracking-tight mb-5"
                style={{ fontSize: "clamp(32px, 5vw, 68px)" }}
              >
                Har Test Ka Sach.<br />
                <span className="text-yellow-500">Har Batch Ka Darpan.</span>
              </h1>

              <p className="text-zinc-500 text-[15px] leading-relaxed max-w-lg">
                Access student reports, question-wise analysis, skipped &amp; wrongly
                attempted reports securely.
              </p>

              {/* Stat cards — hidden on xs, visible sm+ */}
              <div className="hidden sm:grid grid-cols-3 gap-4 mt-8">
                {STATS.map((s) => (
                  <motion.div
                    key={s.label}
                    animate={{ y: s.float === "up" ? [0, -8, 0] : [0, 10, 0] }}
                    transition={{
                      repeat: Infinity,
                      duration: s.float === "up" ? 6 : 8,
                      ease: "easeInOut",
                    }}
                    className="bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm"
                  >
                    <p className="text-xs text-zinc-400">{s.label}</p>
                    <h3 className="text-xl font-bold mt-1">{s.value}</h3>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ── Right — Login card ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] as const }}
              className="flex justify-center order-1 lg:order-2"
            >
              <div className="w-full max-w-md bg-white/90 border border-white/60 shadow-2xl rounded-[30px] p-5 sm:p-7 backdrop-blur-sm">

                {/* Card header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-3xl bg-yellow-400 text-black font-black text-lg mx-auto flex items-center justify-center shadow-lg mb-3">
                    PW
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Sign in to Darpan</h2>
                  <p className="text-zinc-500 mt-1 text-sm">
                    Continue with your <span className="font-semibold text-zinc-700">@pw.live</span> account
                  </p>
                </div>

                {/* Error banner */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-5"
                    >
                      <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-100">
                        <svg
                          className="w-4 h-4 mt-0.5 shrink-0 text-red-400"
                          viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className="text-sm text-red-600 leading-relaxed">{errorMsg}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Google sign-in button */}
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-zinc-900 text-white font-semibold
                             flex items-center justify-center gap-3
                             hover:bg-zinc-800 hover:scale-[1.015]
                             transition-all duration-200
                             cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white shrink-0"
                      style={{ animation: "spin 0.75s linear infinite" }}
                    />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{loading ? "Signing in…" : "Continue with Google"}</span>
                </button>

                {/* Divider */}
                <div className="my-6 flex items-center gap-4">
                  <div className="h-px bg-zinc-200 flex-1" />
                  <span className="text-[10px] tracking-[0.3em] text-zinc-400 whitespace-nowrap">
                    ACCESS
                  </span>
                  <div className="h-px bg-zinc-200 flex-1" />
                </div>

                {/* Role cards */}
                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <div
                      key={r.title}
                      className={`rounded-2xl border px-4 py-3 ${
                        r.yellow
                          ? "border-yellow-200 bg-yellow-50"
                          : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      <h3 className="font-semibold text-sm">{r.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
                    </div>
                  ))}
                </div>

                <p className="text-center text-[11px] text-zinc-400 mt-6">
                  Protected by Google OAuth
                </p>
              </div>
            </motion.div>

          </div>
        </div>
      </main>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

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
