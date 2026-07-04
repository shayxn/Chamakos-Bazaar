import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "chamak_loaded";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const LETTERS = "CHAMAK".split("");

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });

  const [phase, setPhase] = useState<"letters" | "line" | "sub" | "bar" | "logo" | "done">("letters");
  const [exiting, setExiting] = useState(skip);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (skip) return;
    const t0 = setTimeout(() => setPhase("line"),  900);
    const t1 = setTimeout(() => setPhase("sub"),   1200);
    const t2 = setTimeout(() => setPhase("bar"),   1500);
    const t3 = setTimeout(() => setPhase("logo"),  3200);
    const t4 = setTimeout(() => setPhase("done"),  4000);
    const t5 = setTimeout(() => setExiting(true),  4200);
    const t6 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    }, 4600);
    return () => [t0,t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, [skip]);

  useEffect(() => {
    if (skip || phase !== "bar") return;
    startRef.current = performance.now();
    const FILL_MS = 1700;
    function tick(now: number) {
      const t = Math.min((now - startRef.current) / FILL_MS, 1);
      const eased = 1 - Math.pow(1 - t, 2.5);
      setProgress(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, skip]);

  if (skip) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: "#000" }}
        >
          {/* Ambient glow */}
          <motion.div
            className="absolute pointer-events-none"
            style={{ width: 900, height: 900, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,102,0,0.07) 0%, transparent 65%)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
            animate={{ scale: [0.9, 1.05, 0.9] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Top corner ornaments */}
          {[{ top: 32, left: 32 }, { top: 32, right: 32 }, { bottom: 32, left: 32 }, { bottom: 32, right: 32 }].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{ ...pos, width: 24, height: 24, rotate: [0, 90, 270, 180][i] }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M0 24 L0 0 L24 0" stroke="rgba(255,102,0,0.7)" strokeWidth="1" fill="none" />
              </svg>
            </motion.div>
          ))}

          {/* ── CHAMAK letters ── */}
          <div className="flex items-end gap-[0.05em] relative z-10" aria-hidden>
            {LETTERS.map((letter, i) => (
              <motion.span
                key={i}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 + i * 0.075, duration: 0.65, ease: EASE }}
                className="font-black uppercase leading-none"
                style={{
                  fontSize: "clamp(4rem, 14vw, 9rem)",
                  letterSpacing: "-0.02em",
                  color: "white",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* ── Animated underline sweep ── */}
          <div className="relative w-full max-w-[clamp(14rem,60vw,42rem)] h-[2px] overflow-hidden z-10 -mt-2">
            <motion.div
              className="absolute inset-y-0 left-0 right-0"
              style={{ transformOrigin: "left", background: "linear-gradient(90deg, transparent, #ff6600, #ffcc00, #ff6600, transparent)" }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={phase !== "letters" ? { scaleX: 1, opacity: 1 } : {}}
              transition={{ duration: 0.7, ease: EASE }}
            />
          </div>

          {/* ── Subtitle ── */}
          <motion.div
            className="mt-5 z-10 flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={phase !== "letters" && phase !== "line" ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="h-px w-8" style={{ background: "rgba(255,102,0,0.4)" }} />
            <span className="text-[10px] font-black uppercase tracking-[0.55em]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Premium Streetwear · Dubai
            </span>
            <div className="h-px w-8" style={{ background: "rgba(255,102,0,0.4)" }} />
          </motion.div>

          {/* ── Thin progress bar ── */}
          <motion.div
            className="z-10 mt-10 w-full max-w-xs"
            initial={{ opacity: 0 }}
            animate={phase === "bar" || phase === "logo" || phase === "done" ? { opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* Bar track */}
            <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #cc4400, #ff6600, #ffcc00)",
                  width: `${progress}%`,
                  transition: "width 0.08s linear",
                  boxShadow: "0 0 8px rgba(255,102,0,0.6)",
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,102,0,0.45)" }}>
                {String(progress).padStart(3, "0")}%
              </span>
              <motion.span
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.15)" }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {progress < 100 ? "Loading…" : "Ready"}
              </motion.span>
            </div>
          </motion.div>

          {/* ── Logo reveal ── */}
          <AnimatePresence>
            {(phase === "logo" || phase === "done") && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.8, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="absolute bottom-16 z-10"
              >
                <motion.img
                  src="/chamak-logo-transparent.png"
                  alt="Chamak Street"
                  className="h-12 w-auto object-contain"
                  animate={{ filter: ["drop-shadow(0 0 0px rgba(255,102,0,0))", "drop-shadow(0 0 16px rgba(255,102,0,0.7))", "drop-shadow(0 0 8px rgba(255,102,0,0.4))"] }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  onError={e => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating light particles */}
          {Array.from({ length: 10 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none rounded-full"
              style={{
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                background: i % 2 === 0 ? "#ff6600" : "#ffcc00",
                boxShadow: `0 0 ${6 + i * 2}px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
                left: `${8 + i * 9}%`,
                bottom: `${15 + (i % 4) * 8}%`,
              }}
              animate={{
                y: [0, -(80 + i * 22), 0],
                opacity: [0, 0.85, 0],
                x: [0, (i % 2 === 0 ? 12 : -12), 0],
              }}
              transition={{
                duration: 2.5 + i * 0.3,
                repeat: Infinity,
                delay: 0.6 + i * 0.18,
                ease: "easeOut",
              }}
            />
          ))}

          {/* ── "READY" flash ── */}
          <AnimatePresence>
            {phase === "done" && (
              <motion.p
                key="ready"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.4, 1, 0] }}
                transition={{ duration: 0.7, times: [0, 0.2, 0.5, 0.8, 1] }}
                className="absolute z-20 text-[10px] font-black uppercase tracking-[0.7em]"
                style={{ color: "#ff6600", bottom: "10%" }}
              >
                ✦ Collection Ready ✦
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
