import { useTheme } from "@/lib/theme-context";

const RAY_COUNT = 8;
const RAY_INNER = 7.8;   // starts just outside the circle (r=5.5)
const RAY_OUTER = 11.5;  // tip of the ray
const RAY_LEN   = RAY_OUTER - RAY_INNER; // ≈ 3.7

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";

  return (
    <button
      onClick={toggleColorMode}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 transition-colors duration-200 active:scale-90"
      style={{ outline: "none" }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{ overflow: "visible" }}
      >
        {/* Sun circle */}
        <circle
          cx="12"
          cy="12"
          r="5.5"
          style={{
            fill: isLight ? "rgba(255,200,50,1)" : "rgba(255,255,255,0.88)",
            transition: "fill 0.5s ease",
          }}
        />

        {/* Half-shadow slice (the "pie" wedge from the reference image) */}
        <path
          d="M12 6.5 A5.5 5.5 0 0 1 12 17.5 Z"
          style={{
            fill: isLight ? "rgba(255,140,0,0.55)" : "rgba(180,180,180,0.45)",
            transition: "fill 0.5s ease",
          }}
        />

        {/* 8 rays — drawn outer→inner so dashoffset retracts tips inward */}
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const angle = (i * (360 / RAY_COUNT) * Math.PI) / 180;
          const x1 = 12 + RAY_OUTER * Math.cos(angle); // tip (outer)
          const y1 = 12 + RAY_OUTER * Math.sin(angle);
          const x2 = 12 + RAY_INNER * Math.cos(angle); // base (inner)
          const y2 = 12 + RAY_INNER * Math.sin(angle);
          const delay = i * 0.04;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeDasharray={RAY_LEN}
              style={{
                stroke: isLight ? "rgba(255,195,40,0.95)" : "rgba(255,255,255,0.9)",
                /* dashoffset=0 → full ray; dashoffset=RAY_LEN → ray retracted into sun */
                strokeDashoffset: isLight ? 0 : RAY_LEN,
                transition: [
                  `stroke-dashoffset 0.42s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
                  `stroke 0.4s ease`,
                ].join(", "),
              }}
            />
          );
        })}
      </svg>
    </button>
  );
}
