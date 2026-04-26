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

const TILES = [
  {
    n: "2,400+",
    l: "Faculty members",
    delay: 0.38,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    pos: { right: "calc(100% + 32px)", top: "18%" },
    rotate: "-4deg",
  },
  {
    n: "100K+",
    l: "Reports generated",
    delay: 0.48,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    pos: { left: "calc(100% + 32px)", top: "18%" },
    rotate: "4deg",
  },
  {
    n: "48",
    l: "Active batches",
    delay: 0.56,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    pos: { left: "50%", bottom: "-72px" },
    rotate: "-2deg",
    centerX: true,
  },
];

export default function SignIn({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  async function handleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAFAF8" }}>

      {/* ── Grain texture ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />

      {/* ── Ambient yellow glow ── */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 z-0"
        style={{
          width: 900,
          height: 560,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(255,199,0,0.22) 0%, rgba(255,199,0,0.05) 45%, transparent 70%)",
        }}
      />

      {/* ── Navbar ── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-9 sm:py-5"
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
          style={{
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">Internal</span>
        </div>
      </motion.header>

      {/* ── Main ── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <div className="flex flex-col items-center w-full">

          {/* Eyebrow tag */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5"
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5"
              style={{
                background: "rgba(255,199,0,0.12)",
                border: "1px solid rgba(255,199,0,0.28)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#FFC700" }}
              />
              <span
                className="text-[11px] font-bold tracking-[1.5px] uppercase"
                style={{ color: "#8A6200" }}
              >
                Faculty Portal
              </span>
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="font-black text-gray-950 leading-[0.88] tracking-[-0.04em] text-center mb-10 select-none"
            style={{ fontSize: "clamp(44px, 8vw, 86px)" }}
          >
            Welcome<br />
            <span style={{ color: "#FFC700" }}>Back.</span>
          </motion.h1>

          {/* Card + floating tiles wrapper */}
          <div className="relative w-full max-w-[388px]">

            {/* Floating bento tiles — xl only */}
            {TILES.map((tile) => (
              <motion.div
                key={tile.l}
                initial={{ opacity: 0, scale: 0.82, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: tile.delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="hidden xl:flex absolute flex-col gap-1.5 pointer-events-none"
                style={{
                  ...tile.pos,
                  transform: tile.centerX
                    ? `translateX(-50%) rotate(${tile.rotate})`
                    : `rotate(${tile.rotate})`,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 18,
                  padding: "14px 18px",
                  minWidth: 130,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-0.5"
                  style={{ background: "rgba(255,199,0,0.12)" }}
                >
                  {tile.icon}
                </div>
                <div className="text-[19px] font-extrabold text-gray-900 tracking-tight leading-none">
                  {tile.n}
                </div>
                <div className="text-[11px] text-gray-400 font-medium leading-tight mt-0.5">
                  {tile.l}
                </div>
              </motion.div>
            ))}

            {/* ── Sign-in card ── */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.16, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full rounded-3xl p-7 sm:p-8"
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow:
                  "0 2px 4px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.07), 0 24px 64px rgba(0,0,0,0.04)",
              }}
            >
              {/* Card header */}
              <div className="text-center mb-6">
                <h2 className="text-[16px] font-bold text-gray-900 tracking-tight mb-1.5">
                  Sign in to your account
                </h2>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  Use your{" "}
                  <span className="font-semibold text-gray-700">@pw.live</span>
                  {" "}Google account to continue
                </p>
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-5"
                  >
                    <div
                      className="flex items-start gap-2.5 p-3.5 rounded-xl"
                      style={{ background: "#FFF1F0", border: "1px solid #FFD0CC" }}
                    >
                      <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#EF4444" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span className="text-[13px] leading-relaxed" style={{ color: "#C0392B" }}>
                        {errorMsg}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Google button */}
              <motion.button
                whileHover={{
                  scale: 1.016,
                  boxShadow: "0 6px 28px rgba(0,0,0,0.12)",
                }}
                whileTap={{ scale: 0.984 }}
                onClick={handleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 text-[14px] font-semibold text-gray-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                style={{
                  padding: "13px 20px",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 16,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,199,0,0.35)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
              >
                {loading ? (
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0"
                    style={{
                      borderColor: "#e5e7eb",
                      borderTopColor: "#FFC700",
                      animation: "spin 0.75s linear infinite",
                    }}
                  />
                ) : (
                  <GoogleIcon />
                )}
                <span>{loading ? "Signing in…" : "Continue with Google"}</span>
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
                <span
                  className="text-[10px] font-bold tracking-[2px] whitespace-nowrap"
                  style={{ color: "#C8C8C8" }}
                >
                  OAUTH 2.0 SECURED
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
              </div>

              {/* Trust list */}
              <ul className="space-y-2.5">
                {[
                  "No passwords stored — Google handles all authentication",
                  "Admin & Faculty role access enforced at session level",
                  "Session expires automatically after inactivity",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: "#9CA3AF" }}>
                    <span
                      className="w-1 h-1 rounded-full shrink-0 mt-[5px]"
                      style={{ background: "#FFC700" }}
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Stats bar — shown below xl, hidden above */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="xl:hidden flex items-stretch mt-6 w-full max-w-[388px] rounded-2xl overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.07)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            {[
              { n: "2,400+", l: "Faculty" },
              { n: "100K+", l: "Reports" },
              { n: "48", l: "Batches" },
            ].map((s, i) => (
              <div
                key={s.l}
                className="flex-1 flex flex-col items-center justify-center py-3.5"
                style={i < 2 ? { borderRight: "1px solid rgba(0,0,0,0.07)" } : {}}
              >
                <div className="text-[15px] font-extrabold text-gray-900 tracking-tight leading-none">
                  {s.n}
                </div>
                <div className="text-[10px] text-gray-400 mt-1 font-medium">{s.l}</div>
              </div>
            ))}
          </motion.div>

          {/* Footer note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="text-[11px] text-center mt-6"
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
