import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "@/lib/motion-noop";
import { ChevronUp } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="back-to-top"
          className="fixed bottom-24 right-6 z-40"
          initial={{ opacity: 0, y: 20, scale: 0.65 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.65 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          {/* Orbit conic ring */}
          <motion.div
            className="absolute pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            style={{
              inset: -3,
              borderRadius: "9999px",
              background: "conic-gradient(from 0deg, transparent 0%, rgba(255,102,0,0.85) 22%, rgba(255,210,60,0.55) 44%, transparent 60%)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), black 100%)",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), black 100%)",
            }}
          />
          {/* Glow bloom */}
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0.5 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "radial-gradient(circle, rgba(255,102,0,0.28) 0%, transparent 70%)",
              filter: "blur(8px)",
              margin: -6,
            }}
          />
          <motion.button
            onClick={scrollToTop}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            whileHover={{ scale: 1.14, y: -3 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="relative w-10 h-10 rounded-full glass-liquid flex items-center justify-center text-white hover:text-primary transition-colors duration-200"
            aria-label="Back to top"
            style={{ boxShadow: "0 4px 28px rgba(255,102,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.14)" }}
          >
            <motion.div
              animate={{ y: hovered ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <ChevronUp className="h-5 w-5" />
            </motion.div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
