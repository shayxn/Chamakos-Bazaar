import { useState, useEffect } from "react";

const SESSION_KEY = "firstpick_loaded";
const TOTAL_DURATION = 2600;

export function LoadingScreen() {
  const [skip] = useState(() => {
    try {
      const path = window.location.pathname;
      if (path.includes("/admin") || path.includes("/login")) return true;
      return !!sessionStorage.getItem(SESSION_KEY);
    } catch { return false; }
  });
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(!skip);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"enter" | "logo" | "hold" | "exit">("enter");
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    if (skip) return;

    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_DURATION) * 100));
      setProgress(pct);
      setCounter(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const t0 = setTimeout(() => setPhase("logo"), 200);
    const t1 = setTimeout(() => setPhase("hold"), 800);
    const t2 = setTimeout(() => { setPhase("exit"); setExiting(true); }, TOTAL_DURATION);
    const t3 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setVisible(false);
    }, TOTAL_DURATION + 800);

    return () => { cancelAnimationFrame(raf); clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes fpReveal {
          0%   { opacity: 0; transform: scale(1.08) translateY(20px); filter: blur(20px); }
          50%  { filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes fpSub {
          from { opacity: 0; letter-spacing: 0.65em; transform: translateY(12px); }
          to   { opacity: 1; letter-spacing: 0.55em; transform: translateY(0); }
        }
        @keyframes fpBarIn {
          from { opacity: 0; transform: scaleX(0.3); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes fpFadeOut {
          0%   { opacity: 1; transform: scale(1); filter: blur(0px); }
          40%  { filter: blur(0px); }
          100% { opacity: 0; transform: scale(1.06); filter: blur(12px); }
        }
        @keyframes fpGlow {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50%      { opacity: 0.65; transform: scale(1.15); }
        }
        @keyframes fpGlow2 {
          0%, 100% { opacity: 0.12; transform: scale(1.1); }
          50%      { opacity: 0.3;  transform: scale(0.9); }
        }
        @keyframes fpScan {
          0%   { transform: translateY(-8px); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes fpScan2 {
          0%   { transform: translateY(100vh); opacity: 0; }
          5%   { opacity: 0.4; }
          95%  { opacity: 0.4; }
          100% { transform: translateY(-8px); opacity: 0; }
        }
        @keyframes fpDotPulse {
          0%, 100% { transform: scale(0.5); opacity: 0.2; }
          50%      { transform: scale(1.6); opacity: 1; }
        }
        @keyframes fpCorner {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fpGrid {
          from { opacity: 0; }
          to   { opacity: 0.04; }
        }
        @keyframes fpCounter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fpTagline {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 0.35; transform: translateX(0); }
        }
        @keyframes fpFlicker {
          0%,100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.7; }
          94% { opacity: 1; }
          96% { opacity: 0.85; }
          97% { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#000",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          animation: exiting ? "fpFadeOut 0.8s cubic-bezier(0.4,0,1,1) forwards" : undefined,
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid pattern */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,102,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "fpGrid 1.2s 0.3s ease both",
          opacity: 0,
          pointerEvents: "none",
        }} />

        {/* Primary ambient glow */}
        <div style={{
          position: "absolute",
          width: "min(800px, 120vw)", height: "min(800px, 120vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,90,0,0.09) 0%, rgba(255,50,0,0.04) 40%, transparent 68%)",
          animation: "fpGlow 3.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        {/* Secondary glow — yellow tint */}
        <div style={{
          position: "absolute",
          width: "min(500px, 80vw)", height: "min(500px, 80vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,200,0,0.06) 0%, transparent 70%)",
          animation: "fpGlow2 4.5s ease-in-out infinite",
          pointerEvents: "none",
        }} />

        {/* Scan line forward */}
        {phase === "enter" || phase === "logo" ? (
          <div style={{
            position: "absolute", left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,100,0,0.6) 40%, rgba(255,200,0,0.4) 60%, transparent 100%)",
            animation: "fpScan 1.4s ease-in-out forwards",
            pointerEvents: "none",
            boxShadow: "0 0 12px rgba(255,102,0,0.5)",
          }} />
        ) : null}
        {/* Scan line reverse */}
        {phase === "logo" ? (
          <div style={{
            position: "absolute", left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.2) 50%, transparent 100%)",
            animation: "fpScan2 2s 0.6s ease-in-out forwards",
            pointerEvents: "none",
          }} />
        ) : null}

        {/* Corner brackets — film reel markers */}
        {["topleft","topright","bottomleft","bottomright"].map((pos) => {
          const isRight = pos.includes("right");
          const isBottom = pos.includes("bottom");
          return (
            <div key={pos} style={{
              position: "absolute",
              top: isBottom ? "auto" : 28, bottom: isBottom ? 28 : "auto",
              left: isRight ? "auto" : 28, right: isRight ? 28 : "auto",
              width: 24, height: 24,
              borderTop: isBottom ? "none" : "1.5px solid rgba(255,102,0,0.5)",
              borderBottom: isBottom ? "1.5px solid rgba(255,102,0,0.5)" : "none",
              borderLeft: isRight ? "none" : "1.5px solid rgba(255,102,0,0.5)",
              borderRight: isRight ? "1.5px solid rgba(255,102,0,0.5)" : "none",
              animation: "fpCorner 0.6s 0.4s ease both",
              opacity: 0,
            }} />
          );
        })}

        {/* Logo wordmark */}
        <div style={{
          position: "relative", zIndex: 1,
          animation: phase === "enter" ? undefined : "fpReveal 1.0s cubic-bezier(0.16,1,0.3,1) both",
          display: "flex", alignItems: "baseline", gap: 0,
        }}>
          <span style={{
            fontSize: "clamp(56px, 12vw, 104px)",
            fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
            fontWeight: 900, color: "#fff",
            letterSpacing: "-2px", lineHeight: 1,
            animation: phase === "hold" ? "fpFlicker 4s 1s ease infinite" : undefined,
          }}>FIRST</span>
          <span style={{
            fontSize: "clamp(56px, 12vw, 104px)",
            fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
            fontWeight: 900, letterSpacing: "-2px", lineHeight: 1,
            background: "linear-gradient(180deg, #ff5200 0%, #ffb300 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: phase === "hold" ? "fpFlicker 4s 1.2s ease infinite" : undefined,
          }}>PICK</span>
        </div>

        {/* Tagline */}
        <p style={{
          marginTop: 18,
          fontSize: "clamp(8px, 1.2vw, 10px)",
          fontWeight: 900, fontFamily: "inherit",
          letterSpacing: "0.55em",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          animation: "fpSub 0.9s 0.7s cubic-bezier(0.16,1,0.3,1) both",
          position: "relative", zIndex: 1,
        }}>
          Authentic · Premium · Dubai
        </p>

        {/* Loading dots */}
        <div style={{
          display: "flex", gap: 8, marginTop: 28,
          position: "relative", zIndex: 1,
          animation: "fpSub 0.6s 0.9s ease both", opacity: 0,
        }}>
          {[0, 0.18, 0.36].map((delay, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === 1 ? "linear-gradient(135deg,#ff5200,#ffb300)" : "rgba(255,255,255,0.2)",
              animation: `fpDotPulse 1.1s ${delay}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Percentage counter — bottom right */}
        <div style={{
          position: "absolute", bottom: 32, right: 36,
          fontSize: "11px", fontWeight: 900, fontFamily: "monospace",
          color: "rgba(255,102,0,0.5)",
          letterSpacing: "0.1em",
          animation: "fpCounter 0.5s 0.5s ease both",
          opacity: 0, zIndex: 2,
        }}>
          {String(counter).padStart(3, "0")}%
        </div>

        {/* Version tag — bottom left */}
        <div style={{
          position: "absolute", bottom: 32, left: 36,
          fontSize: "9px", fontWeight: 700, fontFamily: "monospace",
          color: "rgba(255,255,255,0.12)",
          letterSpacing: "0.15em", textTransform: "uppercase",
          animation: "fpCounter 0.5s 0.5s ease both",
          opacity: 0, zIndex: 2,
        }}>
          Dubai · UAE
        </div>

        {/* Progress bar */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 2, background: "rgba(255,255,255,0.04)",
          animation: "fpBarIn 0.6s 0.4s ease both",
        }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(to right, #cc3300, #ff5200, #ffb300)",
            boxShadow: "0 0 20px rgba(255,102,0,0.9), 0 0 6px rgba(255,200,0,0.5)",
            transition: "width 0.05s linear",
            borderRadius: "0 1px 1px 0",
          }} />
        </div>
      </div>
    </>
  );
}
