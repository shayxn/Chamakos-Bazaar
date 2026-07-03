import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";

export const AMBIENT_CSS = `
@keyframes birdFlyR {
  from { transform: translateX(-140px); }
  to   { transform: translateX(calc(100vw + 200px)); }
}
@keyframes birdFlyL {
  from { transform: translateX(calc(100vw + 200px)) scaleX(-1); }
  to   { transform: translateX(-200px) scaleX(-1); }
}
@keyframes palmSway {
  0%,100% { transform: rotate(-2deg); }
  50%      { transform: rotate(2deg); }
}
@keyframes leafDrift {
  0%   { transform: translateY(-30px) rotate(0deg) translateX(0px); opacity: 0.7; }
  50%  { transform: translateY(50vh) rotate(360deg) translateX(30px); opacity: 0.5; }
  100% { transform: translateY(100vh) rotate(720deg) translateX(-10px); opacity: 0; }
}
@keyframes waveScroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes neonPulse {
  0%,100% { opacity: 0.55; filter: blur(10px); }
  50%     { opacity: 0.25; filter: blur(14px); }
}
@keyframes neonFlick {
  0%,89%,91%,93%,100% { opacity: 1; }
  90%,92% { opacity: 0.3; }
}
@keyframes carSlide {
  from { transform: translateX(110vw); }
  to   { transform: translateX(-250px); }
}
@keyframes floatUp {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-4px); }
}
@keyframes sparkle {
  0%,100% { transform: scale(0) rotate(0deg); opacity: 0; }
  50%     { transform: scale(1) rotate(180deg); opacity: 1; }
}
`;

const BirdSvg = ({ size = 1, opacity = 0.45 }: { size?: number; opacity?: number }) => (
  <svg width={24 * size} height={10 * size} viewBox="0 0 24 10" fill="none" style={{ display: "inline-block", opacity }}>
    <path d="M0,5 Q6,0 12,5 Q18,0 24,5" stroke="white" strokeWidth="1.1" fill="none" strokeLinecap="round" />
  </svg>
);

export function AmbientBirds() {
  const flocks = [
    { y: "7%",  delay: 0,    dur: 24, count: 3, size: 1.0,  dir: 1  },
    { y: "13%", delay: 8,    dur: 31, count: 2, size: 0.7,  dir: 1  },
    { y: "20%", delay: 3,    dur: 20, count: 4, size: 1.1,  dir: 1  },
    { y: "5%",  delay: 17,   dur: 27, count: 2, size: 0.75, dir: -1 },
    { y: "16%", delay: 12,   dur: 22, count: 3, size: 0.9,  dir: 1  },
    { y: "28%", delay: 5,    dur: 36, count: 2, size: 0.65, dir: -1 },
    { y: "9%",  delay: 22,   dur: 19, count: 3, size: 0.85, dir: 1  },
    { y: "24%", delay: 15,   dur: 28, count: 2, size: 0.6,  dir: -1 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
      {flocks.map((f, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: f.y,
            left: 0,
            animation: `${f.dir === 1 ? "birdFlyR" : "birdFlyL"} ${f.dur}s ${f.delay}s linear infinite`,
            willChange: "transform",
          }}
        >
          {Array.from({ length: f.count }, (_, j) => (
            <span key={j} style={{ marginLeft: j === 0 ? 0 : `${14 + j * 8}px`, marginTop: `${(j % 2) * 6}px`, display: "inline-block" }}>
              <BirdSvg size={f.size} opacity={0.35 + j * 0.05} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SwayingPalms({ className = "" }: { className?: string }) {
  const palms = [
    { x: "1.5%",  h: 260, delay: 0,   dur: 5.5, opacity: 0.18 },
    { x: "91%",   h: 220, delay: 1.8, dur: 4.8, opacity: 0.16 },
    { x: "95%",   h: 175, delay: 0.9, dur: 6.2, opacity: 0.13 },
    { x: "4%",    h: 180, delay: 2.5, dur: 5.0, opacity: 0.14 },
  ];

  return (
    <div className={`absolute bottom-0 left-0 right-0 pointer-events-none overflow-visible ${className}`} style={{ zIndex: 1 }}>
      {palms.map((p, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{
            left: p.x,
            height: p.h,
            width: 64,
            animation: `palmSway ${p.dur}s ${p.delay}s ease-in-out infinite`,
            transformOrigin: "bottom center",
            willChange: "transform",
          }}
        >
          <svg viewBox="0 0 64 260" fill="none" style={{ width: "100%", height: "100%" }}>
            <path d="M32,260 Q30,200 34,140 Q31,90 29,45" stroke={`rgba(255,255,255,${p.opacity})`} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q8,28 -15,38" stroke={`rgba(255,255,255,${p.opacity})`} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q55,22 76,30" stroke={`rgba(255,255,255,${p.opacity})`} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q16,12 22,-8" stroke={`rgba(255,255,255,${p.opacity * 0.8})`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q46,10 44,-12" stroke={`rgba(255,255,255,${p.opacity * 0.8})`} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q4,40 -18,32" stroke={`rgba(255,255,255,${p.opacity * 0.65})`} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M31,50 Q58,38 80,30" stroke={`rgba(255,255,255,${p.opacity * 0.65})`} strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function OceanWaves({ accent = CYAN, opacity = 0.12 }: { accent?: string; opacity?: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: 90, zIndex: 1 }}>
      <div style={{ animation: "waveScroll 9s linear infinite", display: "flex", width: "200%", willChange: "transform" }}>
        {[0, 1].map(k => (
          <svg key={k} viewBox="0 0 1440 90" preserveAspectRatio="none" style={{ width: "50%", height: 90, flexShrink: 0 }}>
            <path d="M0,45 Q240,5 480,45 Q720,85 960,45 Q1200,5 1440,45 L1440,90 L0,90 Z" fill={accent} fillOpacity={opacity} />
          </svg>
        ))}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, animation: "waveScroll 14s linear infinite reverse", display: "flex", width: "200%", willChange: "transform" }}>
        {[0, 1].map(k => (
          <svg key={k} viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ width: "50%", height: 60, flexShrink: 0 }}>
            <path d="M0,30 Q240,58 480,30 Q720,2 960,30 Q1200,58 1440,30 L1440,60 L0,60 Z" fill={accent} fillOpacity={opacity * 0.7} />
          </svg>
        ))}
      </div>
    </div>
  );
}

export function FloatingParticles({ count = 9 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    x: `${5 + i * 10}%`,
    size: 2 + (i % 3) * 0.8,
    delay: i * 1.8,
    dur: 10 + (i % 5) * 2.5,
    color: i % 2 === 0 ? PINK : CYAN,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: "-8px",
            width: p.size,
            height: p.size,
            background: p.color,
            filter: "blur(0.8px)",
            animation: `leafDrift ${p.dur}s ${p.delay}s linear infinite`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

export function PassingCars() {
  const cars = [
    { y: "76%", delay: 0,   dur: 38, w: 52, h: 18, opacity: 0.22 },
    { y: "73%", delay: 14,  dur: 52, w: 44, h: 15, opacity: 0.18 },
    { y: "79%", delay: 27,  dur: 44, w: 58, h: 20, opacity: 0.20 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {cars.map((c, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: c.y,
            right: 0,
            opacity: c.opacity,
            animation: `carSlide ${c.dur}s ${c.delay}s linear infinite`,
            willChange: "transform",
          }}
        >
          <svg width={c.w} height={c.h} viewBox={`0 0 ${c.w} ${c.h}`} fill="rgba(255,255,255,0.7)">
            <rect x="4" y={c.h * 0.45} width={c.w - 8} height={c.h * 0.5} rx="2" />
            <rect x={c.w * 0.2} y={c.h * 0.15} width={c.w * 0.5} height={c.h * 0.35} rx="3" />
            <circle cx={c.w * 0.22} cy={c.h} r="3" fill="rgba(255,255,255,0.4)" />
            <circle cx={c.w * 0.78} cy={c.h} r="3" fill="rgba(255,255,255,0.4)" />
            <rect x={c.w - 4} y={c.h * 0.5} width="3" height="4" rx="1" fill="#ff6600" opacity="0.7" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function NeonReflections() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <div
        className="absolute"
        style={{
          bottom: 0, left: "12%", width: 220, height: 3,
          background: CYAN,
          animation: "neonPulse 7s 0s ease-in-out infinite",
          willChange: "opacity, filter",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 0, right: "18%", width: 160, height: 3,
          background: PINK,
          animation: "neonPulse 5s 2.5s ease-in-out infinite",
          willChange: "opacity, filter",
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: 0, left: "45%", width: 100, height: 2,
          background: "#9b30ff",
          animation: "neonPulse 9s 1s ease-in-out infinite",
          willChange: "opacity, filter",
        }}
      />
      <div
        className="absolute right-8 top-[30%] text-xs font-black"
        style={{
          color: PINK,
          textShadow: `0 0 12px ${PINK}, 0 0 24px ${PINK}`,
          animation: "neonFlick 8s 0s ease-in-out infinite",
          opacity: 0.45,
          letterSpacing: "0.2em",
          writingMode: "vertical-rl",
        }}
      >
        LEONIDA
      </div>
      <div
        className="absolute left-6 top-[50%] text-xs font-black"
        style={{
          color: CYAN,
          textShadow: `0 0 12px ${CYAN}, 0 0 24px ${CYAN}`,
          animation: "neonFlick 11s 3s ease-in-out infinite",
          opacity: 0.35,
          letterSpacing: "0.2em",
          writingMode: "vertical-rl",
        }}
      >
        VI
      </div>
    </div>
  );
}

export function CharacterFloatWrapper({ children, char }: { children: React.ReactNode; char: "jason" | "lucia" }) {
  return (
    <div
      data-char={char}
      style={{ animation: `floatUp ${char === "jason" ? 4 : 4.8}s ${char === "jason" ? 0 : 0.6}s ease-in-out infinite`, willChange: "transform" }}
    >
      {children}
    </div>
  );
}

function AnimatedConnectionPath({ active }: { active: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [dashLen, setDashLen] = useState(200);
  const [offset, setOffset] = useState(200);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      setDashLen(len);
      setOffset(len);
    }
  }, []);

  useEffect(() => {
    if (!active) { setOffset(dashLen); return; }
    let frame: number;
    let pos = dashLen;
    const speed = 2.2;
    const animate = () => {
      pos -= speed;
      if (pos < -dashLen) pos = dashLen;
      setOffset(pos);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, dashLen]);

  return (
    <path
      ref={pathRef}
      d="M 23,88 Q 50,60 77,88"
      fill="none"
      stroke="url(#jl-grad)"
      strokeWidth={active ? 0.9 : 0.4}
      strokeDasharray={dashLen}
      strokeDashoffset={offset}
      strokeLinecap="round"
      style={{ transition: "stroke-width 0.4s, opacity 0.4s", opacity: active ? 1 : 0.4 }}
    />
  );
}

export function CharacterConnectionOverlay({ hovered }: { hovered: "jason" | "lucia" | null }) {
  const isActive = hovered !== null;
  const highlight = {
    jason: hovered === "jason",
    lucia: hovered === "lucia",
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none hidden lg:flex items-end justify-center pb-4"
      style={{ zIndex: 20 }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="jl-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} />
            <stop offset="100%" stopColor={PINK} />
          </linearGradient>
          <filter id="jl-glow" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <AnimatedConnectionPath active={isActive} />

        {isActive && (
          <path
            d="M 23,88 Q 50,60 77,88"
            fill="none"
            stroke="url(#jl-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ filter: "blur(4px)", opacity: 0.28 }}
          />
        )}

        <circle cx="23" cy="88" r="1.8" fill={CYAN} opacity={isActive ? 1 : 0.4}
          style={{ filter: highlight.jason ? `drop-shadow(0 0 4px ${CYAN})` : "none", transition: "opacity 0.4s" }} />
        <circle cx="77" cy="88" r="1.8" fill={PINK} opacity={isActive ? 1 : 0.4}
          style={{ filter: highlight.lucia ? `drop-shadow(0 0 4px ${PINK})` : "none", transition: "opacity 0.4s" }} />

        {[0.15, 0.35, 0.5, 0.65, 0.85].map((t, i) => {
          const x = 23 + t * 54;
          const y = 88 - Math.sin(t * Math.PI) * 28;
          const c = t < 0.5 ? CYAN : PINK;
          return (
            <circle
              key={i}
              cx={x} cy={y} r="0.6"
              fill={c}
              opacity={isActive ? 0.7 : 0.2}
              style={{ transition: "opacity 0.4s" }}
            />
          );
        })}
      </svg>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative z-10 flex flex-col items-center gap-1"
            style={{ marginBottom: "8%" }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ fontSize: 22, color: PINK, filter: `drop-shadow(0 0 8px ${PINK}) drop-shadow(0 0 16px ${PINK}88)` }}
            >
              ♥
            </motion.div>
            <div
              className="text-[8px] font-black uppercase tracking-[0.3em]"
              style={{ background: `linear-gradient(90deg, ${CYAN}, ${PINK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              {hovered === "jason" ? "Jason & Lucia" : "Lucia & Jason"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
