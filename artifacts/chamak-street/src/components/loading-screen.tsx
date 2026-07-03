import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const PHASES = ["boot", "scan", "reveal", "loading", "ready"] as const;
type Phase = typeof PHASES[number];

const TAGLINES = ["Dubai's Finest Drip", "Stay Chamak", "New Collection Loading", "Premium Streetwear"];
const SESSION_KEY = "chamak_loaded";

const BOOT_LINES = [
  { text: "CHAMAK OS v2.0  ············  INIT", delay: 80 },
  { text: "> Scanning collection...     [OK]", delay: 160 },
  { text: "> Loading latest drops...    [OK]", delay: 240 },
  { text: "> Authenticating drip...     [OK]", delay: 320 },
  { text: "> System ready.              [✓]", delay: 400 },
];

function BootLine({ text, startDelay }: { text: string; startDelay: number }) {
  const [visible, setVisible] = useState(false);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const iv = setInterval(() => { i++; setChars(i); if (i >= text.length) clearInterval(iv); }, 18);
    return () => clearInterval(iv);
  }, [visible, text]);
  if (!visible) return null;
  return (
    <p className="font-mono text-[10px] leading-relaxed" style={{ color: chars < text.length ? "rgba(255,102,0,0.55)" : "rgba(255,102,0,0.35)" }}>
      {text.slice(0, chars)}
      {chars < text.length && <span className="animate-pulse">▌</span>}
    </p>
  );
}

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });

  const [phase, setPhase] = useState<Phase>("boot");
  const [exiting, setExiting] = useState(skip);
  const [progress, setProgress] = useState(0);
  const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
  const [charIdx, setCharIdx] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const TOTAL_MS = 5000;
  const BOOT_MS = 900;

  useEffect(() => {
    if (skip) return;
    const t0 = setTimeout(() => setPhase("scan"), BOOT_MS);
    const t1 = setTimeout(() => setPhase("reveal"), BOOT_MS + 700);
    const t2 = setTimeout(() => setPhase("loading"), BOOT_MS + 1600);
    const t3 = setTimeout(() => setPhase("ready"), TOTAL_MS - 550);
    const t4 = setTimeout(() => setExiting(true), TOTAL_MS - 80);
    const t5 = setTimeout(() => { try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {} }, TOTAL_MS);
    // Glitch on reveal
    const tg1 = setTimeout(() => setGlitch(true), BOOT_MS + 700);
    const tg2 = setTimeout(() => setGlitch(false), BOOT_MS + 820);
    const tg3 = setTimeout(() => setGlitch(true), BOOT_MS + 900);
    const tg4 = setTimeout(() => setGlitch(false), BOOT_MS + 960);
    return () => { [t0,t1,t2,t3,t4,t5,tg1,tg2,tg3,tg4].forEach(clearTimeout); };
  }, [skip]);

  useEffect(() => {
    if (skip || phase !== "loading") return;
    startRef.current = performance.now();
    function tick(now: number) {
      const elapsed = now - startRef.current;
      const FILL_MS = TOTAL_MS - BOOT_MS - 1600 - 550;
      const t = Math.min(elapsed / FILL_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, skip]);

  useEffect(() => {
    if (skip || phase !== "loading") return;
    const interval = setInterval(() => {
      setCharIdx((c) => { if (c >= tagline.length) { clearInterval(interval); return c; } return c + 1; });
    }, 55);
    return () => clearInterval(interval);
  }, [phase, tagline, skip]);

  if (skip) return null;

  const bars = 20;
  const filledBars = Math.floor((progress / 100) * bars);

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loader"
          exit={{ opacity: 0, scale: 1.04, filter: "blur(24px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{ background: "radial-gradient(ellipse at 50% 40%, #0a0200 0%, #030100 60%, #000 100%)" }}
        >
          {/* ── Ambient grain ── */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
          />

          {/* ── HUD top bar ── */}
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-b"
            style={{ borderColor: "rgba(255,102,0,0.1)", background: "rgba(255,102,0,0.03)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-primary/40">CHAMAK OS v2.0</span>
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="flex items-center gap-1.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[9px] font-mono text-primary/50 uppercase tracking-wider">LIVE</span>
              </motion.div>
              <span className="text-[9px] font-mono text-primary/30 uppercase tracking-wider">DXB · UAE</span>
            </div>
          </motion.div>

          {/* ── HUD bottom bar ── */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-3 border-t"
            style={{ borderColor: "rgba(255,102,0,0.1)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-primary/20">SEC — CHAMAK.AE</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-primary/20">PREMIUM STREETWEAR</span>
          </motion.div>

          {/* ── Boot terminal text ── */}
          <AnimatePresence>
            {phase === "boot" && (
              <motion.div
                key="boot-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px]"
              >
                <div className="space-y-1">
                  {BOOT_LINES.map((line, i) => (
                    <BootLine key={i} text={line.text} startDelay={line.delay} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Scanline sweep ── */}
          <AnimatePresence>
            {phase === "scan" && (
              <motion.div
                key="scanline"
                initial={{ top: "-4px" }}
                animate={{ top: "104%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{ height: "3px", background: "linear-gradient(90deg, transparent, rgba(255,102,0,0.9), rgba(255,200,0,0.9), transparent)", filter: "blur(1px)", boxShadow: "0 0 24px rgba(255,102,0,0.8), 0 0 60px rgba(255,102,0,0.3)" }}
              />
            )}
          </AnimatePresence>

          {/* ── Grid overlay ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "scan" ? 0.055 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              backgroundImage: "linear-gradient(rgba(255,102,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.4) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          {/* ── Concentric rings ── */}
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{ width: `${120 + i * 120}px`, height: `${120 + i * 120}px`, border: `1px solid rgba(255,102,0,${0.14 - i * 0.02})` }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: phase !== "boot" && phase !== "scan" ? 1 : 0, rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{
                scale: { duration: 0.9, delay: 0.2 + i * 0.06, ease: [0.22, 1, 0.36, 1] },
                opacity: { duration: 0.4, delay: 0.1 },
                rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" },
              }}
            />
          ))}

          {/* ── Core radial glow ── */}
          <motion.div
            className="absolute pointer-events-none rounded-full"
            style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(255,102,0,0.18) 0%, rgba(255,80,0,0.08) 40%, transparent 65%)" }}
            animate={{ scale: [0.9, 1.1, 0.9], opacity: ["boot","scan"].includes(phase) ? 0 : [0.8, 1, 0.8] }}
            transition={{ scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.6 } }}
          />

          {/* ── Conic sweep ── */}
          <motion.div
            className="absolute w-[600px] h-[600px] pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ background: "conic-gradient(from 0deg, transparent 68%, rgba(255,102,0,0.12) 83%, transparent 100%)", borderRadius: "50%" }}
          />

          {/* ── Logo ── */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.3, opacity: 0, filter: "blur(24px)" }}
            animate={phase !== "boot" && phase !== "scan" ? { scale: 1, opacity: 1, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Burst ring on reveal */}
            <AnimatePresence>
              {phase === "reveal" && (
                <motion.div
                  key="burst"
                  className="absolute inset-0 rounded-full pointer-events-none"
                  initial={{ scale: 0.4, opacity: 1 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ background: "radial-gradient(circle, rgba(255,102,0,0.6) 0%, rgba(255,80,0,0.2) 50%, transparent 70%)" }}
                />
              )}
            </AnimatePresence>

            {/* Logo scanner line (sweeps across logo during reveal) */}
            <AnimatePresence>
              {phase === "reveal" && (
                <motion.div
                  key="logo-scan"
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  initial={{ top: "0%", opacity: 0.9 }}
                  animate={{ top: "100%", opacity: 0 }}
                  transition={{ duration: 0.5, ease: "linear" }}
                  style={{ height: "2px", background: "linear-gradient(90deg, transparent, #ff6600, #ffcc00, #ff6600, transparent)" }}
                />
              )}
            </AnimatePresence>

            <motion.div
              animate={
                glitch ? { x: [0, -4, 6, -2, 0], skewX: [0, -3, 2, 0], filter: ["none", "hue-rotate(90deg)", "hue-rotate(-90deg)", "none"] } :
                phase === "reveal" ? { filter: ["drop-shadow(0 0 0px #ff6600)", "drop-shadow(0 0 80px rgba(255,102,0,1))", "drop-shadow(0 0 32px rgba(255,102,0,0.7))"] } :
                { filter: ["drop-shadow(0 0 20px rgba(255,102,0,0.5))", "drop-shadow(0 0 44px rgba(255,102,0,0.95))", "drop-shadow(0 0 20px rgba(255,102,0,0.5))"] }
              }
              transition={glitch ? { duration: 0.12 } : { duration: phase === "reveal" ? 0.9 : 2.8, repeat: glitch ? 0 : Infinity, ease: "easeInOut" }}
            >
              <img
                src="/chamak-logo-transparent.png"
                alt="Chamak Street"
                className="h-32 w-auto object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
              />
            </motion.div>
          </motion.div>

          {/* ── Tagline typewriter ── */}
          <motion.div
            className="relative z-10 mt-8 h-5 flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "loading" || phase === "ready" ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="h-px w-6 bg-primary/30" />
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/35">
              {tagline.slice(0, charIdx)}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.65, repeat: Infinity }}
              className="w-[1px] h-[11px] bg-primary/60 inline-block"
            />
            <div className="h-px w-6 bg-primary/30" />
          </motion.div>

          {/* ── Segmented progress bar ── */}
          <motion.div
            className="relative z-10 mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: phase === "loading" || phase === "ready" ? 1 : 0, y: phase === "loading" || phase === "ready" ? 0 : 12 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex gap-[3px] mb-2">
              {Array.from({ length: bars }).map((_, i) => (
                <motion.div
                  key={i}
                  className="h-[10px] rounded-sm"
                  style={{ width: "10px" }}
                  animate={{
                    backgroundColor: i < filledBars
                      ? i < filledBars * 0.5 ? "#cc4400" : i < filledBars * 0.85 ? "#ff6600" : "#ffcc00"
                      : "rgba(255,255,255,0.06)",
                    boxShadow: i < filledBars ? `0 0 8px ${i < filledBars * 0.5 ? "#cc4400" : i < filledBars * 0.85 ? "#ff6600" : "#ffcc00"}88` : "none",
                  }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black font-mono text-primary/40">{progress.toString().padStart(3, "0")}%</p>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/15">
                {progress < 100 ? "LOADING COLLECTION" : "COMPLETE"}
              </p>
            </div>
          </motion.div>

          {/* ── "READY" flash ── */}
          <AnimatePresence>
            {phase === "ready" && (
              <motion.div
                key="ready-text"
                initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute z-30 text-center pointer-events-none"
                style={{ bottom: "18%" }}
              >
                <motion.p
                  className="text-[10px] font-black uppercase tracking-[0.65em] text-primary"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.35, repeat: 3 }}
                >
                  ✦ COLLECTION LOADED ✦
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Floating sparks (more, spread wider) ── */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              style={{
                width: 1.5 + (i % 4) * 0.8,
                height: 1.5 + (i % 4) * 0.8,
                borderRadius: "50%",
                background: i % 4 === 0 ? "#ff6600" : i % 4 === 1 ? "#ffcc00" : i % 4 === 2 ? "#ff9933" : "#ff4400",
                boxShadow: `0 0 ${4 + i * 3}px ${i % 2 === 0 ? "#ff6600" : "#ffcc00"}`,
                left: `${5 + i * 6}%`,
                top: `${55 + (i % 5) * 7}%`,
              }}
              initial={{ opacity: 0 }}
              animate={phase !== "boot" && phase !== "scan" ? {
                y: [0, -(100 + i * 18), 0],
                opacity: [0, 0.9, 0],
                x: [0, (i % 2 === 0 ? 16 : -16) + (i % 3) * 4, 0],
              } : {}}
              transition={{ duration: 2.2 + i * 0.25, repeat: Infinity, delay: i * 0.14, ease: "easeOut" }}
            />
          ))}

          {/* ── Corner accent lines ── */}
          {[
            { top: 56, left: 24 },
            { top: 56, right: 24 },
            { bottom: 56, left: 24 },
            { bottom: 56, right: 24 },
          ].map((pos, i) => {
            const rotations = [0, 90, -90, 180];
            return (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{ ...pos, width: 36, height: 36, rotate: rotations[i] }}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: phase !== "boot" && phase !== "scan" ? 0.4 : 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M0 36 L0 0 L36 0" stroke="rgba(255,102,0,0.7)" strokeWidth="1.5" fill="none" />
                  <circle cx="0" cy="0" r="2.5" fill="rgba(255,102,0,0.5)" />
                </svg>
              </motion.div>
            );
          })}

          {/* ── Cross-hair center target ── */}
          <motion.div
            className="absolute inset-0 pointer-events-none flex items-center justify-center z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase !== "boot" && phase !== "scan" ? 0.04 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative w-[400px] h-[400px]">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-primary" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-primary rounded-full" />
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
