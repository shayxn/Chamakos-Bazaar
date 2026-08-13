import { useState, useEffect } from "react";

const SESSION_KEY = "firstpick_loaded";
const TOTAL_DURATION = 2200;

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
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

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

    const t1 = setTimeout(() => setPhase("hold"), 600);
    const t2 = setTimeout(() => { setPhase("exit"); setExiting(true); }, TOTAL_DURATION);
    const t3 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
      setVisible(false);
    }, TOTAL_DURATION + 700);

    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes fpReveal {
          0%   { opacity: 0; transform: scale(1.06) translateY(12px); filter: blur(16px); }
          60%  { opacity: 1; filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes fpSub {
          from { opacity: 0; letter-spacing: 0.6em; transform: translateY(10px); }
          to   { opacity: 1; letter-spacing: 0.55em; transform: translateY(0); }
        }
        @keyframes fpBarIn {
          from { opacity: 0; transform: scaleX(0.4); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes fpFadeOut {
          0%   { opacity: 1; transform: scale(1); }
          60%  { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.04); }
        }
        @keyframes fpGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50%      { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes fpScan {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes fpDotPulse {
          0%, 100% { transform: scale(0.6); opacity: 0.3; }
          50%      { transform: scale(1.4); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#000",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          animation: exiting ? "fpFadeOut 0.7s cubic-bezier(0.4,0,1,1) forwards" : undefined,
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Layered ambient glows */}
        <div style={{
          position: "absolute",
          width: "min(700px, 100vw)",
          height: "min(700px, 100vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,102,0,0.08) 0%, rgba(255,60,0,0.04) 40%, transparent 70%)",
          animation: "fpGlow 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          width: "min(400px, 60vw)",
          height: "min(400px, 60vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,200,0,0.04) 0%, transparent 70%)",
          animation: "fpGlow 4s ease-in-out infinite reverse",
          pointerEvents: "none",
        }} />

        {/* Scan line */}
        {phase === "enter" && (
          <div style={{
            position: "absolute",
            left: 0, right: 0,
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(255,102,0,0.4) 50%, transparent 100%)",
            animation: "fpScan 1.2s ease-in-out forwards",
            pointerEvents: "none",
          }} />
        )}

        {/* Logo wordmark */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            animation: "fpReveal 0.9s cubic-bezier(0.16,1,0.3,1) both",
            display: "flex",
            alignItems: "baseline",
            gap: "0px",
          }}
        >
          <span style={{
            fontSize: "clamp(52px, 11vw, 96px)",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}>
            FIRST
          </span>
          <span style={{
            fontSize: "clamp(52px, 11vw, 96px)",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            fontWeight: 900,
            letterSpacing: "-2px",
            lineHeight: 1,
            background: "linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            PICK
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            marginTop: 20,
            fontSize: "clamp(8px, 1.3vw, 11px)",
            fontWeight: 900,
            fontFamily: "inherit",
            letterSpacing: "0.55em",
            color: "rgba(255,255,255,0.28)",
            textTransform: "uppercase",
            animation: "fpSub 0.8s 0.5s cubic-bezier(0.16,1,0.3,1) both",
            position: "relative",
            zIndex: 1,
          }}
        >
          Authentic · Premium · Dubai
        </p>

        {/* Animated dots */}
        <div style={{
          display: "flex",
          gap: "8px",
          marginTop: 28,
          position: "relative",
          zIndex: 1,
          animation: "fpSub 0.6s 0.7s ease both",
          opacity: 0,
        }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div key={i} style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: i === 1 ? "linear-gradient(135deg,#ff6600,#ffcc00)" : "rgba(255,255,255,0.3)",
              animation: `fpDotPulse 1.2s ${delay}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            height: 2,
            background: "rgba(255,255,255,0.05)",
            animation: "fpBarIn 0.5s 0.3s ease both",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(to right, #cc4400, #ff6600, #ffaa00)",
              boxShadow: "0 0 16px rgba(255,102,0,0.8)",
              transition: "width 0.06s linear",
              borderRadius: "0 1px 1px 0",
            }}
          />
        </div>
      </div>
    </>
  );
}
