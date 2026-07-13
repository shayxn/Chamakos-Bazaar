import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

/*
 * Animation sequence  Light → Dark:
 *   0 ms   – rays start retracting (staggered scaleX + opacity)
 *   220 ms – mask circle slides in from the right → carves crescent (moon appears)
 *   560 ms – toggleColorMode() called (page fades to dark)
 *
 * Animation sequence  Dark → Light:
 *   0 ms   – mask circle slides back out to the right (moon dissolves into full circle)
 *   350 ms – toggleColorMode() called (page fades to light), rays start extending
 */

const CX = 12, CY = 12;
const SUN_R = 5.3;
const IN_R  = 7.6,  OUT_R = 10.8;
const RAY_W = OUT_R - IN_R;
const RAY_H = 1.85;

// The mask circle lives at (cx=12, cy=12). CSS translateX moves it right.
// moonTX=11  → mask circle at x=23, no overlap → sun circle fully visible
// moonTX=3.6 → mask circle at x=15.6, overlaps right side → left crescent visible
const TX_SUN  = 11;   // hidden (sun state)
const TX_MOON = 3.6;  // crescent carved (moon state)

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";

  // Local animation state — decoupled from global colorMode so we can sequence
  const [moonTX, setMoonTX]   = useState(() => isLight ? TX_SUN  : TX_MOON);
  const [raysOut, setRaysOut] = useState(() => isLight);
  const [busy, setBusy]       = useState(false);
  const tids = useRef<ReturnType<typeof setTimeout>[]>([]);

  // If something externally flips colorMode, snap the icon into sync
  useEffect(() => {
    setMoonTX(isLight ? TX_SUN : TX_MOON);
    setRaysOut(isLight);
  }, [colorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const schedule = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    tids.current.push(id);
  };

  const handleClick = () => {
    if (busy) return;
    setBusy(true);
    tids.current.forEach(clearTimeout);
    tids.current = [];

    if (isLight) {
      // ── Light → Dark ──
      setRaysOut(false);                                     // rays retract
      schedule(220, () => setMoonTX(TX_MOON));              // moon slides in
      schedule(560, () => { toggleColorMode(); setBusy(false); }); // page switches
    } else {
      // ── Dark → Light ──
      setMoonTX(TX_SUN);                                    // moon slides out
      schedule(350, () => {
        toggleColorMode();                                   // page switches
        setRaysOut(true);                                    // rays extend
        setBusy(false);
      });
    }
  };

  useEffect(() => () => { tids.current.forEach(clearTimeout); }, []);

  const sunColor  = isLight ? "#ffcc00"              : "rgba(210,225,255,0.95)";
  const rayColor  = isLight ? "#ffcc00"              : "rgba(210,225,255,0.9)";

  return (
    <button
      onClick={handleClick}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="relative flex items-center justify-center w-9 h-9 rounded-full
                 hover:bg-white/10 active:scale-95 transition-colors duration-200"
      style={{ outline: "none" }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/*
           * Mask: white rect = show everything; black circle = carve out.
           * Sliding the black circle rightward (translateX) creates a left-facing
           * crescent (the visible part of the sun) — classic moon silhouette.
           */}
          <mask id="sun-moon-mask">
            <rect width="24" height="24" fill="white" />
            <circle
              cx={CX}
              cy={CY}
              r={SUN_R + 0.15}       /* slightly larger so the crescent edge is clean */
              fill="black"
              style={{
                transform: `translateX(${moonTX}px)`,
                transition: "transform 0.48s cubic-bezier(0.4, 0, 0.2, 1)",
              } as React.CSSProperties}
            />
          </mask>
        </defs>

        {/* ── 8 rays ── */}
        {Array.from({ length: 8 }).map((_, i) => {
          // Retract in reverse order (outer rays first) for a nicer wipe
          const retractDelay = (7 - i) * 0.028;
          const extendDelay  = i * 0.042;
          return (
            <g key={i} transform={`rotate(${i * 45}, ${CX}, ${CY})`}>
              <rect
                x={IN_R}
                y={CY - RAY_H / 2}
                width={RAY_W}
                height={RAY_H}
                rx={RAY_H / 2}
                fill={rayColor}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "left center",
                  transform: raysOut ? "scaleX(1)" : "scaleX(0)",
                  opacity: raysOut ? 1 : 0,
                  transition: [
                    `transform 0.44s cubic-bezier(0.34,1.6,0.64,1) ${raysOut ? extendDelay : retractDelay}s`,
                    `opacity 0.28s ease ${raysOut ? extendDelay : retractDelay}s`,
                    `fill 0.45s ease`,
                  ].join(", "),
                } as React.CSSProperties}
              />
            </g>
          );
        })}

        {/* ── Sun / Moon circle ── */}
        <circle
          cx={CX}
          cy={CY}
          r={SUN_R}
          fill={sunColor}
          mask="url(#sun-moon-mask)"
          style={{ transition: "fill 0.5s ease" }}
        />
      </svg>
    </button>
  );
}
