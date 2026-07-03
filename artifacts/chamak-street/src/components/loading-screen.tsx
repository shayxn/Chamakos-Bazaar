import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const TAGLINES = ["Dubai's Finest Drip", "Stay Chamak", "New Collection Loading"];

export function LoadingScreen() {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [progress, setProgress] = useState(0);
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);

  useEffect(() => {
    /* Animate progress bar */
    let v = 0;
    const tick = setInterval(() => {
      v += Math.random() * 18 + 4;
      if (v >= 100) {
        v = 100;
        clearInterval(tick);
        setTimeout(() => setPhase("out"), 200);
      }
      setProgress(Math.min(v, 100));
    }, 120);

    /* Safety: force exit after 2.2s */
    const safety = setTimeout(() => { clearInterval(tick); setProgress(100); setPhase("out"); }, 2200);

    return () => { clearInterval(tick); clearTimeout(safety); };
  }, []);

  return (
    <AnimatePresence>
      {phase !== "out" && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "#050200" }}
        >
          {/* ── Animated background rings ── */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: `${240 + i * 160}px`,
                height: `${240 + i * 160}px`,
                border: `1px solid rgba(255,102,0,${0.12 - i * 0.03})`,
              }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            />
          ))}

          {/* ── Center orange radial glow ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 500,
              height: 500,
              background: "radial-gradient(circle, rgba(255,102,0,0.18) 0%, transparent 68%)",
            }}
            animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Rotating conic sweep ── */}
          <motion.div
            className="absolute w-96 h-96 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{
              background: "conic-gradient(from 0deg, transparent 75%, rgba(255,102,0,0.18) 88%, transparent 100%)",
              borderRadius: "50%",
            }}
          />

          {/* ── Floating sparks ── */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 3 + (i % 3),
                height: 3 + (i % 3),
                background: i % 2 === 0 ? "#ff6600" : "#ffcc00",
                boxShadow: `0 0 8px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
                left: `${18 + i * 9}%`,
                top: `${55 + (i % 3) * 8}%`,
              }}
              animate={{
                y: [0, -(60 + i * 18), 0],
                opacity: [0, 0.9, 0],
                x: [(i % 2 === 0 ? -8 : 8), 0, (i % 2 === 0 ? 8 : -8)],
              }}
              transition={{
                duration: 1.8 + i * 0.25,
                repeat: Infinity,
                delay: i * 0.22,
                ease: "easeOut",
              }}
            />
          ))}

          {/* ── Logo ── */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10"
          >
            <motion.div
              animate={{ filter: ["drop-shadow(0 0 0px #ff6600)", "drop-shadow(0 0 28px rgba(255,102,0,0.8))", "drop-shadow(0 0 0px #ff6600)"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src="/chamak-logo-transparent.png"
                alt="Chamak Street"
                className="h-24 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
              />
            </motion.div>
          </motion.div>

          {/* ── Tagline ── */}
          <motion.p
            initial={{ opacity: 0, y: 10, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "0.35em" }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="relative z-10 mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-white/35"
          >
            {tagline}
          </motion.p>

          {/* ── Progress bar ── */}
          <div className="relative z-10 mt-8 w-44 h-[2px] bg-white/6 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #ff6600, #ffcc00)",
                boxShadow: "0 0 12px rgba(255,102,0,0.7)",
              }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>

          {/* ── Progress number ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-2 text-[10px] font-black font-mono text-white/20"
          >
            {Math.round(progress)}%
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
