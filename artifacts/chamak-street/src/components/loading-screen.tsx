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
    const t1 = setTimeout(() => setExiting(true), 2800);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setVisible(false);
    }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes loaderFadeOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes logoReveal {
          0%   { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes taglineReveal {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes loaderBar {
          from { width: 0%; }
          to   { width: 100%; }
        }

        /* ── SUN GLARE ── */
        @keyframes glareAppear {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          40%  { opacity: 1; }
          100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes glarePulse {
          0%,100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
          50%     { opacity: 1;    transform: translate(-50%, -50%) scale(1.08); }
        }

        /* ── ANAMORPHIC STREAK ── */
        @keyframes streakIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scaleX(0); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scaleX(1); }
          70%  { opacity: 0.7; }
          100% { opacity: 0.5; transform: translate(-50%, -50%) scaleX(1); }
        }

        /* ── LENS FLARE ARTIFACTS ── */
        @keyframes artifact1 {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.3); }
          40%  { opacity: 0.7; transform: translate(0, 0) scale(1); }
          100% { opacity: 0.5; transform: translate(0, 0) scale(1); }
        }
        @keyframes artifact2 {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.2); }
          50%  { opacity: 0.5; transform: translate(0, 0) scale(1); }
          100% { opacity: 0.35; transform: translate(0, 0) scale(1); }
        }

        /* ── RAYS ── */
        @keyframes raysAppear {
          0%   { opacity: 0; transform: translate(-50%, -50%) rotate(0deg) scale(0.6); }
          50%  { opacity: 0.35; }
          100% { opacity: 0.22; transform: translate(-50%, -50%) rotate(15deg) scale(1); }
        }

        /* ── LOGO GLOW ── */
        @keyframes logoGlow {
          0%,100% { filter: drop-shadow(0 0 8px rgba(255,200,80,0.5))
                           drop-shadow(0 0 30px rgba(255,140,0,0.3)); }
          50%     { filter: drop-shadow(0 0 18px rgba(255,220,100,1))
                           drop-shadow(0 0 60px rgba(255,160,0,0.6))
                           drop-shadow(0 0 100px rgba(255,100,0,0.25)); }
        }

        /* ── CORONA RING ── */
        @keyframes coronaGlow {
          0%,100% { opacity: 0.25; transform: translate(-50%,-50%) scale(1); }
          50%     { opacity: 0.45; transform: translate(-50%,-50%) scale(1.06); }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#000", userSelect: "none", overflow: "hidden",
          animation: exiting ? "loaderFadeOut 0.7s ease forwards" : "none",
        }}
      >
        {/* ── Deep ambient background glow ── */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,120,0,0.07) 0%, transparent 70%)",
        }} />

        {/* ── Sun rays (conic burst, slow drift) ── */}
        <div style={{
          position: "absolute", width: 900, height: 900,
          top: "50%", left: "50%",
          pointerEvents: "none",
          background: `conic-gradient(
            rgba(255,200,80,0.28) 0deg, transparent 6deg,
            rgba(255,180,60,0.18) 12deg, transparent 18deg,
            rgba(255,210,90,0.22) 24deg, transparent 30deg,
            rgba(255,170,50,0.15) 36deg, transparent 42deg,
            rgba(255,200,80,0.25) 48deg, transparent 54deg,
            rgba(255,180,60,0.20) 60deg, transparent 66deg,
            rgba(255,160,40,0.18) 72deg, transparent 78deg,
            rgba(255,200,80,0.22) 84deg, transparent 90deg,
            rgba(255,190,70,0.16) 96deg, transparent 102deg,
            rgba(255,210,90,0.24) 108deg, transparent 114deg,
            rgba(255,170,50,0.19) 120deg, transparent 126deg,
            rgba(255,200,80,0.21) 132deg, transparent 138deg,
            rgba(255,180,60,0.17) 144deg, transparent 150deg,
            rgba(255,160,40,0.23) 156deg, transparent 162deg,
            rgba(255,210,90,0.20) 168deg, transparent 174deg,
            rgba(255,200,80,0.16) 180deg, transparent 186deg,
            rgba(255,180,60,0.22) 192deg, transparent 198deg,
            rgba(255,170,50,0.18) 204deg, transparent 210deg,
            rgba(255,210,90,0.26) 216deg, transparent 222deg,
            rgba(255,200,80,0.20) 228deg, transparent 234deg,
            rgba(255,160,40,0.17) 240deg, transparent 246deg,
            rgba(255,190,70,0.23) 252deg, transparent 258deg,
            rgba(255,180,60,0.19) 264deg, transparent 270deg,
            rgba(255,210,90,0.21) 276deg, transparent 282deg,
            rgba(255,170,50,0.16) 288deg, transparent 294deg,
            rgba(255,200,80,0.24) 300deg, transparent 306deg,
            rgba(255,180,60,0.18) 312deg, transparent 318deg,
            rgba(255,210,90,0.22) 324deg, transparent 330deg,
            rgba(255,190,70,0.20) 336deg, transparent 342deg,
            rgba(255,200,80,0.28) 348deg, transparent 354deg,
            rgba(255,200,80,0.28) 360deg
          )`,
          borderRadius: "50%",
          animation: "raysAppear 0.8s cubic-bezier(0.2,0.8,0.4,1) 0.1s both",
        }} />

        {/* ── Corona outer ring ── */}
        <div style={{
          position: "absolute", width: 360, height: 360,
          top: "50%", left: "50%",
          pointerEvents: "none",
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(255,180,40,0.22) 70%, transparent 85%)",
          borderRadius: "50%",
          animation: "coronaGlow 1.8s ease-in-out 0.5s infinite",
        }} />

        {/* ── Main sun glare burst ── */}
        <div style={{
          position: "absolute",
          width: 280, height: 280,
          top: "50%", left: "50%",
          pointerEvents: "none",
          background: "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,250,200,0.95) 0%, rgba(255,220,80,0.7) 20%, rgba(255,160,20,0.4) 45%, rgba(255,100,0,0.12) 65%, transparent 80%)",
          borderRadius: "50%",
          animation: "glareAppear 0.6s cubic-bezier(0.2,0.8,0.4,1) 0.2s both, glarePulse 2s ease-in-out 1s infinite",
          mixBlendMode: "screen" as const,
        }} />

        {/* ── Anamorphic horizontal streak ── */}
        <div style={{
          position: "absolute",
          width: "85vw", height: 3,
          top: "50%", left: "50%",
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent 0%, rgba(180,220,255,0.15) 10%, rgba(200,235,255,0.55) 30%, rgba(255,250,240,0.95) 50%, rgba(200,235,255,0.55) 70%, rgba(180,220,255,0.15) 90%, transparent 100%)",
          animation: "streakIn 0.7s cubic-bezier(0.2,0.8,0.4,1) 0.3s both",
          boxShadow: "0 0 12px 3px rgba(180,230,255,0.35), 0 0 30px 6px rgba(150,210,255,0.15)",
        }} />

        {/* ── Anamorphic streak (warm) ── */}
        <div style={{
          position: "absolute",
          width: "70vw", height: 1,
          top: "calc(50% + 4px)", left: "50%",
          pointerEvents: "none",
          background: "linear-gradient(to right, transparent 0%, rgba(255,200,80,0.08) 15%, rgba(255,220,120,0.35) 40%, rgba(255,240,180,0.6) 50%, rgba(255,220,120,0.35) 60%, rgba(255,200,80,0.08) 85%, transparent 100%)",
          animation: "streakIn 0.7s cubic-bezier(0.2,0.8,0.4,1) 0.35s both",
        }} />

        {/* ── Lens flare artifact #1 (right side, cyan tint) ── */}
        <div style={{
          position: "absolute", width: 80, height: 80,
          top: "calc(50% - 40px)", left: "calc(50% + 22vw)",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 50%, rgba(180,230,255,0.55) 0%, rgba(150,210,255,0.25) 40%, transparent 70%)",
          borderRadius: "50%",
          animation: "artifact1 0.8s cubic-bezier(0.2,0.8,0.4,1) 0.45s both",
        }} />

        {/* ── Lens flare artifact #2 (further right, small warm) ── */}
        <div style={{
          position: "absolute", width: 44, height: 44,
          top: "calc(50% - 22px)", left: "calc(50% + 35vw)",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,220,80,0.6) 0%, rgba(255,180,40,0.25) 50%, transparent 75%)",
          borderRadius: "50%",
          animation: "artifact2 0.9s cubic-bezier(0.2,0.8,0.4,1) 0.5s both",
        }} />

        {/* ── Lens flare artifact #3 (left side, purple-cyan) ── */}
        <div style={{
          position: "absolute", width: 55, height: 55,
          top: "calc(50% - 28px)", left: "calc(50% - 28vw)",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 50%, rgba(200,180,255,0.5) 0%, rgba(160,200,255,0.2) 50%, transparent 75%)",
          borderRadius: "50%",
          animation: "artifact2 0.9s cubic-bezier(0.2,0.8,0.4,1) 0.55s both",
        }} />

        {/* ── Lens flare artifact #4 (small left) ── */}
        <div style={{
          position: "absolute", width: 28, height: 28,
          top: "calc(50% - 14px)", left: "calc(50% - 40vw)",
          pointerEvents: "none",
          background: "radial-gradient(ellipse at 50% 50%, rgba(255,240,150,0.65) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "artifact1 1s cubic-bezier(0.2,0.8,0.4,1) 0.6s both",
        }} />

        {/* ── Logo with glow ── */}
        <div style={{
          position: "relative", zIndex: 20,
          animation: "logoReveal 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both",
        }}>
          <img
            src="/chamak-logo-transparent.png"
            alt="Chamak Street"
            style={{
              height: "clamp(80px, 20vw, 170px)",
              width: "auto",
              objectFit: "contain",
              display: "block",
              animation: "logoGlow 2s ease-in-out 0.6s infinite",
            }}
            onError={e => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
          />
        </div>

        {/* ── Tagline ── */}
        <p style={{
          position: "relative", zIndex: 20,
          marginTop: 22,
          fontSize: 10, fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.55em",
          color: "rgba(255,255,255,0.28)",
          animation: "taglineReveal 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s both",
          fontFamily: "inherit",
        }}>
          Premium Streetwear · Dubai
        </p>

        {/* ── Progress bar ── */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, height: 2, borderRadius: 2,
          background: "linear-gradient(to right, #cc4400, #ff6600, #ffcc00)",
          animation: "loaderBar 2.6s cubic-bezier(0.22,1,0.36,1) forwards",
        }} />
      </div>
    </>
  );
}
