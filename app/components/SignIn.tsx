"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "This Google account is not authorised. Sign in with your @pw.live account.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthCallback: "Google sign-in failed. Check your network and try again.",
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
    <div style={s.page}>
      {/* Glow orbs */}
      <div style={{ ...s.glow, top: "-10%", left: "-5%", width: 560, height: 560 }} />
      <div style={{ ...s.glow, bottom: "-15%", right: "-5%", width: 380, height: 380, opacity: 0.22 }} />
      <div style={{ ...s.glowWhite, top: "40%", right: "15%" }} />

      {/* Subtle dot grid */}
      <div style={s.dotGrid} />

      {/* Card */}
      <div style={s.card} className="animate-in">
        {/* Brand row */}
        <div style={s.brandRow} className="animate-in delay-1">
          <div style={s.logoBox}>
            <span style={s.logoText}>PW</span>
          </div>
          <span style={s.brandName}>Physics Wallah</span>
        </div>

        {/* Heading */}
        <div style={s.headingBlock} className="animate-in delay-1">
          <h1 style={s.title}>Faculty Portal.</h1>
          <p style={s.subtitle}>
            Securely access your result PDFs,<br />
            reports and resources.
          </p>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div style={s.errorBox} className="animate-in delay-1">
            <span style={s.errorIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google button */}
        <button
          style={{ ...s.googleBtn, opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          onClick={handleSignIn}
          disabled={loading}
          className="animate-in delay-2"
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,199,0,0.55)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 3px rgba(255,199,0,0.08), 0 8px 24px rgba(0,0,0,0.3)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.13)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          {loading ? (
            <span style={s.btnSpinner} />
          ) : (
            <GoogleIcon />
          )}
          <span>{loading ? "Signing in…" : "Continue with Google"}</span>
        </button>

        {/* Note */}
        <div style={s.noteRow} className="animate-in delay-2">
          <span style={s.noteDot} />
          <span style={s.noteText}>Only @pw.live accounts are permitted.</span>
        </div>

        <div style={s.divider} className="animate-in delay-3" />

        {/* Trust badges */}
        <div style={s.badges} className="animate-in delay-3">
          <TrustBadge icon={<ShieldIcon />} label="Secure login" />
          <TrustBadge icon={<BoltIcon />} label="Fast access" />
          <TrustBadge icon={<BuildingIcon />} label="Internal use" />
        </div>
      </div>

      {/* Corner sparkle */}
      <span style={s.sparkle} aria-hidden>✦</span>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={s.badge}>
      <span style={s.badgeIcon}>{icon}</span>
      <span style={s.badgeLabel}>{label}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.4-11.2-8H6.5C9.8 35.5 16.5 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C37 38.6 44 33 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
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
    padding: "24px 20px",
  },
  glow: {
    position: "absolute",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,199,0,0.28) 0%, rgba(255,199,0,0.06) 50%, transparent 70%)",
    opacity: 0.4,
    pointerEvents: "none",
    animation: "glow-pulse 6s ease-in-out infinite",
  },
  glowWhite: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  dotGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    zIndex: 10,
    width: "100%",
    maxWidth: 408,
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(32px)",
    WebkitBackdropFilter: "blur(32px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 28,
    padding: "44px 40px 40px",
    boxShadow: "0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.09)",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    marginBottom: 36,
  },
  logoBox: {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "linear-gradient(135deg, #FFC700 0%, #D4A000 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 18px rgba(255,199,0,0.35)",
    flexShrink: 0,
  },
  logoText: {
    fontWeight: 900,
    fontSize: 14,
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  brandName: {
    fontWeight: 600,
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    letterSpacing: -0.2,
  },
  headingBlock: {
    marginBottom: 32,
  },
  title: {
    fontSize: 38,
    fontWeight: 800,
    color: "#FFFFFF",
    letterSpacing: -1.8,
    lineHeight: 1.05,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.75,
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 11,
    width: "100%",
    padding: "14px 20px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 600,
    color: "#FFFFFF",
    transition: "all 0.2s ease",
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  btnSpinner: {
    display: "block",
    width: 17,
    height: 17,
    border: "2px solid rgba(255,255,255,0.18)",
    borderTopColor: "#FFC700",
    borderRadius: "50%",
    animation: "spin 0.75s linear infinite",
    flexShrink: 0,
  },
  noteRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  noteDot: {
    display: "block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#FFC700",
    flexShrink: 0,
    opacity: 0.8,
  },
  noteText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.1,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.07)",
    marginBottom: 24,
  },
  badges: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 13px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 100,
  },
  badgeIcon: {
    display: "flex",
    alignItems: "center",
    color: "rgba(255,255,255,0.35)",
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.1,
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 16px",
    background: "rgba(239,68,68,0.1)",
    border: "1px solid rgba(239,68,68,0.25)",
    borderRadius: 12,
    fontSize: 13,
    color: "#fca5a5",
    lineHeight: 1.5,
    marginBottom: 4,
  },
  errorIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
    color: "#f87171",
  },
  sparkle: {
    position: "fixed",
    bottom: 28,
    right: 28,
    fontSize: 22,
    color: "rgba(255,199,0,0.35)",
    pointerEvents: "none",
    userSelect: "none",
  },
};
