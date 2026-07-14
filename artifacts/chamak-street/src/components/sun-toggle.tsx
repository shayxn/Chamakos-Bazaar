import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme-context";

/* Unique ID that is always a valid CSS identifier (starts with letter, no --) */
function useSafeId(prefix: string) {
  const id = useRef("");
  if (!id.current) {
    id.current = prefix + Math.random().toString(36).slice(2, 8);
  }
  return id.current;
}

export function SunToggle() {
  const { colorMode, toggleColorMode } = useTheme();
  const isLight = colorMode === "light";
  const maskId = useSafeId("smask");

  /* Icon visual state — tracks INTENDED direction so rapid clicks work */
  const [sun, setSun] = useState(isLight);       // true = show sun, false = moon
  const tids = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skipEffect = useRef(false);
  const intended = useRef(colorMode);

  /* Sync icon when colorMode changes from OUTSIDE (e.g. another component) */
  useEffect(() => {
    intended.current = colorMode;
    if (skipEffect.current) { skipEffect.current = false; return; }
    tids.current.forEach(clearTimeout);
    tids.current = [];
    setSun(colorMode === "light");
  }, [colorMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => tids.current.forEach(clearTimeout), []);

  const handleClick = () => {
    tids.current.forEach(clearTimeout);
    tids.current = [];

    const goingLight = intended.current === "dark";
    intended.current = goingLight ? "light" : "dark";

    /* Change page colour INSTANTLY — no delay, no "feels broken" */
    skipEffect.current = true;
    toggleColorMode();

    /* Animate icon with a brief delay so it feels intentional */
    const tid = setTimeout(() => setSun(goingLight), 60);
    tids.current.push(tid);
  };

  /* Colours */
  const bodyFill = sun ? "#ff8800" : "rgba(210,225,255,0.95)";
  const rayFill  = sun ? "#ff9922" : "rgba(210,225,255,0.85)";

  return (
    <button
      onClick={handleClick}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
      className="relative flex items-center justify-center w-12 h-12 rounded-full
                 hover:bg-white/10 active:scale-90 transition-colors duration-150 cursor-pointer"
      style={{ outline: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {/* Orange glow ring in light mode */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          boxShadow: sun ? "0 0 18px 6px rgba(255,136,0,0.30)" : "none",
          transition: "box-shadow 0.5s ease",
          pointerEvents: "none",
        }}
      />

      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        style={{
          overflow: "visible",
          transform: sun ? "rotate(0deg)" : "rotate(20deg)",
          transition: "transform 0.5s cubic-bezier(0.34,1.2,0.64,1)",
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect width="24" height="24" fill="white" />
            {/* This circle slides right to reveal full sun, or left to carve a crescent */}
            <circle
              cx="12" cy="12" r="5.7"
              fill="black"
              style={{
                transform: sun ? "translateX(12px)" : "translateX(3.4px)",
                transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
              } as React.CSSProperties}
            />
          </mask>
        </defs>

        {/* 8 rays — scale in when sun, scale out when moon */}
        {Array.from({ length: 8 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 45}, 12, 12)`}>
            <rect
              x={7.9} y={11} width={3.6} height={2}
              rx={1}
              fill={rayFill}
              style={{
                transformBox: "fill-box",
                transformOrigin: "left center",
                transform: sun ? "scaleX(1)" : "scaleX(0)",
                opacity: sun ? 1 : 0,
                transition: [
                  `transform 0.45s cubic-bezier(0.34,1.7,0.64,1) ${sun ? i * 0.04 : (7 - i) * 0.025}s`,
                  `opacity 0.28s ease ${sun ? i * 0.04 : (7 - i) * 0.025}s`,
                  `fill 0.45s ease`,
                ].join(", "),
              } as React.CSSProperties}
            />
          </g>
        ))}

        {/* Sun / Moon body */}
        <circle
          cx="12" cy="12" r="5.5"
          fill={bodyFill}
          mask={`url(#${maskId})`}
          style={{ transition: "fill 0.5s ease" }}
        />

        {/* Stars — only visible in moon mode */}
        {[{ cx: 17.5, cy: 6.5, r: 0.7 }, { cx: 19.2, cy: 11, r: 0.5 }, { cx: 16.5, cy: 17, r: 0.6 }].map((s, i) => (
          <circle
            key={i}
            cx={s.cx} cy={s.cy} r={s.r}
            fill="rgba(200,225,255,0.9)"
            style={{
              opacity: sun ? 0 : 1,
              transform: sun ? "scale(0)" : "scale(1)",
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: [
                `opacity 0.3s ease ${sun ? 0 : 0.05 + i * 0.07}s`,
                `transform 0.3s cubic-bezier(0.34,1.6,0.64,1) ${sun ? 0 : 0.05 + i * 0.07}s`,
              ].join(", "),
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </button>
  );
}
