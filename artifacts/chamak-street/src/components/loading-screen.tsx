import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const PHASES = ["scan", "reveal", "loading", "ready"] as const;
type Phase = typeof PHASES[number];

const TAGLINES = ["Dubai's Finest Drip", "Stay Chamak", "New Collection Loading", "Premium Streetwear"];

export function LoadingScreen() {
  const [phase, setPhase] = useState<Phase>("scan");
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  const [charIdx, setCharIdx] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const TOTAL_MS = 5000;

  useEffect(() => {
    /* Phase timeline */
    const t1 = setTimeout(() => setPhase("reveal"), 700);
    const t2 = setTimeout(() => setPhase("loading"), 1600);
    const t3 = setTimeout(() => setPhase("ready"), TOTAL_MS - 550);
    const t4 = setTimeout(() => setExiting(true), TOTAL_MS - 80);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  /* Smooth RAF-driven progress 0→100 over TOTAL_MS */
  useEffect(() => {
    if (phase !== "loading") return;
    startRef.current = performance.now();
    function tick(now: number) {
      const elapsed = now - startRef.current;
      const FILL_MS = TOTAL_MS - 1600 - 550; /* time between loading phase start and ready */
      const t = Math.min(elapsed / FILL_MS, 1);
      /* Ease out cubic - fast start, slow finish for drama */
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  /* Typewriter for tagline */
  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setCharIdx((c) => {
        if (c >= tagline.length) { clearInterval(interval); return c; }
        return c + 1;
      });
    }, 55);
    return () => clearInterval(interval);
  }, [phase, tagline]);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loader"
          exit={{ opacity: 0, scale: 1.06, filter: "blur(20px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: "#030100" }}
        >

          {/* ── Scanline sweep (phase: scan) ── */}
          <AnimatePresence>
            {phase === "scan" && (
              <motion.div
                key="scanline"
                initial={{ top: "-4px" }}
                animate={{ top: "104%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{ height: "3px", background: "linear-gradient(90deg, transparent, rgba(255,102,0,0.9), rgba(255,200,0,0.9), transparent)", filter: "blur(1px)", boxShadow: "0 0 24px rgba(255,102,0,0.8)" }}
              />
            )}
          </AnimatePresence>

          {/* ── Grid lines (scan reveal) ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "scan" ? 0.06 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              backgroundImage: "linear-gradient(rgba(255,102,0,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* ── Concentric rings ── */}
          {[1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{ width: `${160 + i * 140}px`, height: `${160 + i * 140}px`, border: `1px solid rgba(255,102,0,${0.15 - i * 0.025})` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: phase !== "scan" ? 1 : 0, rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{
                scale: { duration: 0.8, delay: 0.7 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.4, delay: 0.65 },
                rotate: { duration: 12 + i * 4, repeat: Infinity, ease: "linear" },
              }}
            />
          ))}

          {/* ── Core radial glow ── */}
          <motion.div
            className="absolute pointer-events-none rounded-full"
            style={{ width: 600, height: 600, background: "radial-gradient(circle, rgba(255,102,0,0.22) 0%, transparent 65%)" }}
            animate={{ scale: [0.9, 1.08, 0.9], opacity: phase === "scan" ? 0 : [0.7, 1, 0.7] }}
            transition={{ scale: { duration: 3.5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.5 } }}
          />

          {/* ── Conic sweep ── */}
          <motion.div
            className="absolute w-[500px] h-[500px] pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{ background: "conic-gradient(from 0deg, transparent 70%, rgba(255,102,0,0.14) 85%, transparent 100%)", borderRadius: "50%" }}
          />

          {/* ── Logo burst ── */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.4, opacity: 0, filter: "blur(20px)" }}
            animate={phase !== "scan"
              ? { scale: 1, opacity: 1, filter: "blur(0px)" }
              : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Orange burst ring on reveal */}
            <AnimatePresence>
              {phase === "reveal" && (
                <motion.div
                  key="burst"
                  className="absolute inset-0 rounded-full pointer-events-none"
                  initial={{ scale: 0.5, opacity: 0.9 }}
                  animate={{ scale: 3.5, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ background: "radial-gradient(circle, rgba(255,102,0,0.5) 0%, transparent 70%)" }}
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={phase === "reveal"
                ? { filter: ["drop-shadow(0 0 0px #ff6600)", "drop-shadow(0 0 60px rgba(255,102,0,1))", "drop-shadow(0 0 28px rgba(255,102,0,0.65))"] }
                : { filter: ["drop-shadow(0 0 18px rgba(255,102,0,0.5))", "drop-shadow(0 0 36px rgba(255,102,0,0.9))", "drop-shadow(0 0 18px rgba(255,102,0,0.5))"] }
              }
              transition={{ duration: phase === "reveal" ? 0.9 : 2.5, repeat: phase === "reveal" ? 0 : Infinity, ease: "easeInOut" }}
            >
              <img
                src="/chamak-logo-transparent.png"
                alt="Chamak Street"
                className="h-28 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
              />
            </motion.div>
          </motion.div>

          {/* ── Tagline typewriter ── */}
          <motion.div
            className="relative z-10 mt-7 h-4 flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "loading" || phase === "ready" ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.38em] text-white/30">
              {tagline.slice(0, charIdx)}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="w-[1px] h-[11px] bg-primary/50 ml-0.5 inline-block"
            />
          </motion.div>

          {/* ── Progress bar ── */}
          <motion.div
            className="relative z-10 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase === "loading" || phase === "ready" ? 1 : 0, y: phase === "loading" || phase === "ready" ? 0 : 10 }}
            transition={{ duration: 0.45 }}
          >
            <div className="w-52 h-[2px] bg-white/6 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #cc4400, #ff6600, #ffcc00)",
                  boxShadow: "0 0 16px rgba(255,102,0,0.8)",
                }}
              >
                {/* Shimmer on progress bar */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", width: "50%" }}
                />
              </motion.div>
            </div>

            <div className="flex justify-between mt-2">
              <p className="text-[10px] font-black font-mono text-white/20">{progress}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/15">
                {progress < 100 ? "Loading Collection" : "Ready"}
              </p>
            </div>
          </motion.div>

          {/* ── "READY" flash ── */}
          <AnimatePresence>
            {phase === "ready" && (
              <motion.div
                key="ready-text"
                initial={{ opacity: 0, scale: 0.85, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-30 text-center pointer-events-none"
              >
                <motion.p
                  className="text-[11px] font-black uppercase tracking-[0.55em] text-primary"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.4, repeat: 2 }}
                >
                  Collection Loaded
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating sparks ── */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                background: i % 3 === 0 ? "#ff6600" : i % 3 === 1 ? "#ffcc00" : "#ff9933",
                boxShadow: `0 0 ${6 + i * 2}px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
                left: `${12 + i * 8}%`,
                top: `${60 + (i % 4) * 5}%`,
              }}
              initial={{ opacity: 0 }}
              animate={phase !== "scan" ? {
                y: [0, -(80 + i * 22), 0],
                opacity: [0, 0.85, 0],
                x: [0, (i % 2 === 0 ? 12 : -12), 0],
              } : {}}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.18, ease: "easeOut" }}
            />
          ))}

          {/* ── Corner accent lines ── */}
          {[
            { top: 24, left: 24, rotate: 0 },
            { top: 24, right: 24, rotate: 90 },
            { bottom: 24, left: 24, rotate: -90 },
            { bottom: 24, right: 24, rotate: 180 },
          ].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{ ...pos, width: 32, height: 32 }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: phase !== "scan" ? 0.35 : 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.06 }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M0 32 L0 0 L32 0" stroke="rgba(255,102,0,0.6)" strokeWidth="1.5" fill="none" />
              </svg>
            </motion.div>
          ))}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
