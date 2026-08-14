import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";

const STORAGE_KEY = "firstpick_welcome_v1";

export function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        t = setTimeout(() => setShow(true), 2200);
      }
    } catch {}
    return () => { if (t !== undefined) clearTimeout(t); };
  }, []);

  const close = () => {
    setShow(false);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="notification-bar"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-24 sm:bottom-6 left-1/2 z-[200]"
          style={{
            transform: "translateX(-50%)",
            width: "min(460px, calc(100vw - 32px))",
          }}
        >
          <div
            style={{
              background: "rgba(10,10,10,0.88)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "18px",
              boxShadow:
                "0 4px 40px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,102,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
              padding: "14px 16px 14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(255,102,0,0.25), rgba(255,200,0,0.12))",
                border: "1px solid rgba(255,102,0,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles style={{ width: 16, height: 16, color: "#ff8833" }} />
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#fff",
                margin: 0,
                letterSpacing: "0.01em",
                lineHeight: 1.3,
              }}>
                Welcome to FirstPick
              </p>
              <p style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.42)",
                margin: 0,
                marginTop: 2,
                letterSpacing: "0.01em",
              }}>
                Free shipping across UAE · Authentic products only
              </p>
            </div>

            {/* CTA */}
            <Link href="/shop" onClick={close}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #ff6600, #ff9900)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(255,102,0,0.3)",
                }}
              >
                Shop
                <ArrowRight style={{ width: 12, height: 12 }} />
              </motion.button>
            </Link>

            {/* Close */}
            <button
              onClick={close}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                flexShrink: 0,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
