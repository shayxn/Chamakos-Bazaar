/* @refresh reset */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Animated wheel (spoke-based, rotates continuously) ──────────────────────
function Wheel({ cx, cy, r = 16 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      {/* Tyre */}
      <circle cx={cx} cy={cy} r={r} fill="#1a1a1a" stroke="#444" strokeWidth="2" />
      {/* Rotating spokes */}
      <g transform={`translate(${cx}, ${cy})`}>
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        >
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={0} y1={0}
                x2={(r - 4) * Math.cos(rad)}
                y2={(r - 4) * Math.sin(rad)}
                stroke="#555"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}
        </motion.g>
      </g>
      {/* Inner hub ring */}
      <circle cx={cx} cy={cy} r={r * 0.45} fill="#111" stroke="#333" strokeWidth="1" />
      {/* Hub cap */}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#ff6600" />
    </g>
  );
}

// ── 2D side-view truck with FirstPick branding ───────────────────────────────
function TruckSVG() {
  return (
    <svg width="340" height="115" viewBox="0 0 340 115" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground shadow */}
      <ellipse cx="170" cy="112" rx="150" ry="5" fill="rgba(255,102,0,0.12)" />

      {/* ── Trailer body ── */}
      <rect x="4" y="18" width="225" height="76" rx="5" fill="#0d0d0d" stroke="#ff6600" strokeWidth="1.5" />
      {/* Corrugation lines */}
      {[30, 60, 90, 120, 150, 180, 200].map((x) => (
        <line key={x} x1={x} y1="20" x2={x} y2="92" stroke="rgba(255,102,0,0.15)" strokeWidth="1" />
      ))}
      {/* FirstPick logo text on trailer */}
      <text x="115" y="54" textAnchor="middle" fontSize="16" fontWeight="900" fill="#ff6600"
        fontFamily="'Arial Black', Impact, sans-serif" letterSpacing="1">FIRST</text>
      <text x="115" y="74" textAnchor="middle" fontSize="16" fontWeight="900" fill="#ff6600"
        fontFamily="'Arial Black', Impact, sans-serif" letterSpacing="1">PICK</text>
      {/* ⚡ bolt icon */}
      <text x="116" y="90" textAnchor="middle" fontSize="10" fill="rgba(255,102,0,0.6)">⚡ PRIORITY</text>
      {/* Trailer rear wall */}
      <rect x="4" y="18" width="10" height="76" rx="0" fill="#1a1a1a" />
      {/* Rear lights */}
      <rect x="5" y="22" width="6" height="12" rx="2" fill="#cc0000" opacity="0.9" />
      <rect x="5" y="78" width="6" height="12" rx="2" fill="#ffaa00" opacity="0.8" />

      {/* ── Connector / fifth wheel ── */}
      <rect x="226" y="72" width="12" height="8" rx="2" fill="#333" />

      {/* ── Cab ── */}
      <path d="M236 28 L305 28 L322 58 L322 94 L236 94 Z" fill="#111" stroke="#ff6600" strokeWidth="1.5" />
      {/* Cab roof fairing */}
      <path d="M236 28 L285 20 L305 28 Z" fill="#0d0d0d" stroke="#ff6600" strokeWidth="1" />
      {/* Windshield */}
      <path d="M242 35 L295 35 L310 58 L242 58 Z" fill="rgba(26,58,92,0.85)" stroke="rgba(255,102,0,0.3)" strokeWidth="1" />
      {/* Windshield shine */}
      <path d="M246 38 L272 38 L280 50 L246 50 Z" fill="white" opacity="0.06" />
      {/* Door panel */}
      <rect x="242" y="62" width="65" height="26" rx="3" fill="rgba(255,102,0,0.05)" stroke="rgba(255,102,0,0.25)" strokeWidth="0.8" />
      {/* Door handle */}
      <rect x="293" y="72" width="10" height="3" rx="1.5" fill="#333" />
      {/* Orange cab stripe */}
      <rect x="236" y="90" width="86" height="4" rx="0" fill="rgba(255,102,0,0.4)" />
      {/* Headlight */}
      <rect x="313" y="62" width="8" height="14" rx="2" fill="#ffffcc" opacity="0.9" />
      {/* Grill */}
      {[68, 74, 80, 86].map((y) => (
        <line key={y} x1="315" y1={y} x2="322" y2={y} stroke="#333" strokeWidth="1.5" />
      ))}
      {/* Bumper */}
      <rect x="316" y="87" width="6" height="7" rx="1" fill="#222" stroke="#444" strokeWidth="0.5" />

      {/* ── Exhaust stack ── */}
      <rect x="298" y="12" width="5" height="18" rx="2" fill="#333" stroke="#444" strokeWidth="0.5" />
      <motion.ellipse
        cx="300.5" cy="10" rx="7" ry="5" fill="#888"
        animate={{ opacity: [0.6, 0, 0.6], y: [0, -10, 0], scaleX: [1, 1.6, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.ellipse
        cx="300.5" cy="6" rx="5" ry="4" fill="#666"
        animate={{ opacity: [0.4, 0, 0.4], y: [0, -14, 0], scaleX: [1, 2, 1] }}
        transition={{ duration: 0.9, delay: 0.3, repeat: Infinity, ease: "easeOut" }}
      />

      {/* ── Wheels ── */}
      <Wheel cx={65} cy={97} r={16} />
      <Wheel cx={160} cy={97} r={16} />
      <Wheel cx={267} cy={97} r={16} />
    </svg>
  );
}

// ── Road dashes ──────────────────────────────────────────────────────────────
function RoadDashes() {
  return (
    <div className="w-full overflow-hidden" style={{ height: 2 }}>
      <motion.div
        className="flex gap-8"
        animate={{ x: [0, -80] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
        style={{ width: "200%" }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="shrink-0" style={{ width: 48, height: 2, background: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
        ))}
      </motion.div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface PriorityOrderAnimationProps {
  onComplete: () => void;
}

const WORD_DELAYS = [0.5, 0.62, 0.74, 0.86, 0.98, 1.1];
const WORDS = ["Your", "Order", "Is", "On", "The", "Way!"];

export function PriorityOrderAnimation({ onComplete }: PriorityOrderAnimationProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 5200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      {/* Stars / sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-primary text-xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], y: [0, -40] }}
          transition={{ delay: 0.8 + i * 0.15, duration: 1.2, ease: "easeOut" }}
          style={{
            left: `${12 + i * 11}%`,
            top: `${20 + (i % 3) * 8}%`,
          }}
        >
          ⚡
        </motion.div>
      ))}

      {/* Priority badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 400, damping: 28 }}
        className="mb-4 px-4 py-1.5 rounded-full font-black text-[11px] uppercase tracking-[0.3em] text-primary border border-primary/40"
        style={{ background: "rgba(255,102,0,0.1)" }}
      >
        ⚡ FirstPick Priority
      </motion.div>

      {/* Main headline — word-by-word spring */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-10 px-8 text-center">
        {WORDS.map((word, i) => (
          <motion.span
            key={word}
            initial={{ opacity: 0, y: 28, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: WORD_DELAYS[i], type: "spring", stiffness: 360, damping: 28 }}
            className="text-4xl font-black uppercase tracking-tight text-white"
            style={word === "Way!" ? { color: "#ff6600" } : {}}
          >
            {word}
          </motion.span>
        ))}
      </div>

      {/* Truck scene */}
      <div className="w-full max-w-sm relative">
        {/* Road surface */}
        <div className="w-full h-px bg-white/8 mb-1" />
        <RoadDashes />
        <div className="w-full h-px bg-white/4 mt-1" />

        {/* Truck driving across */}
        <div className="overflow-hidden" style={{ height: 130, marginTop: -4 }}>
          <motion.div
            initial={{ x: "110%" }}
            animate={{ x: "-115%" }}
            transition={{ delay: 0.6, duration: 3.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-end"
            style={{ height: 130 }}
          >
            <TruckSVG />
          </motion.div>
        </div>

        <div className="w-full h-px bg-white/8 mt-0" />
      </div>

      {/* Sub-text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="mt-8 text-xs font-bold text-muted-foreground uppercase tracking-widest"
      >
        Estimated: Same Day / Next Day
      </motion.p>

      {/* Progress bar */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        style={{ width: 120 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5.2, ease: "linear" }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
