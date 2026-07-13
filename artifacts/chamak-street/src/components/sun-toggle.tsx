import { useTheme } from "@/lib/theme-context";

/*
 * Matches the iOS "brightness" icon from the reference image:
 *  - Circle with right half solid, left half shadowed (half-moon effect)
 *  - 8 short rounded rays evenly spaced around the circle
 *  - All one colour (white in dark-mode, gold in light-mode)
 */

const CX = 12;
const CY = 12;
const SUN_R   = 5.3;    // circle radius
const IN_R    = 7.6;    // inner edge of ray  (gap = 7.6 - 5.3 = 2.3 from circle)
const OUT_R   = 10.8;   // outer tip of ray
const RAY_W   = OUT_R - IN_R;  // 3.2 units
const RAY_H   = 1.85;          // thickness (rounded)

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";

  const col = isLight ? "#ffcc00" : "#ffffff";

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
        {/* ── 8 rays — scaleX from inner edge outward ── */}
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 45}, ${CX}, ${CY})`}>
            <rect
              x={IN_R}
              y={CY - RAY_H / 2}
              width={RAY_W}
              height={RAY_H}
              rx={RAY_H / 2}
              fill={col}
              style={{
                transformBox: "fill-box",
                transformOrigin: "left center",
                transform: isLight ? "scaleX(1)" : "scaleX(0)",
                opacity: isLight ? 1 : 0,
                transition: [
                  `transform 0.46s cubic-bezier(0.34,1.6,0.64,1) ${i * 0.04}s`,
                  `opacity 0.28s ease ${isLight ? i * 0.04 : 0}s`,
                  `fill 0.45s ease`,
                ].join(", "),
              } as React.CSSProperties}
            />
          </g>
        ))}

        {/* ── RIGHT half — solid (the "bright" side) ── */}
        <path
          d={`M${CX} ${CY - SUN_R} A${SUN_R} ${SUN_R} 0 0 1 ${CX} ${CY + SUN_R} Z`}
          fill={col}
          style={{ transition: "fill 0.45s ease" }}
        />

        {/* ── LEFT half — slightly dimmed (shadow side like the reference image) ── */}
        <path
          d={`M${CX} ${CY - SUN_R} A${SUN_R} ${SUN_R} 0 0 0 ${CX} ${CY + SUN_R} Z`}
          fill={col}
          style={{
            opacity: 0.38,
            transition: "fill 0.45s ease",
          }}
        />
      </svg>
    </button>
  );
}
