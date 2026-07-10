import { useState, useEffect } from "react";

const SESSION_KEY = "chamak_loaded";
const TOTAL_DURATION = 1100;

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(!skip);
  const [progress, setProgress] = useState(0);

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
    }, TOTAL_DURATION + 350);

    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes chamakFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes chamakLogoIn {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes chamakBgShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(120deg, #000000, #1a0800, #4d1a00, #1a0800, #000000)",
          backgroundSize: "300% 300%",
          animation: exiting
            ? "chamakFadeOut 0.35s ease forwards"
            : "chamakBgShift 6s ease-in-out infinite",
          userSelect: "none",
        }}
      >
        <img
          src="/chamak-logo-transparent.png"
          alt="Chamak Street"
          style={{
            height: "clamp(110px, 26vw, 220px)",
            width: "auto",
            objectFit: "contain",
            display: "block",
            animation: "chamakLogoIn 0.4s ease-out both",
          }}
          onError={e => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
        />

        {/* Loading bar + percentage */}
        <div style={{ marginTop: 32, width: "min(240px, 60vw)" }}>
          <div style={{
            width: "100%", height: 3, borderRadius: 2,
            background: "rgba(255,255,255,0.1)", overflow: "hidden",
          }}>
            <div style={{
              width: `${progress}%`, height: "100%", borderRadius: 2,
              background: "linear-gradient(to right, #cc4400, #ff6600, #ffcc00)",
              transition: "width 0.05s linear",
            }} />
          </div>
          <p style={{
            marginTop: 10, textAlign: "center",
            fontSize: 11, fontWeight: 900, fontFamily: "inherit",
            letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)",
          }}>
            {progress}%
          </p>
        </div>
      </div>
    </>
  );
}
