import Link from "next/link";

export default function NotFound() {
  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.dotGrid} />
      <div style={s.card}>
        <div style={s.code}>404</div>
        <h1 style={s.title}>Page not found</h1>
        <p style={s.sub}>
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/" style={s.btn}>← Back to Portal</Link>
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
    width: 500,
    height: 500,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,199,0,0.12) 0%, transparent 65%)",
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
  code: {
    fontSize: 72,
    fontWeight: 900,
    color: "#FFC700",
    letterSpacing: -4,
    lineHeight: 1,
    marginBottom: 16,
    opacity: 0.9,
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
  btn: {
    display: "inline-block",
    padding: "11px 28px",
    background: "#FFC700",
    color: "#1A1A1A",
    borderRadius: 12,
    fontWeight: 700,
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
