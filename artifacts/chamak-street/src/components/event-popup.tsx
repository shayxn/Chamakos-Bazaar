import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";
import { useActiveEvents } from "./event-banner";

const POPUP_KEY = "chamak_event_popup_seen";

export function EventPopup() {
  const events = useActiveEvents();
  const [visible, setVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<typeof events[0] | null>(null);

  useEffect(() => {
    const popupEvents = events.filter((e) => e.popupEnabled);
    if (!popupEvents.length) return;
    const top = popupEvents[0];
    const seenKey = `${POPUP_KEY}_${top.id}`;
    const seen = sessionStorage.getItem(seenKey);
    if (seen) return;
    sessionStorage.setItem(seenKey, "1");
    const t = setTimeout(() => {
      setCurrentEvent(top);
      setVisible(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [events]);

  if (!currentEvent) return null;

  const color = currentEvent.bannerColor || "#ff6600";
  const textColor = currentEvent.textColor || "#ffffff";

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setVisible(false)}
            className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            className="fixed z-[9991] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            style={{ border: `1px solid ${color}40` }}
          >
            {currentEvent.popupImageUrl && (
              <div className="relative h-40 overflow-hidden">
                <img src={currentEvent.popupImageUrl} alt={currentEvent.name}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${color}dd)` }} />
              </div>
            )}

            <div className="bg-card p-6">
              {currentEvent.logoUrl ? (
                <img src={currentEvent.logoUrl} alt={currentEvent.name} className="h-8 mb-4 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: color }}>
                  <Zap className="h-5 w-5" style={{ color: textColor }} />
                </div>
              )}

              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">{currentEvent.name}</h3>

              {currentEvent.popupText && (
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{currentEvent.popupText}</p>
              )}

              {currentEvent.discountPercent && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 font-black text-sm"
                  style={{ backgroundColor: `${color}18`, color }}>
                  <Zap className="h-3.5 w-3.5" />
                  {currentEvent.discountPercent}% OFF everything!
                </div>
              )}

              <div className="flex gap-2 mt-2">
                {currentEvent.ctaText && currentEvent.ctaUrl && (
                  <a href={currentEvent.ctaUrl} onClick={() => setVisible(false)}
                    className="flex-1 py-3 text-center font-black uppercase tracking-widest text-sm rounded-sm transition-opacity hover:opacity-90"
                    style={{ backgroundColor: color, color: textColor }}>
                    {currentEvent.ctaText}
                  </a>
                )}
                <button onClick={() => setVisible(false)}
                  className="px-4 py-3 border border-border font-bold text-sm rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                  Close
                </button>
              </div>
            </div>

            <button onClick={() => setVisible(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
