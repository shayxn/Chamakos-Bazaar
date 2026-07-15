import { useState, useEffect } from "react";

const SESSION_KEY = "chamak_loaded";
const TOTAL_DURATION = 1800;

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(!skip);
  const [progress, setProgress] = useState(0);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    if (skip) return;

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_DURATION) * 100));
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const t1 = setTimeout(() => setExiting(true), TOTAL_DURATION);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setVisible(false);
    }, TOTAL_DURATION + 500);

    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes csLogoReveal {
          0%   { opacity: 0; transform: scale(1.08); filter: blur(12px); }
          40%  { opacity: 1; filter: blur(0px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        @keyframes csTaglineIn {
          from { opacity: 0; letter-spacing: 0.35em; transform: translateY(8px); }
          to   { opacity: 1; letter-spacing: 0.55em; transform: translateY(0); }
        }
        @keyframes csBarIn {
          from { opacity: 0; transform: scaleX(0.6); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes csFadeOut {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes csGlowPulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#000",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          animation: exiting ? "csFadeOut 0.5s cubic-bezier(0.4,0,1,1) forwards" : undefined,
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow behind logo */}
        <div style={{
          position: "absolute",
          width: "min(600px, 80vw)",
          height: "min(600px, 80vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,102,0,0.12) 0%, transparent 70%)",
          animation: "csGlowPulse 2.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Logo — high-res, mix-blend-mode:screen makes the dark bg invisible */}
        <img
          src="/chamak-logo.png"
          alt="Chamak Street"
          onLoad={() => setLogoReady(true)}
          onError={(e) => { setLogoReady(true); }}
          style={{
            width: "min(52vw, 420px)",
            height: "auto",
            maxHeight: "45vh",
            objectFit: "contain",
            display: "block",
            mixBlendMode: "screen",
            animation: logoReady
              ? "csLogoReveal 0.9s cubic-bezier(0.16,1,0.3,1) both"
              : undefined,
            opacity: logoReady ? undefined : 0,
            position: "relative",
            zIndex: 1,
          }}
        />

        {/* Tagline */}
        <p
          style={{
            marginTop: 28,
            fontSize: "clamp(9px, 1.4vw, 12px)",
            fontWeight: 900,
            fontFamily: "inherit",
            letterSpacing: "0.55em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            animation: logoReady
              ? "csTaglineIn 0.8s 0.35s cubic-bezier(0.16,1,0.3,1) both"
              : undefined,
            opacity: logoReady ? undefined : 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          Premium Streetwear · Dubai
        </p>

        {/* Progress bar — pinned to bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "rgba(255,255,255,0.06)",
            animation: "csBarIn 0.5s 0.2s ease both",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(to right, #cc4400, #ff6600, #ffaa00)",
              boxShadow: "0 0 12px rgba(255,102,0,0.7)",
              transition: "width 0.06s linear",
              borderRadius: "0 1px 1px 0",
            }}
          />
        </div>
      </div>
    </>
  );
}
