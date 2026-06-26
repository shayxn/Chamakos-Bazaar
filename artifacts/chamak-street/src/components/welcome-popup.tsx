import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "chamak_welcome_v2";

export function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const t = setTimeout(() => setShow(true), 1400);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const close = () => {
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md"
            onClick={close}
          />
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.86, y: 48 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-5 pointer-events-none"
          >
            <div
              className="relative pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(160deg, #0d0d0d 0%, #080808 100%)",
                border: "1px solid rgba(255,102,0,0.3)",
                boxShadow: "0 0 60px rgba(255,102,0,0.18), 0 30px 60px rgba(0,0,0,0.7)",
              }}
            >
              {/* Glowing top line */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, #ff6600 50%, transparent 100%)" }}
              />
              {/* Ambient glow */}
              <div
                className="absolute inset-x-0 top-0 h-32 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,102,0,0.12), transparent)" }}
              />

              {/* Close */}
              <button
                onClick={close}
                className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative px-7 py-9 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,102,0,0.2), rgba(255,204,0,0.1))",
                    border: "1px solid rgba(255,102,0,0.35)",
                  }}
                >
                  <Sparkles className="h-6 w-6" style={{ color: "#ff6600" }} />
                </motion.div>

                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4"
                  style={{
                    background: "rgba(255,102,0,0.12)",
                    color: "#ff9944",
                    border: "1px solid rgba(255,102,0,0.25)",
                  }}
                >
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Dubai's Premium Streetwear
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-2xl font-black uppercase tracking-tight text-white mb-1"
                >
                  Welcome to
                </motion.h2>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-black uppercase tracking-tight mb-5"
                  style={{
                    background: "linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Chamak Street
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="text-white/45 text-sm leading-relaxed mb-6"
                >
                  Premium streetwear from the heart of Dubai. Bold designs,
                  unmatched quality — where the streets meet luxury.
                </motion.p>

                {/* Promo card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl p-4 mb-6 text-left"
                  style={{
                    background: "rgba(255,204,0,0.07)",
                    border: "1px solid rgba(255,204,0,0.18)",
                  }}
                >
                  <p className="font-black uppercase tracking-widest text-sm" style={{ color: "#ffcc00" }}>
                    🚚 Free Shipping Across UAE
                  </p>
                  <p className="text-white/35 text-xs mt-1">Cash on delivery · Fast dispatch · Premium packaging</p>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <Link href="/shop" onClick={close}>
                    <motion.button
                      whileHover={{ scale: 1.04, boxShadow: "0 8px 32px rgba(255,102,0,0.45)" }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-white text-sm flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)" }}
                    >
                      Shop the Collection <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                  <button
                    onClick={close}
                    className="mt-3 text-white/25 text-xs hover:text-white/45 transition-colors font-medium"
                  >
                    Just browsing for now
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
