"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.dotGrid} />
      <div style={s.card}>
        <div style={s.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFC700" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h1 style={s.title}>Something went wrong</h1>
        <p style={s.sub}>
          An unexpected error occurred. This has been logged.
          {error.digest && (
            <><br /><span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.2)", fontSize: 11 }}>#{error.digest}</span></>
          )}
        </p>
        <div style={s.actions}>
          <button onClick={reset} style={s.primaryBtn}>Try again</button>
          <a href="/" style={s.secondaryBtn}>← Back to Portal</a>
        </div>
      </div>
      <span style={s.sparkle} aria-hidden>✦</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: 24,
  },
  glow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 460,
    height: 460,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 65%)",
    pointerEvents: "none",
  },
  dotGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 10,
    textAlign: "center",
    maxWidth: 420,
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 24,
    padding: "48px 40px",
    boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    background: "rgba(255,199,0,0.08)",
    border: "1px solid rgba(255,199,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  sub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 1.7,
    marginBottom: 32,
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  primaryBtn: {
    padding: "11px 28px",
    background: "#FFC700",
    color: "#1A1A1A",
    border: "none",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    display: "inline-block",
    padding: "11px 24px",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.6)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    letterSpacing: -0.2,
  },
  sparkle: {
    position: "fixed",
    bottom: 28,
    right: 28,
    fontSize: 22,
    color: "rgba(255,199,0,0.3)",
    pointerEvents: "none",
    userSelect: "none",
  },
};
