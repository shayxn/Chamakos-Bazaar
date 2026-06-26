import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gtaCard from "@assets/IMG_0054_1782472985504.jpeg";
import gtaPoster from "@assets/IMG_0055_1782472977785.jpeg";
import { X } from "lucide-react";

export function SiteSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("chamak_splash_seen");
    if (seen) return;
    sessionStorage.setItem("chamak_splash_seen", "1");
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={() => setVisible(false)}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-lg rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/10"
          >
            {/* GTA VI box art image */}
            <div className="relative">
              <img
                src={gtaPoster}
                alt="GTA VI Pre-Order"
                className="w-full object-cover"
                style={{ maxHeight: "60vh" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setVisible(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Now Available at Chamak Street</p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div style={{
                      fontFamily: "Impact, Arial Black, sans-serif",
                      fontSize: "3rem",
                      fontWeight: 900,
                      lineHeight: 1,
                      background: "linear-gradient(135deg,#ff3ca0 0%,#bf00ff 40%,#00e5ff 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 12px rgba(255,60,160,0.6))",
                    }}>VI</div>
                    <p className="text-white font-black uppercase tracking-widest text-sm mt-0.5">November 19, 2026</p>
                  </div>
                  <a
                    href="/games/1"
                    onClick={() => setVisible(false)}
                    className="shrink-0 px-5 py-2.5 font-black uppercase tracking-widest text-xs text-white rounded-sm"
                    style={{ background: "linear-gradient(135deg,#ff3ca0,#bf00ff,#00e5ff)" }}
                  >
                    Pre-Order Now →
                  </a>
                </div>
              </div>
            </div>

            {/* Box art strip */}
            <div className="bg-[#141426] px-4 py-3 flex items-center gap-3">
              <img src={gtaCard} alt="GTA VI PS5 & Xbox" className="h-14 object-contain" />
              <div>
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Available on</p>
                <p className="text-white font-black uppercase tracking-wider text-xs">PS5 · Xbox Series X|S</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Price</p>
                <p className="text-white font-black font-mono text-base">AED 299</p>
              </div>
            </div>

            {/* Auto-dismiss bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6, ease: "linear" }}
              style={{ originX: 0 }}
              className="h-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
