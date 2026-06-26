import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gtaPoster from "@assets/IMG_0054_1782479264132.jpeg";
import { X } from "lucide-react";

export function SiteSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("chamak_splash_v2");
    if (seen) return;
    sessionStorage.setItem("chamak_splash_v2", "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 7000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setVisible(false)}
            className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 36 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[88vw] max-w-sm rounded-2xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.85)]"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Poster */}
            <div className="relative">
              <img
                src={gtaPoster}
                alt="GTA VI Pre-Order"
                className="w-full object-cover block"
                style={{ height: "52vw", maxHeight: "340px", objectPosition: "center top" }}
              />

              {/* Top fade */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent" />

              {/* Bottom fade */}
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

              {/* Close */}
              <button
                onClick={() => setVisible(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 border border-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Content pinned to bottom of image */}
              <div className="absolute bottom-0 inset-x-0 px-5 pb-5">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] mb-2">
                  Now at Chamak Street
                </p>

                <div
                  style={{
                    fontFamily: "Impact, Arial Black, sans-serif",
                    fontSize: "3.5rem",
                    fontWeight: 900,
                    lineHeight: 1,
                    background: "linear-gradient(135deg, #ff3ca0 0%, #bf00ff 45%, #00e5ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    filter: "drop-shadow(0 0 16px rgba(191,0,255,0.5))",
                    marginBottom: "6px",
                  }}
                >
                  VI
                </div>

                <div className="flex items-end justify-between gap-3">
                  <p className="text-white/70 font-black uppercase tracking-widest text-xs">
                    November 19, 2026
                  </p>
                  <motion.a
                    href="/games/1"
                    onClick={() => setVisible(false)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="shrink-0 px-5 py-2.5 font-black uppercase tracking-widest text-[11px] text-white rounded-lg"
                    style={{ background: "linear-gradient(135deg, #ff3ca0, #bf00ff, #00e5ff)" }}
                  >
                    Pre-Order →
                  </motion.a>
                </div>
              </div>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 7, ease: "linear" }}
              style={{ originX: 0 }}
              className="h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
