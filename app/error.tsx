"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm text-center"
      >
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Text */}
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-3">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-2">
          An unexpected error occurred. This has been logged.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-gray-300 mb-8">#{error.digest}</p>
        )}
        {!error.digest && <div className="mb-8" />}

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={reset}
            className="px-6 py-2.5 bg-[#FFC700] text-black font-bold text-sm rounded-xl hover:bg-[#E6B400] transition-colors"
          >
            Try again
          </motion.button>
          <a
            href="/"
            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-sm rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            ← Back to Portal
          </a>
        </div>
      </motion.div>

      {/* Subtle sparkle */}
      <span className="fixed bottom-7 right-7 text-xl text-[#FFC700]/30 pointer-events-none select-none" aria-hidden>✦</span>
    </div>
  );
}
