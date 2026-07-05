import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const SESSION_KEY = "chamak_loaded";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function LoadingScreen() {
  const [skip] = useState(() => {
    try { return !!sessionStorage.getItem(SESSION_KEY); } catch { return false; }
  });
  const [exiting, setExiting] = useState(skip);

  useEffect(() => {
    if (skip) return;
    const t1 = setTimeout(() => setExiting(true), 2600);
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [skip]);

  if (skip) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="loader"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
          style={{ background: "#000" }}
        >
          {/* Soft ambient glow */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              width: 700,
              height: 700,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,102,0,0.09) 0%, transparent 65%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
            animate={{ scale: [0.9, 1.06, 0.9], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Big logo */}
          <motion.img
            src="/chamak-logo-transparent.png"
            alt="Chamak Street"
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative z-10 w-auto object-contain"
            style={{ height: "clamp(72px, 18vw, 160px)" }}
            onError={e => { (e.target as HTMLImageElement).src = "/chamak-logo.png"; }}
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            className="relative z-10 mt-5 text-[10px] font-black uppercase tracking-[0.55em]"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Premium Streetwear · Dubai
          </motion.p>

          {/* Thin loading bar */}
          <motion.div
            className="absolute bottom-0 left-0 h-[2px] rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "linear-gradient(to right, #cc4400, #ff6600, #ffcc00)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
