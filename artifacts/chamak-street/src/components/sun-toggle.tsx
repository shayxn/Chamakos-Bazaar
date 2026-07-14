import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

const CX = 12, CY = 12;
const SUN_R = 5.5;
const IN_R  = 7.9,  OUT_R = 11.5;
const RAY_W = OUT_R - IN_R;
const RAY_H = 2.0;

const TX_SUN  = 12;   // mask circle far right  → no crescent → full sun
const TX_MOON = 3.4;  // mask circle overlaps   → crescent left side visible

const STARS = [
  { x: 17.8, y:  6.5, r: 0.7 },
  { x: 19.5, y: 11.2, r: 0.5 },
  { x: 16.5, y: 17.2, r: 0.6 },
];

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";
  const uid = useId().replace(/:/g, "-");
  const maskId = `sun-moon-mask-${uid}`;

  const [moonTX,  setMoonTX]  = useState(() => isLight ? TX_SUN  : TX_MOON);
  const [raysOut, setRaysOut] = useState(() => isLight);
  const [tilt,    setTilt]    = useState(() => isLight ? 0 : 20);
  const [stars,   setStars]   = useState(() => !isLight);

  const tids     = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skipSync = useRef(false);
  const intended = useRef(colorMode);

  useEffect(() => {
    intended.current = colorMode;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    tids.current.forEach(clearTimeout);
    tids.current = [];
    setMoonTX (isLight ? TX_SUN  : TX_MOON);
    setRaysOut(isLight);
    setTilt   (isLight ? 0 : 20);
    setStars  (!isLight);
  }, [colorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { tids.current.forEach(clearTimeout); }, []);

  const go = (ms: number, fn: () => void) => {
    const id = setTimeout(fn, ms);
    tids.current.push(id);
  };

  const handleClick = () => {
    tids.current.forEach(clearTimeout);
    tids.current = [];

    const goingLight = intended.current === "dark";
    intended.current = goingLight ? "light" : "dark";

    // ── Toggle the page color IMMEDIATELY so it never feels broken ──
    skipSync.current = true;
    toggleColorMode();

    if (goingLight) {
      // Dark → Light: stars disappear, sun body slides in, rays spring out
      setStars(false);
      go( 80, () => { setMoonTX(TX_SUN); setTilt(0); });
      go(350, () => { setRaysOut(true); });
    } else {
      // Light → Dark: rays retract, crescent carves in, stars appear
      setRaysOut(false);
      go(180, () => { setMoonTX(TX_MOON); });
      go(220, () => { setTilt(20); });
      go(680, () => { setStars(true); });
    }
  };

  const bodyCol = isLight ? "#ff8800"              : "rgba(200,220,255,0.97)";
  const rayCol  = isLight ? "#ff8800"              : "rgba(200,220,255,0.90)";
  const glowCol = isLight ? "rgba(255,136,0,0.30)" : "transparent";

  return (
    <button
      onClick={handleClick}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="relative flex items-center justify-center w-12 h-12 rounded-full
                 hover:bg-white/10 active:scale-90 transition-colors duration-200"
      style={{ outline: "none" }}
    >
      {/* Glow ring */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          background: glowCol,
          boxShadow: isLight ? "0 0 16px 5px rgba(255,136,0,0.28)" : "none",
          transition: "background 0.55s ease, box-shadow 0.55s ease",
          pointerEvents: "none",
        }}
      />

      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          overflow: "visible",
          transform: `rotate(${tilt}deg)`,
          transition: "transform 0.55s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            <circle
              cx={CX}
              cy={CY}
              r={SUN_R + 0.2}
              fill="black"
              style={{
                transform: `translateX(${moonTX}px)`,
                transition: "transform 0.52s cubic-bezier(0.4,0,0.2,1)",
              } as React.CSSProperties}
            />
          </mask>
        </defs>

        {/* 8 rays */}
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

        {/* Sun / Moon body */}
        <circle
          cx={CX}
          cy={CY}
          r={SUN_R}
          fill={bodyCol}
          mask={`url(#${maskId})`}
          style={{ transition: "fill 0.55s ease" }}
        />

        {/* Three tiny stars (dark mode) */}
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill="rgba(200,225,255,0.88)"
            style={{
              opacity: stars ? 1 : 0,
              transform: stars ? "scale(1)" : "scale(0)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: [
                `opacity   0.35s ease                           ${stars ? 0.06 + i * 0.08 : 0}s`,
                `transform 0.35s cubic-bezier(0.34,1.6,0.64,1) ${stars ? 0.06 + i * 0.08 : 0}s`,
              ].join(", "),
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </button>
  );
}
