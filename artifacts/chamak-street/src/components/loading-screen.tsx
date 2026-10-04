import { useEffect, useState } from "react";

const SESSION_KEY = "firstpick_loaded";
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type BootStep = "Starting app" | "Loading store settings" | "Preparing fonts" | "Checking first page";

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
}

function waitForFonts() {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  return fonts?.ready ? fonts.ready.then(() => undefined).catch(() => undefined) : Promise.resolve();
}

function waitForInitialRoute() {
  if ((window as Window & { __firstpickRouteReady?: boolean }).__firstpickRouteReady) return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("firstpick:route-ready", () => resolve(), { once: true }));
}

async function confirmSettingsReady() {
  const [settingsResponse, operationalResponse] = await Promise.all([
    fetch(`${BASE}/api/settings`, { credentials: "include", cache: "no-store" }),
    fetch(`${BASE}/api/settings/operational`, { credentials: "include", cache: "no-store" }),
  ]);
  if ((!settingsResponse.ok && settingsResponse.status !== 304) || (!operationalResponse.ok && operationalResponse.status !== 304)) {
    throw new Error("Store settings could not be loaded");
  }
}

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
  const [step, setStep] = useState<BootStep>("Starting app");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (skip) return;
    let cancelled = false;
    let exitTimer: number | undefined;
    const slowLoadTimer = window.setTimeout(() => {
      if (!cancelled) setFailed(true);
    }, 15_000);

    const complete = () => {
      if (cancelled) return;
      setProgress(100);
      setStep("Checking first page");
      requestAnimationFrame(() => setExiting(true));
      exitTimer = window.setTimeout(() => {
        if (cancelled) return;
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        window.dispatchEvent(new Event("firstpick:boot-complete"));
        setVisible(false);
      }, 360);
    };

    const boot = async () => {
      try {
        setProgress(20);
        setStep("Loading store settings");
        const settingsReady = confirmSettingsReady();

        setProgress(40);
        setStep("Preparing fonts");
        const fontsReady = waitForFonts();

        setProgress(60);
        setStep("Checking first page");
        await Promise.all([settingsReady, fontsReady, waitForWindowLoad(), waitForInitialRoute()]);
        window.clearTimeout(slowLoadTimer);
        complete();
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      if (exitTimer) window.clearTimeout(exitTimer);
      window.clearTimeout(slowLoadTimer);
    };
  }, [skip]);

  if (!visible) return null;

  return (
    <>
      <style>{`
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
          animation: exiting ? "fpFadeOut 0.36s cubic-bezier(0.4,0,1,1) forwards" : undefined,
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

        {/* A small one-time readiness scan; completion itself is data-driven. */}
        <div style={{
          position: "absolute", left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,100,0,0.6) 40%, rgba(255,200,0,0.4) 60%, transparent 100%)",
          animation: "fpScan 1.4s ease-in-out forwards",
          pointerEvents: "none",
          boxShadow: "0 0 12px rgba(255,102,0,0.5)",
        }} />
        <div style={{
          position: "absolute", left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,200,0,0.2) 50%, transparent 100%)",
          animation: "fpScan2 2s 0.6s ease-in-out forwards",
          pointerEvents: "none",
        }} />

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
          display: "flex", alignItems: "baseline", gap: 0,
        }}>
          <span style={{
            fontSize: "clamp(56px, 12vw, 104px)",
            fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
            fontWeight: 900, color: "#fff",
            letterSpacing: "-2px", lineHeight: 1,
            animation: "fpFlicker 4s 1s ease infinite",
          }}>FIRST</span>
          <span style={{
            fontSize: "clamp(56px, 12vw, 104px)",
            fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
            fontWeight: 900, letterSpacing: "-2px", lineHeight: 1,
            background: "linear-gradient(180deg, #ff5200 0%, #ffb300 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "fpFlicker 4s 1.2s ease infinite",
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
          animation: "fpSub 0.6s 0.2s ease both", opacity: 0,
        }}>
          {[0, 0.18, 0.36].map((delay, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: i === 1 ? "linear-gradient(135deg,#ff5200,#ffb300)" : "rgba(255,255,255,0.2)",
              animation: `fpDotPulse 1.1s ${delay}s ease-in-out infinite`,
            }} />
          ))}
        </div>

        {/* Progress reflects completed readiness checks, not elapsed time. */}
        <div style={{
          position: "absolute", bottom: 32, right: 36,
          fontSize: "11px", fontWeight: 900, fontFamily: "monospace",
          color: "rgba(255,102,0,0.5)",
          letterSpacing: "0.1em",
          opacity: 0.65, zIndex: 2,
        }}>
          {failed ? "Still loading safely" : step}
        </div>

        {failed && (
          <button
            onClick={() => window.location.reload()}
            style={{
              position: "absolute", bottom: 60, zIndex: 3,
              border: "1px solid rgba(255,102,0,0.45)", background: "rgba(255,102,0,0.12)",
              color: "#ffd1a4", borderRadius: "8px", padding: "9px 14px",
              fontFamily: "monospace", fontSize: "10px", fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            Retry loading
          </button>
        )}

        {/* Version tag — bottom left */}
        <div style={{
          position: "absolute", bottom: 32, left: 36,
          fontSize: "9px", fontWeight: 700, fontFamily: "monospace",
          color: "rgba(255,255,255,0.12)",
          letterSpacing: "0.15em", textTransform: "uppercase",
          opacity: 0.45, zIndex: 2,
        }}>
          {progress}% ready
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
