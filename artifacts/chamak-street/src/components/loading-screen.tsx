import { useState, useEffect } from "react";

const SESSION_KEY = "chamak_loaded";

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(!skip);

  useEffect(() => {
    if (skip) return;
    const t1 = setTimeout(() => setExiting(true), 2600);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setVisible(false);
    }, 3300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes chamakFadeIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes chamakFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes loaderBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes sunRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes shineSwipe {
          0%   { left: -60%; opacity: 0; }
          10%  { opacity: 1; }
          60%  { opacity: 1; }
          100% { left: 130%; opacity: 0; }
        }
        @keyframes logoGlow {
          0%,100% { filter: drop-shadow(0 0 10px rgba(255,102,0,0.55)) drop-shadow(0 0 30px rgba(255,102,0,0.2)); }
          50%     { filter: drop-shadow(0 0 22px rgba(255,204,0,0.9)) drop-shadow(0 0 55px rgba(255,102,0,0.45)); }
        }
        @keyframes screenFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        .chamak-loader-screen {
          animation: chamakFadeOut 0.7s ease forwards;
          animation-play-state: paused;
        }
        .chamak-loader-screen.exiting {
          animation-play-state: running;
        }
      `}</style>

      <div
        className={`chamak-loader-screen${exiting ? " exiting" : ""}`}
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#000", userSelect: "none",
        }}
      >
        {/* Ambient orange glow behind everything */}
        <div style={{
          position: "absolute", width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,102,0,0.12) 0%, transparent 65%)",
          top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          pointerEvents: "none",
        }} />

        {/* Rotating sun rays */}
        <div style={{
          position: "absolute",
          width: 520, height: 520,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: "sunRotate 8s linear infinite",
          pointerEvents: "none",
          background: `conic-gradient(
            rgba(255,140,0,0.13) 0deg,
            transparent 18deg,
            rgba(255,180,0,0.09) 36deg,
            transparent 54deg,
            rgba(255,120,0,0.11) 72deg,
            transparent 90deg,
            rgba(255,160,0,0.08) 108deg,
            transparent 126deg,
            rgba(255,140,0,0.12) 144deg,
            transparent 162deg,
            rgba(255,180,0,0.07) 180deg,
            transparent 198deg,
            rgba(255,140,0,0.10) 216deg,
            transparent 234deg,
            rgba(255,100,0,0.09) 252deg,
            transparent 270deg,
            rgba(255,160,0,0.11) 288deg,
            transparent 306deg,
            rgba(255,120,0,0.08) 324deg,
            transparent 342deg,
            rgba(255,140,0,0.13) 360deg
          )`,
          borderRadius: "50%",
        }} />

        {/* Logo wrapper — shine sweep container */}
        <div style={{
          position: "relative",
          animation: "chamakFadeIn 0.9s cubic-bezier(0.16,1,0.3,1) forwards",
          zIndex: 10,
          overflow: "visible",
        }}>
          {/* Shine sweep */}
          <div style={{
            position: "absolute",
            top: "-20%", bottom: "-20%",
            width: "40%",
            left: "-60%",
            background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)",
            transform: "skewX(-15deg)",
            animation: "shineSwipe 2.2s cubic-bezier(0.4,0,0.6,1) 0.6s forwards",
            pointerEvents: "none",
            zIndex: 11,
          }} />

          <img
            src="/chamak-logo-transparent.png"
            alt="Chamak Street"
            style={{
              height: "clamp(80px, 20vw, 170px)",
              width: "auto",
              objectFit: "contain",
              display: "block",
              animation: "logoGlow 2.4s ease-in-out 0.4s infinite",
            }}
            onError={e => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
          />
        </div>

        {/* Tagline */}
        <p style={{
          position: "relative", zIndex: 10,
          marginTop: 22,
          fontSize: 10, fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.55em",
          color: "rgba(255,255,255,0.28)",
          animation: "chamakFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 0.5s both",
          fontFamily: "inherit",
        }}>
          Premium Streetwear · Dubai
        </p>

        {/* Loading bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: 2, borderRadius: 2,
          background: "linear-gradient(to right, #cc4400, #ff6600, #ffcc00)",
          animation: "loaderBar 2.4s cubic-bezier(0.22,1,0.36,1) forwards",
        }} />
      </div>
    </>
  );
}
