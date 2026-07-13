import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

/*
 * Sun ↔ Moon toggle with fully sequenced animation.
 *
 * Light → Dark  (~ 700 ms total)
 *   0 ms   rays retract inward, staggered fast-first
 *   180 ms moon mask slides in (crescent carves out)
 *   220 ms whole icon tilts 20° clockwise (moon settling)
 *   560 ms toggleColorMode() → page fades dark
 *   700 ms tiny stars fade in around the crescent
 *
 * Dark → Light  (~ 550 ms total)
 *   0 ms   stars fade out, moon un-tilts back to 0°
 *   80 ms  mask slides back out (crescent dissolves)
 *   380 ms toggleColorMode() → page fades light
 *   420 ms rays spring out, staggered
 */

const CX = 12, CY = 12;
const SUN_R = 5.5;
const IN_R  = 7.9,  OUT_R = 11.5;
const RAY_W = OUT_R - IN_R;   // 3.6
const RAY_H = 2.0;

// moonTX: CSS translateX applied to the mask-circle (lives at cx=12).
// TX_SUN  → mask circle far right, no overlap → sun fully visible
// TX_MOON → mask circle overlaps sun → left crescent visible
const TX_SUN  = 12;
const TX_MOON =  3.4;

// Tiny stars that appear around the moon
const STARS = [
  { x: 17.8, y:  6.5, r: 0.7 },
  { x: 19.5, y: 11.2, r: 0.5 },
  { x: 16.5, y: 17.2, r: 0.6 },
];

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";

  const [moonTX,    setMoonTX]    = useState(() => isLight ? TX_SUN  : TX_MOON);
  const [raysOut,   setRaysOut]   = useState(() => isLight);
  const [tilt,      setTilt]      = useState(() => isLight ? 0 : 20);   // deg
  const [stars,     setStars]     = useState(() => !isLight);
  const [busy,      setBusy]      = useState(false);
  const tids = useRef<ReturnType<typeof setTimeout>[]>([]);

  // External colorMode change → snap icon into correct state immediately
  useEffect(() => {
    tids.current.forEach(clearTimeout);
    tids.current = [];
    setMoonTX (isLight ? TX_SUN  : TX_MOON);
    setRaysOut(isLight);
    setTilt   (isLight ? 0 : 20);
    setStars  (!isLight);
    setBusy   (false);
  }, [colorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { tids.current.forEach(clearTimeout); }, []);

  const go = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    tids.current.push(id);
  };

  const handleClick = () => {
    if (busy) return;
    setBusy(true);
    tids.current.forEach(clearTimeout);
    tids.current = [];

    if (isLight) {
      // ── Light → Dark ──────────────────────────────────────────
      setRaysOut(false);                              // rays retract
      go(180, () => { setMoonTX(TX_MOON); });        // crescent carves in
      go(220, () => { setTilt(20); });               // icon tilts to moon angle
      go(560, () => { toggleColorMode(); });         // page fades dark
      go(700, () => { setStars(true); setBusy(false); }); // stars appear
    } else {
      // ── Dark → Light ───────────────────────────────────────────
      setStars(false);                               // stars fade out
      go( 80, () => { setMoonTX(TX_SUN); setTilt(0); }); // crescent dissolves + un-tilt
      go(380, () => { toggleColorMode(); setRaysOut(true); }); // page + rays
      go(560, () => { setBusy(false); });
    }
  };

  // ── Colours ───────────────────────────────────────────────────
  const bodyCol  = isLight ? "#ffcc00"               : "rgba(200,220,255,0.97)";
  const rayCol   = isLight ? "#ffcc00"               : "rgba(200,220,255,0.90)";
  const starCol  = "rgba(200,225,255,0.88)";
  const glowCol  = isLight ? "rgba(255,210,0,0.35)"  : "transparent";

  return (
    <button
      onClick={handleClick}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="relative flex items-center justify-center w-10 h-10 rounded-full
                 hover:bg-white/10 active:scale-90 transition-colors duration-200"
      style={{ outline: "none" }}
    >
      {/* Soft golden glow ring visible only in light mode */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          background: glowCol,
          boxShadow: isLight ? "0 0 14px 4px rgba(255,210,0,0.30)" : "none",
          transition: "background 0.55s ease, box-shadow 0.55s ease",
          pointerEvents: "none",
        }}
      />

      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          overflow: "visible",
          transform: `rotate(${tilt}deg)`,
          transition: "transform 0.55s cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}
      >
        <defs>
          {/*
           * Mask: white rect = keep visible; black circle = cut away.
           * Black circle translates from right (no cut, full sun) to slight
           * rightward overlap (carves left crescent → moon silhouette).
           */}
          <mask id="sun-moon-mask">
            <rect width="24" height="24" fill="white" />
            <circle
              cx={CX}
              cy={CY}
              r={SUN_R + 0.2}
              fill="black"
              style={{
                transform: `translateX(${moonTX}px)`,
                transition: "transform 0.52s cubic-bezier(0.4, 0, 0.2, 1)",
              } as React.CSSProperties}
            />
          </mask>
        </defs>

        {/* ── 8 rays ─────────────────────────────────────────── */}
        {Array.from({ length: 8 }).map((_, i) => {
          const extDelay = i * 0.045;
          const retDelay = (7 - i) * 0.030;
          return (
            <g key={i} transform={`rotate(${i * 45}, ${CX}, ${CY})`}>
              <rect
                x={IN_R}
                y={CY - RAY_H / 2}
                width={RAY_W}
                height={RAY_H}
                rx={RAY_H / 2}
                fill={rayCol}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "left center",
                  transform: raysOut ? "scaleX(1)" : "scaleX(0)",
                  opacity: raysOut ? 1 : 0,
                  transition: [
                    `transform 0.48s cubic-bezier(0.34,1.7,0.64,1) ${raysOut ? extDelay : retDelay}s`,
                    `opacity   0.30s ease                           ${raysOut ? extDelay : retDelay}s`,
                    `fill      0.50s ease`,
                  ].join(", "),
                } as React.CSSProperties}
              />
            </g>
          );
        })}

        {/* ── Sun / Moon body ─────────────────────────────────── */}
        <circle
          cx={CX}
          cy={CY}
          r={SUN_R}
          fill={bodyCol}
          mask="url(#sun-moon-mask)"
          style={{ transition: "fill 0.55s ease" }}
        />

        {/* ── Three tiny stars (visible in dark / moon mode) ──── */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={starCol}
            style={{
              opacity: stars ? 1 : 0,
              transform: stars ? "scale(1)" : "scale(0)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: [
                `opacity   0.35s ease ${stars ? 0.06 + i * 0.08 : 0}s`,
                `transform 0.35s cubic-bezier(0.34,1.6,0.64,1) ${stars ? 0.06 + i * 0.08 : 0}s`,
              ].join(", "),
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </button>
  );
}
