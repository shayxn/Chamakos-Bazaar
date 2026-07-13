import { useTheme } from "@/lib/theme-context";

// Geometry
const SUN_R   = 5.3;    // sun circle radius
const IN_R    = 7.6;    // ray inner edge (just clears the sun circle)
const OUT_R   = 11.4;   // ray outer tip
const RAY_W   = OUT_R - IN_R;   // 3.8 units
const RAY_H   = 1.9;            // stroke-equivalent thickness

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";

  const circleColor  = isLight ? "#ffcc00"              : "rgba(255,255,255,0.92)";
  const shadowColor  = isLight ? "rgba(255,138,0,0.5)"  : "rgba(150,150,150,0.42)";
  const rayColor     = isLight ? "#ffcc00"              : "rgba(255,255,255,0.88)";

  return (
    <button
      onClick={toggleColorMode}
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
        {/* ── 8 rays using <rect> + CSS scaleX from the inner edge ── */}
        {Array.from({ length: 8 }).map((_, i) => {
          const delay = i * 0.045;
          return (
            <g key={i} transform={`rotate(${i * 45}, 12, 12)`}>
              <rect
                x={IN_R}
                y={12 - RAY_H / 2}
                width={RAY_W}
                height={RAY_H}
                rx={RAY_H / 2}
                fill={rayColor}
                style={{
                  transformBox: "fill-box",
                  /*
                   * transformOrigin "left center" = inner edge of the rect (near sun).
                   * scaleX(0) collapses the OUTER tip inward  → ray retracts into sun.
                   * scaleX(1) extends back to full length     → ray shoots out.
                   */
                  transformOrigin: "left center",
                  transform: isLight ? "scaleX(1)" : "scaleX(0)",
                  transition: [
                    `transform 0.44s cubic-bezier(0.34,1.56,0.64,1) ${delay}s`,
                    `fill 0.4s ease`,
                  ].join(", "),
                } as React.CSSProperties}
              />
            </g>
          );
        })}

        {/* ── Sun circle (rendered on top of ray bases) ── */}
        <circle
          cx="12"
          cy="12"
          r={SUN_R}
          style={{
            fill: circleColor,
            transition: "fill 0.5s ease",
          }}
        />

        {/* ── Half-shadow wedge (matches the reference image aesthetic) ── */}
        <path
          d={`M12 ${12 - SUN_R} A${SUN_R} ${SUN_R} 0 0 1 12 ${12 + SUN_R} Z`}
          style={{
            fill: shadowColor,
            transition: "fill 0.5s ease",
          }}
        />
      </svg>
    </button>
  );
}
