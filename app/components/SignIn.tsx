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

export default function SignIn({ error }: { error?: string }) {
  const [loading, setLoading] = useState(false);
  const errorMsg = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  async function handleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ═══ LEFT — Yellow brand panel ═══ */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative lg:w-[44%] bg-[#FFC700] flex flex-col overflow-hidden
                   px-8 pt-10 pb-8 lg:px-14 lg:py-12 min-h-[300px] lg:min-h-screen"
      >
        {/* Subtle dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {/* PW Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 bg-black/90 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[#FFC700] font-black text-[11px] tracking-tight">PW</span>
          </div>
          <span className="font-semibold text-black/60 text-sm tracking-tight">Physics Wallah</span>
        </div>

        {/* Hero heading */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10 lg:py-0">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-[10px] font-bold tracking-[3px] text-black/35 uppercase mb-5 flex items-center gap-2"
          >
            <span className="w-5 h-px bg-black/25 shrink-0" />
            Internal Platform
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-black text-black leading-[0.88] tracking-[-0.05em] mb-6"
            style={{ fontSize: "clamp(52px, 7vw, 84px)" }}
          >
            Faculty<br />Portal.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="hidden lg:block text-sm text-black/50 leading-relaxed max-w-xs font-medium"
          >
            Centralised access to result PDFs,<br />batch analytics and faculty resources.
          </motion.p>
        </div>

        {/* Stats — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative z-10 hidden lg:flex border-t border-black/10 pt-7 gap-0"
        >
          {[
            { n: "2,400+", l: "Faculty members" },
            { n: "100K+", l: "Reports generated" },
            { n: "48",    l: "Active batches" },
          ].map((s, i) => (
            <div key={s.l} className={`flex-1 ${i < 2 ? "border-r border-black/10 pr-6 mr-6" : ""}`}>
              <div className="text-[22px] font-extrabold text-black tracking-tight leading-none">{s.n}</div>
              <div className="text-[11px] text-black/38 mt-1.5 font-medium">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ═══ RIGHT — Sign-in form ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="flex-1 bg-white flex items-center justify-center px-6 py-12 lg:py-0"
      >
        <div className="w-full max-w-[340px]">

          {/* Mobile-only brand */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-[#FFC700] rounded-lg flex items-center justify-center shrink-0">
              <span className="font-black text-[11px] text-black">PW</span>
            </div>
            <span className="font-semibold text-gray-700 text-sm">Physics Wallah</span>
          </div>

          {/* Form heading */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mb-8"
          >
            <p className="text-[10px] font-bold tracking-[2.5px] text-gray-400 uppercase mb-3">Secure Access</p>
            <h2 className="text-[26px] font-bold text-gray-900 tracking-tight leading-tight mb-2">
              Sign in
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Use your @pw.live Google account to continue.
            </p>
          </motion.div>

          {/* Error banner */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-sm text-red-600 leading-relaxed">{errorMsg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.008, boxShadow: "0 4px 20px rgba(0,0,0,0.09)" }}
              whileTap={{ scale: 0.995 }}
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-[14px]
                         bg-white border border-gray-200 rounded-2xl
                         text-[14px] font-semibold text-gray-800
                         hover:bg-gray-50 hover:border-gray-300
                         transition-colors duration-150 shadow-sm
                         disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC700]"
            >
              {loading ? (
                <span
                  className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-[#FFC700] shrink-0"
                  style={{ animation: "spin 0.75s linear infinite" }}
                />
              ) : (
                <GoogleIcon />
              )}
              <span>{loading ? "Signing in…" : "Continue with Google"}</span>
            </motion.button>

            <p className="text-center text-xs text-gray-400 mt-4">
              Only{" "}
              <span className="font-semibold text-gray-600">@pw.live</span>{" "}
              accounts are permitted.
            </p>
          </motion.div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300 font-medium whitespace-nowrap">Secured by Google OAuth</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Trust list */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="space-y-3"
          >
            {[
              "No passwords stored — Google handles all authentication",
              "Role-based access — Admin and Faculty tiers enforced",
              "Session expires automatically after inactivity",
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-xs text-gray-400 leading-relaxed">
                <span className="w-1 h-1 rounded-full bg-[#FFC700] shrink-0 mt-[5px]" />
                {point}
              </li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
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
