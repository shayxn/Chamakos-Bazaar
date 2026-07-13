import { useTheme } from "@/lib/theme-context";
import { useEffect, useRef } from "react";

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isDark = colorMode === "dark";
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={btnRef}
      onClick={toggleColorMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-300 hover:bg-white/10 active:scale-90"
      style={{ outline: "none" }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className="sun-toggle-svg"
        style={{ overflow: "visible" }}
      >
        {/* Sun circle */}
        <circle
          cx="12"
          cy="12"
          r="5"
          fill={isDark ? "rgba(255,255,255,0.85)" : "rgba(255,200,50,1)"}
          style={{ transition: "fill 0.5s ease, r 0.5s ease" }}
        />

        {/* Half-shadow slice for the "half-sun" look from the image */}
        <path
          d="M12 7 A5 5 0 0 1 12 17 Z"
          fill={isDark ? "rgba(255,255,255,0.45)" : "rgba(255,140,0,0.7)"}
          style={{ transition: "fill 0.5s ease" }}
        />

        {/* 8 rays */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const innerR = isDark ? 0 : 8.5;
          const outerR = isDark ? 0 : 11.5;
          const x1 = 12 + innerR * Math.cos(angle);
          const y1 = 12 + innerR * Math.sin(angle);
          const x2 = 12 + outerR * Math.cos(angle);
          const y2 = 12 + outerR * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isDark ? "rgba(255,255,255,0)" : "rgba(255,200,50,0.9)"}
              strokeWidth="1.8"
              strokeLinecap="round"
              style={{
                transition: `x1 0.4s ease ${i * 0.03}s, y1 0.4s ease ${i * 0.03}s, x2 0.4s ease ${i * 0.03}s, y2 0.4s ease ${i * 0.03}s, stroke 0.4s ease`,
              }}
            />
          );
        })}
      </svg>
    </button>
  );
}
