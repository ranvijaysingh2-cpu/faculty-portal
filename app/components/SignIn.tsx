"use client";

import { googleSignIn } from "@/app/actions";

export default function SignIn() {
  return (
    <div style={styles.page}>
      {/* Background blobs */}
      <div style={{ ...styles.blob, top: "-80px", left: "-80px" }} />
      <div style={{ ...styles.blob, bottom: "-80px", right: "-80px", opacity: 0.5 }} />

      <div style={styles.card}>
        {/* Logo / wordmark */}
        <div style={styles.logoRow}>
          <div style={styles.logoBox}>
            <span style={styles.logoText}>PW</span>
          </div>
          <span style={styles.brandName}>Physics Wallah</span>
        </div>

        <h1 style={styles.title}>Faculty Portal</h1>
        <p style={styles.subtitle}>
          Access your result PDFs securely.<br />
          Sign in with your <strong>@pw.live</strong> account.
        </p>

        <form action={googleSignIn}>
          <button
            type="submit"
            style={styles.googleBtn}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0";
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </form>

        <p style={styles.note}>Only @pw.live accounts are permitted.</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.2 0-9.6-3.4-11.2-8H6.5C9.8 35.5 16.5 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C37 38.6 44 33 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1A1A1A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "#FFC700",
    opacity: 0.15,
    filter: "blur(80px)",
    pointerEvents: "none",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "48px 44px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    position: "relative",
    zIndex: 1,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#FFC700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontWeight: 900,
    fontSize: 16,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  brandName: {
    fontWeight: 700,
    fontSize: 18,
    color: "#1A1A1A",
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: "#1A1A1A",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 1.6,
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "12px 20px",
    border: "1.5px solid #ddd",
    borderRadius: 10,
    background: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
    color: "#1A1A1A",
  },
  note: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
};
